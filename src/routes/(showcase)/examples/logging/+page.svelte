<script lang="ts">
	// Logging & debugging — section for section the same page as web-treeview's
	// examples-logging.html: the window.components registry entry, its .logging bundle,
	// live instances, perf logging. Everything below goes through the global, like a
	// consumer would from the DevTools console.
	import { onMount } from 'svelte';
	import Tree from '$lib/components/Tree.svelte';
	import type { LTreeNode } from '$lib/ltree/types.js';
	import { enablePerfLogging, disablePerfLogging, setPerfThreshold } from '$lib/perf-logger.js';
	import type { GlobalTreeviewAPI } from '$lib/global-api.js';
	import type { TreeController } from '$lib/core/TreeEngine.svelte.js';

	type Item = { id: number; path: string; name: string };

	const sampleData: Item[] = [
		{ id: 1, path: '1', name: 'Project' },
		{ id: 2, path: '1.1', name: 'Source Code' },
		{ id: 3, path: '1.1.1', name: 'Components' },
		{ id: 4, path: '1.1.1.1', name: 'Button.tsx' },
		{ id: 5, path: '1.1.1.2', name: 'Input.tsx' },
		{ id: 6, path: '1.1.2', name: 'Pages' },
		{ id: 7, path: '1.1.2.1', name: 'Home.tsx' },
		{ id: 8, path: '1.1.2.2', name: 'Settings.tsx' },
		{ id: 9, path: '1.2', name: 'Configuration' },
		{ id: 10, path: '1.2.1', name: 'webpack.config.js' },
		{ id: 11, path: '1.2.2', name: 'tsconfig.json' },
		{ id: 12, path: '1.3', name: 'Documentation' },
		{ id: 13, path: '1.3.1', name: 'API.md' },
		{ id: 14, path: '1.3.2', name: 'Guide.md' },
		{ id: 15, path: '2', name: 'Dependencies' },
		{ id: 16, path: '2.1', name: 'Runtime' },
		{ id: 17, path: '2.2', name: 'Development' }
	];

	function generateTree(count: number): Item[] {
		const data: Item[] = [];
		let id = 1;
		const branches = Math.min(count, 20);
		for (let i = 1; i <= branches; i++) {
			data.push({ id: id++, path: `${i}`, name: `Branch ${i}` });
			const perBranch = Math.floor(count / branches);
			for (let j = 1; j <= perBranch && id <= count; j++) {
				data.push({ id: id++, path: `${i}.${j}`, name: `Item ${i}.${j}` });
			}
		}
		return data;
	}

	const sortByPath = ({ nodes }: { nodes: LTreeNode<Item>[] }) =>
		[...nodes].sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));

	const ENTRY = 'svelte-treeview';
	const reg = (): GlobalTreeviewAPI | undefined => window.components?.[ENTRY];

	// ── LG01 · registry view ─────────────────────────────────────────────
	type RegistryView = {
		version: string;
		config: GlobalTreeviewAPI['config'];
		categories: string[];
		instances: string[];
	} | null;
	let registry = $state<RegistryView>(null);
	// The bundle has no getter for a category's effective level — mirror what we set.
	let categoryLevels = $state<Record<string, string>>({});

	function refreshRegistry() {
		const r = reg();
		if (!r) {
			registry = null;
			return;
		}
		registry = {
			version: r.version(),
			config: r.config,
			categories: r.logging.getCategories(),
			instances: (r.getInstances() as TreeController<Item>[]).map((c) => c.treeId)
		};
	}

	function dumpToConsole() {
		const r = reg();
		console.log(`%cwindow.components['${ENTRY}']`, 'color:#667eea;font-weight:bold;font-size:1.1rem;', r);
		console.log('config:', r?.config);
		console.log('getInstances():', r?.getInstances());
	}

	// ── LG02 · logging through .logging ──────────────────────────────────
	function setAll(level: string) {
		for (const c of reg()?.logging.getCategories() ?? []) categoryLevels[c] = level;
		refreshRegistry();
	}
	function enableAll() {
		reg()?.logging.enableLogging();
		setAll('debug');
	}
	function disableAll() {
		reg()?.logging.disableLogging();
		setAll('silent');
	}
	function allInfo() {
		reg()?.logging.setLogLevel('info');
		setAll('info');
	}
	function onlyCategory(category: string) {
		const r = reg();
		if (!r) return;
		r.logging.disableLogging();
		r.logging.setCategoryLevel(category, 'debug');
		setAll('silent');
		const full = r.logging.getCategories().find((c) => c === category || c.endsWith(`:${category}`)) ?? category;
		categoryLevels[full] = 'debug';
		console.log(`%c▶ only ${category} → debug`, 'color:#8b5cf6;font-weight:bold;');
		refreshRegistry();
	}

	// ── LG03 · live instances ────────────────────────────────────────────
	let dynamicTrees = $state<number[]>([]);
	let nextDynamic = 1;
	function addTree() {
		dynamicTrees = [...dynamicTrees, nextDynamic++];
		queueMicrotask(() => {
			console.log(`%c＋ mounted — getInstances(): ${reg()?.getInstances().length}`, 'color:#10b981;font-weight:bold;');
			refreshRegistry();
		});
	}
	function removeTree() {
		if (!dynamicTrees.length) return;
		dynamicTrees = dynamicTrees.slice(0, -1);
		queueMicrotask(() => {
			console.log(`%c－ destroyed — getInstances(): ${reg()?.getInstances().length}`, 'color:#ef4444;font-weight:bold;');
			refreshRegistry();
		});
	}
	function logAllState() {
		const rows = ((reg()?.getInstances() ?? []) as TreeController<Item>[]).map((c) => ({
			treeId: c.treeId,
			expanded: c.expandedPaths.size,
			selected: c.selectedPaths.size,
			checked: c.checkedPaths.size
		}));
		console.log('%c🌲 expanded/selected/checked across all live instances', 'color:#667eea;font-weight:bold;');
		console.table(rows);
	}

	// ── LG04 · perf logging (separate module) ────────────────────────────
	let perfData = $state.raw<Item[]>([]);
	function enablePerf() {
		enablePerfLogging();
		console.log('%c Performance logging enabled', 'color:#10b981;font-weight:bold;');
	}
	function disablePerf() {
		disablePerfLogging();
		console.log('%c Performance logging disabled', 'color:#ef4444;font-weight:bold;');
	}
	function perfThreshold(ms: number) {
		setPerfThreshold(ms);
		console.log(`%c Perf threshold set to ${ms}ms`, 'color:#3b82f6;font-weight:bold;');
	}

	onMount(() => {
		// Start silent (production default), then paint the panel.
		disableAll();
		console.log('%c🌐 window.components demo ready', 'color:#667eea;font-size:1.3rem;font-weight:bold;');
		console.log(`Try: %cwindow.components['${ENTRY}']`, 'font-family:monospace;background:#eef;padding:2px 4px;');
		// Keep the instance list honest even if instances change outside our buttons.
		const timer = setInterval(refreshRegistry, 2000);
		return () => clearInterval(timer);
	});
