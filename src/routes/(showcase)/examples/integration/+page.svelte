<script lang="ts">
	// Suite integration — svelte-treeview next to a real <web-multiselect>, each section
	// flipping ONE page-wide switch of @keenmate/web-components-core. The tree carries a
	// vendored copy of core (src/lib/vendor/core), the multiselect bundles its own; both keep
	// the state on globalThis[Symbol.for('@keenmate/web-components-core:…')], so one call
	// reaches both. Every switch is put back on leaving the page.
	import { onMount, tick } from 'svelte';
	import Tree from '$lib/components/Tree.svelte';
	import type { LTreeNode } from '$lib/ltree/types.js';
	import {
		setThemeMode,
		getThemeMode,
		configureBreakpoints,
		observeEnvironment,
		MOTION_VALUES,
		type Motion,
		type EnvironmentSnapshot
	} from '$lib/index.js';
	import LogPanel, { logLine, type LogEntry } from '../../LogPanel.svelte';

	type Item = { id: string; path: string; name: string; icon: string };
	const data: Item[] = [
		{ id: 'fruits', path: '1', name: 'Fruits', icon: '🍎' },
		{ id: 'apple', path: '1.1', name: 'Apple', icon: '🍏' },
		{ id: 'banana', path: '1.2', name: 'Banana', icon: '🍌' },
		{ id: 'citrus', path: '1.3', name: 'Citrus', icon: '🍊' },
		{ id: 'orange', path: '1.3.1', name: 'Orange', icon: '🍊' },
		{ id: 'lemon', path: '1.3.2', name: 'Lemon', icon: '🍋' },
		{ id: 'veg', path: '2', name: 'Vegetables', icon: '🥦' },
		{ id: 'carrot', path: '2.1', name: 'Carrot', icon: '🥕' },
		{ id: 'potato', path: '2.2', name: 'Potato', icon: '🥔' }
	];
	const sortByPath = ({ nodes }: { nodes: LTreeNode<Item>[] }) =>
		[...nodes].sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));

	type Components = Record<string, unknown> & {
		motion?: Motion;
		renderLoadingCallback?: unknown;
		logging?: { enableLogging(level?: string): void; disableLogging(): void; resetLogging(): void; getCategories(): string[] };
	};
	const components = () => ((window as unknown as { components?: Components }).components ??= {});

	// ── <web-multiselect>: a vendored self-contained bundle (static/vendor/web-multiselect) ──
	let isMsReady = $state(false);
	const msEls: Record<string, HTMLElement | null> = $state({ theme: null, motion: null, loader: null, logging: null });

	async function loadMultiselect() {
		if (!customElements.get('web-multiselect')) {
			await new Promise<void>((resolve, reject) => {
				const s = document.createElement('script');
				s.type = 'module';
				s.src = '/vendor/web-multiselect/multiselect.js';
				s.onload = () => resolve();
				s.onerror = () => reject(new Error('Failed to load web-multiselect bundle'));
				document.head.appendChild(s);
			});
		}
		await customElements.whenDefined('web-multiselect');
	}

	function configureMultiselect(el: HTMLElement | null, extra: Record<string, unknown> = {}) {
		if (!el) return;
		Object.assign(el, {
			options: data,
			valueMember: 'id',
			displayValueMember: 'name',
			pathMember: 'path',
			iconMember: 'icon',
			isTreeEnabled: true,
			isMultipleEnabled: true,
			isCheckboxesShown: true,
			isSearchEnabled: true,
			...extra
		});
	}

	// ── IG01 · theme mode ───────────────────────────────────────────────────
	type ThemeMode = 'auto' | 'light' | 'dark';
	let themeMode = $state<ThemeMode>('auto');
	let themeTreeEl = $state<HTMLElement | null>(null);
	let themeReadout = $state({ tree: '—', multiselect: '—' });

	async function applyThemeMode(mode: ThemeMode) {
		setThemeMode(mode);
		themeMode = getThemeMode() as ThemeMode;
		await tick();
		requestAnimationFrame(readTheme);
	}
	function readTheme() {
		const tree = themeTreeEl?.querySelector('.stv__container')?.getAttribute('data-context-theme');
		const ms = msEls.theme?.getAttribute('data-context-theme');
		themeReadout = { tree: tree ?? '(none — inherits)', multiselect: ms ?? '(none — inherits)' };
	}

	// ── IG02 · motion ───────────────────────────────────────────────────────
	let pageMotion = $state<Motion>('auto');
	let sectionMotion = $state<Motion>('auto');
	let treeMotion = $state<Motion>('auto');
	let motionTreeEl = $state<HTMLElement | null>(null);
	let motionReadout = $state({ tree: '—', multiselect: '—' });

	function applyPageMotion(level: Motion) {
		components().motion = level;
		pageMotion = level;
		void readMotionSoon();
	}
	async function readMotionSoon() {
		await tick();
		requestAnimationFrame(() => {
			const container = motionTreeEl?.querySelector('.stv__container');
			const tree = container ? getComputedStyle(container).getPropertyValue('--stv-transition-normal').trim() : '';
			const ms = msEls.motion ? getComputedStyle(msEls.motion).getPropertyValue('--ms-transition-normal').trim() : '';
			motionReadout = { tree: tree || '—', multiselect: ms || '—' };
		});
	}
	$effect(() => {
		void sectionMotion;
		void treeMotion;
		void readMotionSoon();
	});

	// ── IG03 · breakpoints ──────────────────────────────────────────────────
	const BREAKPOINT_PRESETS = {
		defaults: { mobile: 768, tablet: 1024, desktop: Infinity },
		wide: { mobile: 1280, tablet: 1600, desktop: Infinity },
		narrow: { mobile: 480, tablet: 640, desktop: Infinity }
	} as const;
	type BreakpointPreset = keyof typeof BREAKPOINT_PRESETS;
	let breakpointPreset = $state<BreakpointPreset>('defaults');
	let environment = $state.raw<EnvironmentSnapshot | null>(null);
	let breakpointLog = $state<LogEntry[]>([]);

	function applyBreakpoints(preset: BreakpointPreset) {
		breakpointPreset = preset;
		configureBreakpoints({ ...BREAKPOINT_PRESETS[preset] });
	}

	// ── IG04 · loader hook ──────────────────────────────────────────────────
	let isPageLoaderOn = $state(false);
	let isTreeLoading = $state(false);

	// Inline styles: the hook also fills the multiselect's dropdown, inside its shadow
	// root, where this page's CSS doesn't reach.
	function pageLoadingHook({ containerElement, component, context, label }: {
		containerElement: HTMLElement;
		component: string;
		context: string;
		label: string;
	}) {
		const badge = document.createElement('span');
		badge.style.cssText =
			'display:inline-flex;align-items:center;gap:.4em;padding:.2em .6em;border-radius:999px;' +
			'background:#667eea;color:#fff;font:600 .8rem/1.4 system-ui,sans-serif;';
		badge.textContent = `⏳ page hook · ${component} · ${context} · ${label}`;
		containerElement.appendChild(badge);
	}

	function togglePageLoader(isOn: boolean) {
		isPageLoaderOn = isOn;
		components().renderLoadingCallback = isOn ? pageLoadingHook : undefined;
		// The tree reads the hook when its overlay renders — re-render a showing overlay.
		if (isTreeLoading) {
			isTreeLoading = false;
			void tick().then(() => (isTreeLoading = true));
		}
	}

	// Slow search for the multiselect: its dropdown draws a loader while this runs.
	const slowSearch = async ({ term }: { term: string }) => {
		await new Promise((resolve) => setTimeout(resolve, 1500));
		const t = String(term).toLowerCase();
		return data.filter((d) => d.name.toLowerCase().includes(t));
	};

	// ── IG05 · logging ──────────────────────────────────────────────────────
	let registryKeys = $state<string[]>([]);
	let pageCategories = $state<string[]>([]);
	let pageLevel = $state('(unset — warn)');

	function refreshLogging() {
		const c = components();
		registryKeys = Object.keys(c); // enumerable = component entries only (page settings are hidden accessors)
		pageCategories = c.logging?.getCategories() ?? [];
	}
	function pageLogging(action: 'enable' | 'disable' | 'reset') {
		const logging = components().logging;
		if (!logging) return;
		if (action === 'enable') logging.enableLogging('debug');
		else if (action === 'disable') logging.disableLogging();
		else logging.resetLogging();
		pageLevel = action === 'enable' ? 'debug' : action === 'disable' ? 'silent' : '(unset — warn)';
		console.log(`%cwindow.components.logging → ${pageLevel}`, 'color:#667eea;font-weight:bold;');
		refreshLogging();
	}

	onMount(() => {
		const stopEnvironment = observeEnvironment((snapshot) => (environment = snapshot));
		const onBreakpointsChange = (event: Event) => {
			const detail = (event as CustomEvent<{ source?: string }>).detail;
			breakpointLog = [
				...breakpointLog,
				logLine('km-breakpoints-change', `source copy: ${detail?.source ?? '?'} → every core copy recomputes`)
			];
		};
		document.addEventListener('km-breakpoints-change', onBreakpointsChange);

		void loadMultiselect().then(async () => {
			await tick();
			configureMultiselect(msEls.theme);
			configureMultiselect(msEls.motion);
			configureMultiselect(msEls.loader, { searchCallback: slowSearch, searchPlaceholder: 'Type to search (1.5 s)…' });
			configureMultiselect(msEls.logging);
			isMsReady = true;
			requestAnimationFrame(readTheme);
			void readMotionSoon();
			refreshLogging();
		});

		return () => {
			// Put every page-wide switch back — they outlive this page otherwise.
			stopEnvironment();
			document.removeEventListener('km-breakpoints-change', onBreakpointsChange);
			setThemeMode('auto');
			components().motion = 'auto';
			components().renderLoadingCallback = undefined;
			configureBreakpoints({ ...BREAKPOINT_PRESETS.defaults });
			components().logging?.resetLogging();
		};
	});
