<script lang="ts">
	import { onMount } from 'svelte';
	import Tree from '$lib/components/Tree.svelte';
	import type { LTreeNode, ContextMenuEntry } from '$lib/ltree/types.js';
	import './cobalt2.css';
	import './dracula.css';
	import './corporate.css';

	// Shared dataset — the SAME hierarchy rendered by both components, so the only
	// difference you see is each one's chrome resolving the SAME --base-* tokens.
	// `icon` + `desc` enrich the rows (icon, subtitle, native title tooltip).
	type Item = { id: string; name: string; path: string; icon: string; desc: string };
	const data: Item[] = [
		{ id: 'fruits', name: 'Fruits', path: '1', icon: '🍎', desc: 'Sweet, edible plant fruits' },
		{ id: 'apple', name: 'Apple', path: '1.1', icon: '🍏', desc: 'Crisp orchard fruit' },
		{ id: 'banana', name: 'Banana', path: '1.2', icon: '🍌', desc: 'Potassium-rich berry' },
		{ id: 'citrus', name: 'Citrus', path: '1.3', icon: '🍊', desc: 'Tangy, high in vitamin C' },
		{ id: 'orange', name: 'Orange', path: '1.3.1', icon: '🍊', desc: 'Juicy citrus staple' },
		{ id: 'lemon', name: 'Lemon', path: '1.3.2', icon: '🍋', desc: 'Sour yellow citrus' },
		{ id: 'veg', name: 'Vegetables', path: '2', icon: '🥦', desc: 'Edible plants & roots' },
		{ id: 'carrot', name: 'Carrot', path: '2.1', icon: '🥕', desc: 'Crunchy orange root' },
		{ id: 'potato', name: 'Potato', path: '2.2', icon: '🥔', desc: 'Starchy tuber' },
		{ id: 'leafy', name: 'Leafy greens', path: '2.3', icon: '🥬', desc: 'Dark leafy vegetables' },
		{ id: 'spinach', name: 'Spinach', path: '2.3.1', icon: '🌿', desc: 'Iron-rich leaf' },
		{ id: 'kale', name: 'Kale', path: '2.3.2', icon: '🥬', desc: 'Hardy superfood green' }
	];

	const sortByPath = (items: LTreeNode<Item>[]) =>
		[...items].sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));

	// Direct-child count for a folder node (shown as a themed badge in the template).
	const childCount = (node: LTreeNode<Item>) => Object.keys(node.children ?? {}).length;

	// Tree checkbox state (preselect a couple so the accent-on-checkbox shows).
	let selectedPaths = $state<Set<string>>(new Set(['1.1', '1.3.1']));

	// Context menu — a themed sample that exercises the full --stv-context-menu-*
	// token set (icons, shortcuts, a named divider, a submenu, a danger item) so
	// right-clicking any row shows how each theme styles the menu surface, hover,
	// dividers and the accent/danger text.
	const contextMenuItems = (node: LTreeNode<Item>): ContextMenuEntry[] => [
		{ label: 'Open', icon: '📂', shortcut: 'Enter', onclick: () => {} },
		{ label: 'Rename', icon: '✏️', shortcut: 'F2', onclick: () => {} },
		{ divider: true, label: 'Move to' },
		{
			label: 'Move to…',
			icon: '➡️',
			children: [
				{ label: 'Fruits', icon: '🍎', onclick: () => {} },
				{ label: 'Vegetables', icon: '🥦', onclick: () => {} }
			]
		},
		{ label: 'Duplicate', icon: '⧉', shortcut: 'Ctrl+D', onclick: () => {} },
		{ divider: true },
		{ label: 'Delete', icon: '🗑️', shortcut: 'Del', className: 'danger', onclick: () => {} }
	];

	// Themes — each is a .theme-<key> scope (in its own .css) that sets the full
	// --base-* token layer, extracted verbatim from the matching pure-admin theme.
	type ThemeKey = 'default' | 'cobalt2' | 'dracula' | 'corporate';
	const themes: { key: ThemeKey; label: string }[] = [
		{ key: 'default', label: 'Component defaults' },
		{ key: 'cobalt2', label: 'Cobalt2 (dark · amber)' },
		{ key: 'dracula', label: 'Dracula (dark · purple)' },
		{ key: 'corporate', label: 'Corporate (light · blue)' }
	];
	let theme = $state<ThemeKey>('cobalt2');
	const themeClass = $derived(theme === 'default' ? '' : `theme-${theme}`);

	const enc = (svg: string) => `url('data:image/svg+xml,${encodeURIComponent(svg)}')`;
	const lucide = (paths: string) =>
		enc(
			`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
		);

	// --- Treeview disclosure set (CHOOSE FIRST) -------------------------------
	// `chevron`/`triangle`/`arrow` rotate one glyph; `plus-minus` is a true
	// expand/collapse SWAP. Each set reads a DIFFERENT --base-icon-* token — the
	// icon-pack override below targets exactly that token so you can verify each
	// set's chaining. `arrow` is inline Lucide (NOT --base-* chained) → not
	// re-skinnable (surfaced in the UI). Treeview-only: web-multiselect's tree is
	// always fully expanded, so it has no per-node disclosure counterpart.
	type TreeIconSet = 'chevron' | 'triangle' | 'plus-minus' | 'arrow';
	const treeIconSets: { key: TreeIconSet; label: string; token: string }[] = [
		{ key: 'chevron', label: 'Chevron', token: '--base-icon-chevron' },
		{ key: 'triangle', label: 'Triangle', token: '--base-icon-caret-down' },
		{ key: 'plus-minus', label: 'Plus / Minus', token: '--base-icon-expand / -collapse' },
		{ key: 'arrow', label: 'Arrow', token: 'inline (not --base-*)' }
	];
	let treeIconSet = $state<TreeIconSet>('chevron');

	// --- Icon pack (alternative glyph families) -------------------------------
	// Two bold Lucide "framed" families; each supplies every glyph concept a
	// disclosure set (or the checkbox) needs, so switching family re-skins
	// whichever --base-icon-* the selected set consumes. Directional glyphs point
	// RIGHT / DOWN to match each set's rotation convention (chevron set rotates a
	// right-glyph; triangle set expects a down-glyph).
	type Glyph = 'chevronRight' | 'chevronDown' | 'plus' | 'minus' | 'check';
	type FamilyKey = 'default' | 'circle' | 'square';
	// The DISCLOSURE glyphs (chevron/caret/plus/minus) are framed (circle vs square)
	// so each pack's disclosure is dramatic and distinct. The CHECKBOX glyphs are
	// deliberately UNFRAMED and a different shape (a double-tick for check, a bare
	// bar for the dash) — a framed circle-check reads almost like a circle-chevron
	// at 16px, so keeping check/dash un-framed makes it obvious the checkbox and the
	// disclosure are driven by SEPARATE tokens.
	const doubleTick = lucide('<path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/>');
	const families: Record<'circle' | 'square', Record<Glyph, string>> = {
		circle: {
			chevronRight: lucide('<circle cx="12" cy="12" r="10"/><path d="m10 8 4 4-4 4"/>'),
			chevronDown: lucide('<circle cx="12" cy="12" r="10"/><path d="m16 10-4 4-4-4"/>'),
			plus: lucide('<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/>'),
			minus: lucide('<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/>'),
			check: doubleTick
		},
		square: {
			chevronRight: lucide('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="m10 8 4 4-4 4"/>'),
			chevronDown: lucide('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="m16 10-4 4-4-4"/>'),
			plus: lucide('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 12h8"/><path d="M12 8v8"/>'),
			minus: lucide('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 12h8"/>'),
			check: doubleTick
		}
	};
	const iconPacks: { key: FamilyKey; label: string }[] = [
		{ key: 'default', label: 'Lucide (built-in)' },
		{ key: 'circle', label: 'Circle family' },
		{ key: 'square', label: 'Square family' }
	];
	let iconPack = $state<FamilyKey>('default');

	// Icon size — the shared --base-icon-check-size knob (mask-size of the checkbox
	// check/dash glyph, read by BOTH the tree checkbox and ms). 'standard' leaves it
	// to the theme/default (68%); 'big' bumps it so the glyph nearly fills the box.
	type IconSizeKey = 'standard' | 'big';
	const iconSizes: { key: IconSizeKey; label: string; value: string | null }[] = [
		{ key: 'standard', label: 'Standard', value: null },
		{ key: 'big', label: 'Big', value: '92%' }
	];
	let iconSize = $state<IconSizeKey>('standard');

	// Checkbox BOX size — the shared --base-checkbox-scale knob. Multiplies the
	// checkbox box (width/height via calc, no transform) in BOTH components at once.
	let checkboxScale = $state(1);

	// Which --base-icon-* token(s) each disclosure set renders → mapped to the
	// matching family glyph. `arrow` returns nothing (not themeable).
	const disclosureVars = (set: TreeIconSet, f: Record<Glyph, string>): Record<string, string> => {
		switch (set) {
			case 'chevron':
				return { '--base-icon-chevron': f.chevronRight };
			case 'triangle':
				return { '--base-icon-caret-down': f.chevronDown };
			case 'plus-minus':
				return { '--base-icon-expand': f.plus, '--base-icon-collapse': f.minus };
			case 'arrow':
				return {};
		}
	};
	const arrowNotThemeable = $derived(treeIconSet === 'arrow' && iconPack !== 'default');

	// The wrapper whose --base-icon-* we override. Set via setProperty (NOT a
	// style="" string) because the values contain `url('data:…')` whose colon
	// trips naive style-string handling. Custom props aren't validated by
	// setProperty, so the url() lands intact and var() resolves it at the mask.
	let comparisonEl = $state<HTMLElement | null>(null);
	const ALL_ICON_KEYS = [
		'--base-icon-chevron',
		'--base-icon-caret-down',
		'--base-icon-expand',
		'--base-icon-collapse',
		'--base-icon-check',
		'--base-icon-indeterminate',
		'--base-icon-check-size'
	];
	$effect(() => {
		const el = comparisonEl;
		if (!el) return;
		for (const k of ALL_ICON_KEYS) el.style.removeProperty(k);
		// Icon size (independent of pack) — shared --base-icon-check-size.
		const size = iconSizes.find((s) => s.key === iconSize)?.value;
		if (size) el.style.setProperty('--base-icon-check-size', size);
		if (iconPack === 'default') return;
		const f = families[iconPack];
		// Always re-skin the shared checkbox glyphs; plus the selected set's token(s).
		const vars = {
			'--base-icon-check': f.check,
			'--base-icon-indeterminate': f.minus,
			...disclosureVars(treeIconSet, f)
		};
		for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
	});

	// Checkbox box scale — shared --base-checkbox-scale (both components read it).
	$effect(() => {
		const el = comparisonEl;
		if (!el) return;
		if (checkboxScale === 1) el.style.removeProperty('--base-checkbox-scale');
		else el.style.setProperty('--base-checkbox-scale', String(checkboxScale));
	});

	// --- web-multiselect (web component) wiring -------------------------------
	let msEl: HTMLElement | null = $state(null);
	let msReady = $state(false);

	onMount(async () => {
		// Vendored ESM bundle served from static/. Loaded via an injected module
		// <script> (NOT import()) so Vite treats it as a runtime asset, not a module
		// to analyse. The bundle defines <web-multiselect> as a side effect.
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
		if (!msEl) return;
		Object.assign(msEl, {
			options: data,
			valueMember: 'id',
			displayValueMember: 'name',
			pathMember: 'path',
			iconMember: 'icon',
			subtitleMember: 'desc',
			isTreeEnabled: true,
			isMultipleEnabled: true,
			isCheckboxesShown: true,
			isSearchEnabled: true,
			isOptionTooltipsEnabled: true,
			searchPlaceholder: 'Filter…'
		});
		// Preselect the same two leaves as the tree so badges carry the theme accent.
		(msEl as any).setSelected?.(['apple', 'orange']);
		msReady = true;
	});
</script>

<div class="container">
	<header class="example-header">
		<a href="/" class="back-link">&larr; Back to Examples</a>
		<h1>Theme Comparison</h1>
		<p class="subtitle">
			<code>&lt;web-multiselect&gt;</code> and <code>&lt;Tree&gt;</code> side by side, both resolving the
			<strong>same</strong> KeenMate <code>--base-*</code> design tokens — visual proof that the shared
			token contract renders both consistently.
		</p>
	</header>

	<div class="card">
		<h2>TC01 · Shared <code>--base-*</code> contract</h2>
		<p class="description">
			Switch the theme to retint both components at once, or swap the icon pack to re-skin the
			glyphs they share. Each theme is a full <code>--base-*</code> token set extracted verbatim from
			a pure-admin theme. Nothing below is styled per-component — only the shared
			<code>--base-*</code> layer changes, so accent, surfaces, text hierarchy, borders, hover and the
			checkbox / chevron glyphs all track together.
		</p>

		<div class="controls">
			<span class="controls-label">Theme:</span>
			{#each themes as t (t.key)}
				<button
					class="btn {theme === t.key ? '' : 'btn-secondary'}"
					onclick={() => (theme = t.key)}
				>{t.label}</button>
			{/each}
		</div>

		<div class="controls">
			<span class="controls-label">Tree disclosure (<code>iconSet</code>):</span>
			{#each treeIconSets as set (set.key)}
				<button
					class="btn {treeIconSet === set.key ? '' : 'btn-secondary'}"
					onclick={() => (treeIconSet = set.key)}
				>{set.label}</button>
			{/each}
			<span class="muted">→ <code>{treeIconSets.find((s) => s.key === treeIconSet)?.token}</code> · treeview only</span>
		</div>

		<div class="controls">
			<span class="controls-label">Icon pack:</span>
			{#each iconPacks as pack (pack.key)}
				<button
					class="btn {iconPack === pack.key ? '' : 'btn-secondary'}"
					onclick={() => (iconPack = pack.key)}
				>{pack.label}</button>
			{/each}
			{#if arrowNotThemeable}
				<span class="muted">arrow glyphs are inline (not <code>--base-*</code>) — pack affects checkboxes only</span>
			{/if}
		</div>

		<div class="controls">
			<span class="controls-label">Icon size:</span>
			{#each iconSizes as size (size.key)}
				<button
					class="btn {iconSize === size.key ? '' : 'btn-secondary'}"
					onclick={() => (iconSize = size.key)}
				>{size.label}</button>
			{/each}
			<span class="muted">→ <code>--base-icon-check-size</code> (checkbox glyph, tree + multiselect)</span>
		</div>

		<div class="controls">
			<span class="controls-label">Checkbox size:</span>
			<input
				type="range"
				min="0.5"
				max="2.5"
				step="0.05"
				bind:value={checkboxScale}
				aria-label="Checkbox box scale"
			/>
			<code class="scale-readout">{checkboxScale.toFixed(2)}×</code>
			<button class="btn btn-secondary" onclick={() => (checkboxScale = 1)}>Reset</button>
			<span class="muted">→ <code>--base-checkbox-scale</code> (box size via calc, no transform — both components)</span>
		</div>

		<div class="comparison {themeClass}" bind:this={comparisonEl}>
			<section class="panel">
				<header class="panel-head">
					@keenmate/web-multiselect <span class="panel-badge">v2.2.0</span>
				</header>
				<div class="panel-body">
					<web-multiselect bind:this={msEl} class="demo-ms"></web-multiselect>
					{#if !msReady}<p class="panel-hint">Loading web-multiselect…</p>{/if}
					<p class="panel-hint">Click the field to open the tree dropdown (checkboxes, search, hover).</p>
				</div>
			</section>

			<section class="panel">
				<header class="panel-head">
					@keenmate/svelte-treeview <span class="panel-badge">rc</span>
				</header>
				<div class="panel-body">
					<Tree
						{data}
						idMember="id"
						pathMember="path"
						displayValueMember="name"
						sortCallback={sortByPath}
						shouldShowCheckboxes
						checkboxMode="cascade"
						bind:selectedPaths
						iconSet={treeIconSet}
						expandLevel={5}
						getContextMenuItemsCallback={contextMenuItems}
						shouldShowNodeTooltips
					>
						{#snippet nodeTemplate(node: LTreeNode<Item>)}
							<!-- Custom row: icon + label + folder count badge. Hover shows the
							     themed tooltip below (shouldShowNodeTooltips + the `tooltip` snippet),
							     the direct analog of the multiselect's option tooltips. -->
							<span class="demo-node">
								<span class="demo-node__icon">{node.data?.icon}</span>
								<span class="demo-node__label">{node.data?.name}</span>
								{#if childCount(node) > 0}
									<span class="demo-node__count">{childCount(node)}</span>
								{/if}
							</span>
						{/snippet}
						{#snippet tooltip(node: LTreeNode<Item>)}
							<!-- Rich tooltip content. Portaled + Floating-UI positioned by the
							     library; themed via the shared --base-tooltip-* tokens so it matches
							     web-multiselect's option tooltip under every theme. -->
							<div class="demo-tip">
								<strong>{node.data?.icon} {node.data?.name}</strong>
								<span class="demo-tip__desc">{node.data?.desc}</span>
								<span class="demo-tip__path">path {node.data?.path}</span>
							</div>
						{/snippet}
					</Tree>
				</div>
			</section>
		</div>

		<div class="note">
			<p class="note-title">What to look for</p>
			<p>
				Both components read the same three shared glyph tokens —
				<code>--base-icon-chevron</code> (disclosure / dropdown toggle),
				<code>--base-icon-check</code> (checkbox tick) and
				<code>--base-icon-indeterminate</code> (tri-state dash) — plus the same colour, surface,
				text-hierarchy and border tokens. Open the multiselect dropdown to compare its options,
				checkboxes and hover against the tree. Each theme's tokens are extracted verbatim from the
				matching <code>@keenmate/pure-admin-theme-*</code> package (Cobalt2, Dracula, Corporate).
			</p>
			<p>
				The <strong>Tree disclosure</strong> switch is treeview-only: <code>chevron</code> /
				<code>triangle</code> / <code>arrow</code> rotate one glyph, while
				<code>plus-minus</code> is a true expand/collapse <em>swap</em> driven by
				<code>--base-icon-expand</code> (＋) and <code>--base-icon-collapse</code> (－).
				Collapse a node to see the swap. web-multiselect's tree is always fully expanded, so it
				has no per-node disclosure counterpart.
			</p>
			<p>
				<strong>Right-click a row</strong> to open the context menu — it reads the same
				<code>--base-*</code> layer through the <code>--stv-context-menu-*</code> tokens
				(<code>--base-dropdown-bg</code> surface, accent hover, divider, danger text), so the menu
				retints with every theme switch. The sample includes icons, shortcuts, a named divider, a
				submenu and a <code>className: 'danger'</code> item.
			</p>
			<p>
				<strong>Rich rows + tooltips:</strong> the tree uses a <code>nodeTemplate</code> snippet
				(icon + label + a themed folder-count badge). <strong>Hover any row</strong> for the
				tooltip — enabled with <code>shouldShowNodeTooltips</code> and a <code>tooltip</code>
				snippet (rich content: name, description, path). It's portaled and Floating-UI
				positioned by the library, and themed through the shared <code>--base-tooltip-*</code>
				tokens, so it renders identically to the multiselect's option tooltips under every theme.
				For plain text, pass <code>getNodeTooltipCallback</code> instead of the snippet; for a
				clipped-label reveal only, <code>nodeTitleOverflow="info"</code> still applies. The
				multiselect mirrors the data via <code>iconMember</code> / <code>subtitleMember</code>
				with option tooltips on.
			</p>
		</div>
	</div>
</div>

<style>
	.comparison {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		margin: 1rem 0;
		padding: 1.5rem;
		border-radius: 8px;
		/* Each theme scope sets --base-page-bg; with no theme it's unset → transparent. */
		background: var(--base-page-bg, transparent);
		transition: background 0.2s ease;
	}

	.panel {
		display: flex;
		flex-direction: column;
		border: 1px solid var(--base-border-color, #e2e8f0);
		border-radius: 8px;
		overflow: hidden;
		background: var(--base-main-bg, #ffffff);
		min-height: 320px;
	}

	.panel-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.6rem 0.9rem;
		font-weight: 600;
		font-size: 0.85rem;
		color: var(--base-text-color-1, #111827);
		border-bottom: 1px solid var(--base-border-color, #e2e8f0);
		background: var(--base-elevated-bg, #f8f9fa);
	}

	.panel-badge {
		font-weight: 500;
		font-size: 0.7rem;
		padding: 0.1rem 0.45rem;
		border-radius: 999px;
		color: var(--base-text-color-on-accent, #fff);
		background: var(--base-accent-color, #3b82f6);
	}

	.panel-body {
		padding: 1rem;
		flex: 1;
	}

	.panel-hint {
		margin: 0.75rem 0 0;
		font-size: 0.78rem;
		color: var(--base-text-color-3, #6b7280);
	}

	/* Give the multiselect a sensible demo width inside the panel. */
	.demo-ms {
		display: block;
		max-width: 420px;
	}

	.scale-readout {
		min-width: 3.5em;
		display: inline-block;
		font-variant-numeric: tabular-nums;
	}

	/* Custom nodeTemplate row: icon + label + themed folder-count badge. The badge
	   reads --base-accent-color(-light) so it retints with the selected theme. */
	.demo-node {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
	}
	.demo-node__icon {
		flex: 0 0 auto;
	}
	.demo-node__label {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.demo-node__count {
		flex: 0 0 auto;
		font-size: 0.72em;
		font-weight: 600;
		line-height: 1.4;
		padding: 0 0.45rem;
		border-radius: 999px;
		color: var(--base-accent-color, #3b82f6);
		background: var(
			--base-accent-color-light,
			color-mix(in srgb, var(--base-accent-color, #3b82f6) 15%, transparent)
		);
	}

	/* Tooltip snippet content. The library paints the portaled .stv__tooltip surface
	   (bg/radius/shadow via --base-tooltip-*); this just lays out the inner lines.
	   :global because the content is portaled to <body>, outside this component's scope. */
	:global(.demo-tip) {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	:global(.demo-tip__desc) {
		opacity: 0.85;
	}
	:global(.demo-tip__path) {
		font-size: 0.85em;
		opacity: 0.6;
		font-variant-numeric: tabular-nums;
	}

	@media (max-width: 760px) {
		.comparison {
			grid-template-columns: 1fr;
		}
	}
</style>