</script>

<svelte:head>
	<title>Logging & Debugging - Svelte Treeview</title>
</svelte:head>

<header>
	<a href="/" class="back-link">&larr; Back to Examples</a>
	<h1>Logging &amp; Debugging</h1>
	<p class="subtitle">
		The global <code>window.components</code> registry, category logging controls and
		performance timings — the same entry shape and logger every Keenmate web component has.
	</p>
</header>

<div class="note warning">
	<strong>Open the DevTools Console (F12).</strong> On load the tree registers itself on
	<code>window.components['svelte-treeview']</code>. Try it in the console, then use the buttons
	below — the logging story here goes through that global, nothing else.
</div>

<!-- LG01 · The registry entry -->
<div class="card">
	<h2>LG01 · The registry entry</h2>
	<p class="description">
		The tree publishes one entry in the shape core's <code>registerComponent()</code> gives every
		web component (minus the custom-element bits — there's no tag). Below is a live view of
		<code>window.components['svelte-treeview']</code>, refreshed as trees mount and unmount.
	</p>

	<div class="output">
		<div class="output-label">window.components['svelte-treeview']</div>
		<dl class="registry">
			{#if registry}
				<dt>version()</dt><dd>{registry.version}</dd>
				<dt>config.name</dt><dd>{registry.config.name}</dd>
				<dt>config.author</dt><dd>{registry.config.author || '—'}</dd>
				<dt>config.license</dt><dd>{registry.config.license || '—'}</dd>
				<dt>logging</dt>
				<dd>
					{#each registry.categories as category (category)}
						{@const level = categoryLevels[category]}
						{@const isOn = !!level && level !== 'silent'}
						<span class="pill" class:pill--ok={isOn}>{category.split(':')[1] ?? category}{isOn ? ` · ${level}` : ''}</span>
					{/each}
				</dd>
				<dt>getInstances()</dt>
				<dd>
					<span class="badge">{registry.instances.length}</span>&nbsp;
					{#each registry.instances as id (id)}<span class="pill">{id}</span>{/each}
				</dd>
			{:else}
				<dt>status</dt><dd class="muted">not registered</dd>
			{/if}
		</dl>
	</div>

	<div class="controls">
		<button onclick={refreshRegistry}>Refresh</button>
		<button class="btn-outline" onclick={dumpToConsole}>console.log the entry</button>
	</div>
</div>

<!-- LG02 · Logging controls -->
<div class="card">
	<h2>LG02 · Logging controls — via <code>.logging</code></h2>
	<p class="description">
		<code>.logging</code> is the tree's logger bundle — type-level, so it reaches every tree on the
		page (e.g. <code>window.components['svelte-treeview'].logging.setCategoryLevel('DATA', 'debug')</code>).
		The level you set shows in the registry panel above. Interact with the trees — click, expand /
		collapse (UI), or drag a node in the second tree (DRAG) — to produce logs.
	</p>

	<div class="controls">
		<button onclick={enableAll}>Enable all (debug)</button>
		<button class="secondary" onclick={disableAll}>Disable all</button>
		<button class="btn-outline" onclick={allInfo}>All → info</button>
	</div>
	<div class="controls">
		{#each ['INIT', 'DATA', 'INDEX', 'UI', 'DRAG', 'RENDER'] as category (category)}
			<button onclick={() => onlyCategory(category)}>Only {category}</button>
		{/each}
	</div>

	<div class="grid grid-2 mt-1">
		<div class="form-group">
			<span class="demo-label">Files (click / expand / collapse → UI logs)</span>
			<div class="tree-container">
				<Tree treeId="tree-a" nodes={sampleData} idMember="id" pathMember="path" displayValueMember="name" sortCallback={sortByPath} expandLevel={2} />
			</div>
		</div>
		<div class="form-group">
			<span class="demo-label">Draggable (drag nodes → DRAG logs)</span>
			<div class="tree-container">
				<Tree treeId="tree-b" nodes={sampleData} idMember="id" pathMember="path" displayValueMember="name" sortCallback={sortByPath} expandLevel={2} dragDropMode="both" />
			</div>
		</div>
	</div>
</div>

<!-- LG03 · Live instances -->
<div class="card">
	<h2>LG03 · Live instances — <code>.getInstances()</code></h2>
	<p class="description">
		<code>getInstances()</code> returns the live tree controllers — one per mounted
		<code>Tree</code> / <code>TreeProvider</code>, added on mount and removed on destroy. Add and
		remove trees below and watch the count in the registry panel change; then fan a call out
		across every live instance.
	</p>

	<div class="controls">
		<button onclick={addTree}>Add a tree</button>
		<button class="secondary" onclick={removeTree}>Remove last</button>
		<button class="btn-outline" onclick={logAllState}>Log every instance's expanded / selected / checked state</button>
	</div>

	<div class="dynamic-hosts">
		{#each dynamicTrees as n (n)}
			<div class="form-group">
				<span class="demo-label">Dynamic tree #{n}</span>
				<div class="tree-container">
					<Tree treeId={`dyn-${n}`} nodes={sampleData} idMember="id" pathMember="path" displayValueMember="name" sortCallback={sortByPath} expandLevel={1} />
				</div>
			</div>
		{:else}
			<p class="muted"><em>No dynamic instances yet — click "Add a tree".</em></p>
		{/each}
	</div>
</div>

<!-- LG04 · Performance logging -->
<div class="card">
	<h2>LG04 · Performance logging</h2>
	<p class="description">
		Perf logging lives in its own module (<code>enablePerfLogging</code> /
		<code>setPerfThreshold</code>, imported from <code>@keenmate/svelte-treeview</code>) — it is
		<em>not</em> part of the <code>.logging</code> category bundle above. Enable it, then load a
		large dataset to see render timings in the console.
	</p>

	<div class="controls">
		<button onclick={enablePerf}>Enable Perf Logging</button>
		<button class="secondary" onclick={disablePerf}>Disable Perf Logging</button>
		<button class="btn-outline" onclick={() => perfThreshold(5)}>Threshold: 5ms</button>
		<button class="btn-outline" onclick={() => perfThreshold(0)}>Threshold: 0ms (all)</button>
	</div>
	<div class="controls">
		<button onclick={() => (perfData = generateTree(50))}>Load 50 nodes</button>
		<button onclick={() => (perfData = generateTree(500))}>Load 500 nodes</button>
		<button onclick={() => (perfData = generateTree(2000))}>Load 2000 nodes</button>
	</div>

	<div class="tree-container tree-container-lg">
		<Tree treeId="tree-perf" nodes={perfData} idMember="id" pathMember="path" displayValueMember="name" sortCallback={sortByPath} expandLevel={0} isProgressiveRenderEnabled />
	</div>
</div>

<!-- LG05 · Reference -->
<div class="card">
	<h2>LG05 · Log categories</h2>
	<p class="description">Printed as <code>STV:&lt;CATEGORY&gt;</code>; the page-wide default level is <code>warn</code>.</p>
	<ul>
		<li><strong>INIT</strong> — component initialization, configuration, destruction</li>
		<li><strong>DATA</strong> — data insertion, tree building, node updates</li>
		<li><strong>INDEX</strong> — search indexing operations</li>
		<li><strong>UI</strong> — rendering, clicks, keyboard, context menu</li>
		<li><strong>DRAG</strong> — drag start / over / leave / drop, cross-tree detection, touch drag</li>
		<li><strong>RENDER</strong> — progressive rendering batches, render timing</li>
	</ul>
</div>

<!-- LG06 · Usage -->
<div class="card">
	<h2>LG06 · Usage</h2>
	<div class="code-block" data-language="ts">
		<pre>{`// No import needed at call sites — the registry is a global, populated the
// moment the tree module is loaded anywhere on the page.
const tv = window.components['svelte-treeview'];

tv.version();                       // "5.0.0-rc16"
tv.config;                          // { name, version, author, license, … }
tv.getInstances();                  // each live tree's public controller

// Logging (the tree's logger bundle — every tree on the page)
tv.logging.getCategories();         // ["STV:INIT","STV:DATA","STV:RENDER","STV:INDEX","STV:DRAG","STV:UI"]
tv.logging.enableLogging();         // all categories → debug
tv.logging.setLogLevel('info');     // all → info
tv.logging.setCategoryLevel('INDEX', 'debug');
tv.logging.disableLogging();        // silence everything
tv.logging.resetLogging();          // follow the page-wide level again

// Page-wide — every Keenmate component on the page (see /examples/integration)
window.components.logging.enableLogging('debug');

// Fan out across instances
for (const c of tv.getInstances()) console.log(c.treeId, [...c.expandedPaths]);

// Perf logging is a SEPARATE module (not on tv.logging) — import it directly:
import { enablePerfLogging, setPerfThreshold } from '@keenmate/svelte-treeview';
enablePerfLogging();
setPerfThreshold(5);                // only log operations taking > 5ms`}</pre>
	</div>
</div>

<style>
	/* Live registry inspector (the window.components entry as a term / value grid) — the
	   same block as web-treeview's examples-logging.html. Pills / badge are the kit's. */
	.registry {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: 0.4rem 1rem;
		margin: 0;
		font-family: var(--kmwc-mono-font-family);
		font-size: 0.85rem;
		background: var(--kmwc-elevated-bg);
		color: var(--kmwc-text-color-1);
		border: 1px solid var(--kmwc-border-color);
		padding: 1rem 1.25rem;
		border-radius: var(--kmwc-radius-md);
		overflow-x: auto;
	}
	.registry dt {
		color: var(--kmwc-info-color);
		white-space: nowrap;
	}
	.registry dd {
		margin: 0;
		word-break: break-word;
	}
	.registry .pill {
		margin: 0 0.2rem 0.2rem 0;
	}
	.dynamic-hosts {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-top: 0.75rem;
	}
</style>