</script>

<svelte:head>
	<title>Suite Integration - Svelte Treeview</title>
</svelte:head>

<header>
	<a href="/" class="back-link">&larr; Back to Examples</a>
	<h1>Suite Integration</h1>
	<p class="subtitle">
		svelte-treeview carries a vendored copy of <code>@keenmate/web-components-core</code>; every
		web component bundles its own. The copies keep their page-wide state on
		<code>globalThis</code>, so one switch drives every KeenMate component on the page — shown here
		with a <code>&lt;web-multiselect&gt;</code> next to the tree.
	</p>
</header>

{#if !isMsReady}
	<div class="note info">Loading <code>&lt;web-multiselect&gt;</code>…</div>
{/if}

<!-- IG01 · Theme mode -->
<div class="card">
	<h2>IG01 · Theme mode — <code>setThemeMode()</code></h2>
	<p class="description">
		Each component detects the page's dark / light signal (here the kit's
		<code>&lt;html data-theme&gt;</code> — flip it with the header switch). <code>setThemeMode()</code>
		forces every component at once, over whatever the page says; <code>'auto'</code> goes back to
		detection. Call it from either library — it's the same state.
	</p>
	<div class="controls">
		{#each ['auto', 'light', 'dark'] as const as mode (mode)}
			<button class:secondary={themeMode !== mode} onclick={() => applyThemeMode(mode)}>{mode}</button>
		{/each}
	</div>
	<div class="grid grid-2">
		<div>
			<span class="demo-label">svelte-treeview — <code>data-context-theme: {themeReadout.tree}</code></span>
			<div class="tree-container" bind:this={themeTreeEl}>
				<Tree nodes={data} idMember="id" pathMember="path" displayValueMember="name" sortCallback={sortByPath} expandLevel={2} />
			</div>
		</div>
		<div>
			<span class="demo-label">&lt;web-multiselect&gt; — <code>data-context-theme: {themeReadout.multiselect}</code></span>
			<web-multiselect bind:this={msEls.theme}></web-multiselect>
		</div>
	</div>
	<div class="code-block" data-language="ts">
		<pre>{`import { setThemeMode } from '@keenmate/svelte-treeview';   // or from web-components-core
setThemeMode('dark');   // every KeenMate component on the page
setThemeMode('auto');   // back to detection (page / themeSource signal)`}</pre>
	</div>
</div>

<!-- IG02 · Motion -->
<div class="card">
	<h2>IG02 · Motion level — <code>window.components.motion</code></h2>
	<p class="description">
		<code>auto | none | snappy | smooth</code>, closest wins: the component's own
		<code>motion</code> → the nearest <code>data-motion</code> section → the page's
		<code>window.components.motion</code> (core writes it on <code>&lt;html data-motion&gt;</code>) →
		the component's own speeds. The OS reduced-motion setting always wins. Expand a node / open the
		dropdown to feel it; the readout shows each one's resolved <code>transition-normal</code>.
	</p>
	<p class="description">
		On the tree, <code>motion</code> times the rows an expand reveals (they fade in and slide down —
		instant at <code>none</code>, quicker at <code>snappy</code>, slower at <code>smooth</code>), the
		chevron turn, checkboxes, tooltips and the drag visuals. It is the only switch: there is no
		"animate rows" prop — <code>--stv-row-animation-duration: 0s</code> turns off just the rows.
	</p>
	<div class="controls">
		<label>Page (<code>window.components.motion</code>)
			<select value={pageMotion} onchange={(e) => applyPageMotion(e.currentTarget.value as Motion)}>
				{#each MOTION_VALUES as level (level)}<option value={level}>{level}</option>{/each}
			</select>
		</label>
		<label>Section (<code>data-motion</code>)
			<select bind:value={sectionMotion}>
				{#each MOTION_VALUES as level (level)}<option value={level}>{level}</option>{/each}
			</select>
		</label>
		<label>Tree only (<code>motion</code> prop)
			<select bind:value={treeMotion}>
				{#each MOTION_VALUES as level (level)}<option value={level}>{level}</option>{/each}
			</select>
		</label>
	</div>
	<div class="grid grid-2" data-motion={sectionMotion === 'auto' ? undefined : sectionMotion}>
		<div>
			<span class="demo-label">svelte-treeview — <code>--stv-transition-normal: {motionReadout.tree}</code></span>
			<div class="tree-container" bind:this={motionTreeEl}>
				<Tree nodes={data} idMember="id" pathMember="path" displayValueMember="name" sortCallback={sortByPath} expandLevel={1} motion={treeMotion} />
			</div>
		</div>
		<div>
			<span class="demo-label">&lt;web-multiselect&gt; — <code>--ms-transition-normal: {motionReadout.multiselect}</code></span>
			<web-multiselect bind:this={msEls.motion}></web-multiselect>
		</div>
	</div>
</div>

<!-- IG03 · Breakpoints -->
<div class="card">
	<h2>IG03 · Breakpoints — <code>configureBreakpoints()</code></h2>
	<p class="description">
		The breakpoint table is page-wide too: <code>configureBreakpoints()</code> through any copy of
		core moves every component's buckets, and fires <code>km-breakpoints-change</code> so the other
		copies (the multiselect's bundled one included) recompute. Without a call, the lines come from
		<code>--base-breakpoint-mobile</code> / <code>-tablet</code>, else 768 / 1024.
	</p>
	<div class="controls">
		{#each Object.keys(BREAKPOINT_PRESETS) as preset (preset)}
			{@const p = BREAKPOINT_PRESETS[preset as BreakpointPreset]}
			<button class:secondary={breakpointPreset !== preset} onclick={() => applyBreakpoints(preset as BreakpointPreset)}>
				{preset} ({p.mobile} / {p.tablet})
			</button>
		{/each}
	</div>
	<div class="output">
		<div class="output-label">observeEnvironment() — the same snapshot every component reads</div>
		<pre>{environment
				? `viewport ${environment.viewportWidth} px → breakpoint "${environment.breakpoint}"   (pointer ${environment.pointer}, ${environment.orientation})`
				: '…'}</pre>
	</div>
	<LogPanel entries={breakpointLog} empty="Pick a preset — the broadcast shows up here." />
</div>

<!-- IG04 · Loader hook -->
<div class="card">
	<h2>IG04 · Loader — <code>window.components.renderLoadingCallback</code></h2>
	<p class="description">
		One function draws every component's loading state: the tree's <code>isLoading</code> overlay
		and the multiselect's async-search row alike. It's optional — the tree's own
		<code>loadingPlaceholder</code> snippet always wins (right tree), and with neither you get the
		default loader. Turn the hook on, then show the trees' loaders and type into the multiselect
		(its search takes 1.5 s).
	</p>
	<div class="controls">
		<label><input type="checkbox" checked={isPageLoaderOn} onchange={(e) => togglePageLoader(e.currentTarget.checked)} /> page-wide hook</label>
		<label><input type="checkbox" bind:checked={isTreeLoading} /> trees <code>isLoading</code></label>
	</div>
	<div class="grid grid-2">
		<div>
			<span class="demo-label">svelte-treeview — default → page hook</span>
			<div class="tree-container">
				<Tree nodes={data} idMember="id" pathMember="path" displayValueMember="name" sortCallback={sortByPath} expandLevel={1} isLoading={isTreeLoading} />
			</div>
			<span class="demo-label mt-1">svelte-treeview — <code>loadingPlaceholder</code> snippet (wins)</span>
			<div class="tree-container">
				<Tree nodes={data} idMember="id" pathMember="path" displayValueMember="name" sortCallback={sortByPath} expandLevel={1} isLoading={isTreeLoading}>
					{#snippet loadingPlaceholder()}<em>snippet: loading your fruit…</em>{/snippet}
				</Tree>
			</div>
		</div>
		<div>
			<span class="demo-label">&lt;web-multiselect&gt; — async search (default → page hook)</span>
			<web-multiselect bind:this={msEls.loader}></web-multiselect>
		</div>
	</div>
	<div class="code-block" data-language="ts">
		<pre>{`window.components.renderLoadingCallback = ({ containerElement, component, context, label }) => {
  containerElement.append(myLoader(label));   // container already has role="status" + aria-label
  return () => {/* optional cleanup */};
};`}</pre>
	</div>
</div>

<!-- IG05 · Logging -->
<div class="card">
	<h2>IG05 · Logging — <code>window.components.logging</code></h2>
	<p class="description">
		Every component registers on <code>window.components</code> (enumerable keys = components) and
		joins one page-wide logging switch; each also keeps its own bundle
		(<code>window.components['svelte-treeview'].logging</code> — see
		<a href="/examples/logging">Logging &amp; Debugging</a>). Open the console, enable, then click /
		expand the tree and open the multiselect.
	</p>
	<div class="controls">
		<button onclick={() => pageLogging('enable')}>Enable all (debug)</button>
		<button class="secondary" onclick={() => pageLogging('disable')}>Disable all</button>
		<button class="btn-outline" onclick={() => pageLogging('reset')}>Reset (warn)</button>
	</div>
	<div class="output">
		<div class="output-label">page level: {pageLevel}</div>
		<dl class="facts">
			<dt>Object.keys(window.components)</dt>
			<dd>{#each registryKeys as key (key)}<span class="pill">{key}</span>{/each}</dd>
			<dt>logging.getCategories()</dt>
			<dd>{#each pageCategories as category (category)}<span class="pill">{category}</span>{/each}</dd>
		</dl>
	</div>
	<div class="grid grid-2">
		<div class="tree-container">
			<Tree nodes={data} idMember="id" pathMember="path" displayValueMember="name" sortCallback={sortByPath} expandLevel={1} />
		</div>
		<web-multiselect bind:this={msEls.logging}></web-multiselect>
	</div>
</div>

<style>
	.facts {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: 0.4rem 1rem;
		margin: 0;
		font-family: var(--kmwc-mono-font-family);
		font-size: 0.85rem;
	}
	.facts dt {
		color: var(--kmwc-info-color);
		white-space: nowrap;
	}
	.facts dd {
		display: flex;
		flex-wrap: wrap;
		min-width: 0;
		margin: 0;
	}
	/* A phone: the label above its values — a max-content label column pushes the pills off-screen. */
	@media (max-width: 600px) {
		.facts {
			grid-template-columns: minmax(0, 1fr);
		}
		.facts dd {
			margin-bottom: 0.5rem;
		}
	}
	.facts .pill {
		margin: 0 0.2rem 0.2rem 0;
	}
	web-multiselect {
		display: block;
	}
</style>
