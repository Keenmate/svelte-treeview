<script lang="ts">
	// Basic usage — section for section the same page as web-treeview's examples-basic.html
	// (same data, same buttons, same order), so a tester can run the same steps on both.
	import { onDestroy, tick, untrack } from 'svelte';
	import Tree from '$lib/components/Tree.svelte';
	import type { LTreeNode } from '$lib/ltree/types.js';
	import type { NodeRef, Motion } from '$lib/index.js';
	import RenderModeSwitch from '../RenderModeSwitch.svelte';
	import { getTreeProps } from '../render-mode.svelte.js';
	import LogPanel, { logLine, type LogEntry } from '../../LogPanel.svelte';

	type Item = { id: number; path: string; name: string; icon: string };

	// One dataset drives most sections on this page.
	const sampleData: Item[] = [
		{ id: 1, path: '1', name: 'Documents', icon: '📁' },
		{ id: 2, path: '1.1', name: 'Work', icon: '💼' },
		{ id: 3, path: '1.1.1', name: 'Reports', icon: '📊' },
		{ id: 4, path: '1.1.2', name: 'Presentations', icon: '📽️' },
		{ id: 5, path: '1.2', name: 'Personal', icon: '🏠' },
		{ id: 6, path: '1.2.1', name: 'Photos', icon: '📷' },
		{ id: 7, path: '1.2.2', name: 'Music', icon: '🎵' },
		{ id: 8, path: '1.2.3', name: 'Videos', icon: '🎬' },
		{ id: 9, path: '2', name: 'Downloads', icon: '⬇️' },
		{ id: 10, path: '2.1', name: 'Software', icon: '💿' },
		{ id: 11, path: '2.2', name: 'Media', icon: '🎞️' },
		{ id: 12, path: '3', name: 'Projects', icon: '🚀' },
		{ id: 13, path: '3.1', name: 'Web App', icon: '🌐' },
		{ id: 14, path: '3.1.1', name: 'Frontend', icon: '🎨' },
		{ id: 15, path: '3.1.2', name: 'Backend', icon: '⚙️' },
		{ id: 16, path: '3.2', name: 'Mobile App', icon: '📱' }
	];

	// BU02 — four levels deep, so every expandLevel step shows.
	const orgChart = [
		{ id: 1, path: '1', name: 'CEO - Alice' },
		{ id: 2, path: '1.1', name: 'CTO - Bob' },
		{ id: 3, path: '1.1.1', name: 'Dev Lead - Charlie' },
		{ id: 4, path: '1.1.1.1', name: 'Frontend Dev - Dave' },
		{ id: 5, path: '1.1.1.2', name: 'Backend Dev - Eve' },
		{ id: 6, path: '1.1.1.3', name: 'DevOps - Frank' },
		{ id: 7, path: '1.1.2', name: 'QA Lead - Grace' },
		{ id: 8, path: '1.1.2.1', name: 'QA Engineer - Hank' },
		{ id: 9, path: '1.2', name: 'CFO - Ivy' },
		{ id: 10, path: '1.2.1', name: 'Accountant - Jack' },
		{ id: 11, path: '1.2.2', name: 'Financial Analyst - Kim' },
		{ id: 12, path: '1.3', name: 'COO - Leo' },
		{ id: 13, path: '1.3.1', name: 'HR Manager - Mia' },
		{ id: 14, path: '1.3.2', name: 'Office Manager - Noah' }
	];

	// BU04 — your own property names.
	const categories = [
		{ categoryId: 1, categoryPath: '1', label: 'Electronics' },
		{ categoryId: 2, categoryPath: '1.1', label: 'Phones' },
		{ categoryId: 3, categoryPath: '1.1.1', label: 'Smartphones' },
		{ categoryId: 4, categoryPath: '1.1.2', label: 'Feature Phones' },
		{ categoryId: 5, categoryPath: '1.2', label: 'Laptops' },
		{ categoryId: 6, categoryPath: '1.2.1', label: 'Gaming Laptops' },
		{ categoryId: 7, categoryPath: '1.2.2', label: 'Ultrabooks' },
		{ categoryId: 8, categoryPath: '1.3', label: 'Tablets' },
		{ categoryId: 9, categoryPath: '2', label: 'Clothing' },
		{ categoryId: 10, categoryPath: '2.1', label: 'Men' },
		{ categoryId: 11, categoryPath: '2.1.1', label: 'Shirts' },
		{ categoryId: 12, categoryPath: '2.1.2', label: 'Pants' },
		{ categoryId: 13, categoryPath: '2.2', label: 'Women' },
		{ categoryId: 14, categoryPath: '2.2.1', label: 'Dresses' },
		{ categoryId: 15, categoryPath: '2.2.2', label: 'Skirts' },
		{ categoryId: 16, categoryPath: '3', label: 'Books' },
		{ categoryId: 17, categoryPath: '3.1', label: 'Fiction' },
		{ categoryId: 18, categoryPath: '3.2', label: 'Non-Fiction' }
	];

	// BU12 — a large generated dataset.
	type GenItem = { id: number; path: string; name: string };
	function generateLargeTree(count: number): GenItem[] {
		const data: GenItem[] = [];
		let id = 1;
		const topLevelCount = Math.min(count, 20);
		const perBranch = Math.floor(count / topLevelCount);
		for (let i = 1; i <= topLevelCount; i++) {
			data.push({ id: id++, path: `${i}`, name: `Branch ${i}` });
			const childCount = Math.min(perBranch, 50);
			for (let j = 1; j <= childCount; j++) {
				data.push({ id: id++, path: `${i}.${j}`, name: `Item ${i}.${j}` });
				const subCount = Math.floor((count - topLevelCount * childCount) / (topLevelCount * childCount));
				for (let k = 1; k <= Math.min(subCount, 10); k++) {
					data.push({ id: id++, path: `${i}.${j}.${k}`, name: `Detail ${i}.${j}.${k}` });
					if (id > count) break;
				}
				if (id > count) break;
			}
			if (id > count) break;
		}
		return data;
	}

	// Every tree on this page gets isSorted: the data is already in tree order (= the
	// web-treeview page), so the tree keeps it instead of sorting by name.

	// ── BU01 · display sliders ───────────────────────────
	// Three sliders drive the CSS knobs that compose a row's left offset. They are declared
	// ON .stv__container (the tree root), so a value on an ancestor wrapper is shadowed — we
	// set them inline on the container element itself. Presets snap all three at once.
	type Preset = 'condensed' | 'compact' | 'generous';
	const presets: Record<Preset, { indent: number; toggle: number; pad: number }> = {
		condensed: { indent: 8, toggle: 16, pad: 4 },
		compact: { indent: 16, toggle: 20, pad: 6 },
		generous: { indent: 32, toggle: 24, pad: 8 }
	};
	let activePreset = $state<Preset | null>('compact');
	let indent = $state(presets.compact.indent);
	let toggleWidth = $state(presets.compact.toggle);
	let padLeft = $state(presets.compact.pad);
	let simpleTreeWrap = $state<HTMLDivElement | null>(null);
	let cssReadout = $state<{ name: string; value: string; isGap?: boolean }[]>([]);
	let selectedOutput = $state('Click a node to see selection info');

	function applyPreset(name: Preset) {
		activePreset = name;
		indent = presets[name].indent;
		toggleWidth = presets[name].toggle;
		padLeft = presets[name].pad;
	}

	function applyVars(retries = 10) {
		const container = simpleTreeWrap?.querySelector('.stv__container') as HTMLElement | null;
		if (!container) {
			if (retries > 0) requestAnimationFrame(() => applyVars(retries - 1));
			return;
		}
		container.style.setProperty('--stv-indent-size', `${indent}px`);
		container.style.setProperty('--stv-toggle-icon-width', `${toggleWidth}px`);
		// Only the horizontal (left/right) part — keep the vertical pad at its default.
		container.style.setProperty('--stv-node-padding', `var(--stv-spacing-sm) ${padLeft}px`);
		cssReadout = [
			{ name: '--stv-indent-size', value: `${indent}px` },
			{ name: '--stv-toggle-icon-width', value: `${toggleWidth}px` },
			{ name: '--stv-node-padding (left)', value: `${padLeft}px` },
			{ name: 'root gap (gutter + padding)', value: `${toggleWidth + padLeft}px`, isGap: true }
		];
	}

	$effect(() => {
		indent; toggleWidth; padLeft; // re-apply when any slider changes
		tick().then(() => applyVars());
	});

	function showSelected({ node }: NodeRef<Item>) {
		if (!node) return;
		selectedOutput = JSON.stringify(
			{ id: node.data?.id, path: node.path, name: node.data?.name, level: node.level, hasChildren: node.hasChildren, isExpanded: node.isExpanded },
			null,
			2
		);
	}

	// BU01: "Work" (1.1) and "Reports" (1.1.1) have no icon, to show label alignment.
	const iconExceptWork = ({ node }: { node: LTreeNode<Item> }) =>
		node.path === '1.1' || node.path === '1.1.1' ? null : (node.data?.icon ?? null);

	// ── BU02 / BU03 ──────────────────────────────────────
	let expandLevel = $state(2);
	let isAccordion = $state(true);
	let accordionTreeRef: Tree<Item>;

	// ── BU05 · events ────────────────────────────────────
	// untrack: the events can fire inside the tree's own effects — reading eventLog there
	// would make it a dependency of that effect (write + read = an update loop).
	let eventLog = $state<LogEntry[]>([]);
	const logEvent = (name: string, node?: LTreeNode<Item> | null) => {
		const line = logLine(name, node ? `${node.data?.name} (path: ${node.path})` : undefined);
		eventLog = [...untrack(() => eventLog), line];
	};

	// ── BU06–BU09 ────────────────────────────────────────
	let scrollPath = $state('1.2.1');
	let scrollTreeRef: Tree<Item>;
	let expandCollapseTreeRef: Tree<Item>;
	let arrayTreeRef: Tree<Item>;
	let focusTreeRef: Tree<Item>;

	// ── BU11 · row animation ─────────────────────────────
	// The tokens are declared ON .stv__container, so (like the BU01 sliders) they are set
	// inline on the container element itself.
	type RowSpeed = 'normal' | 'slow' | 'off';
	const ROW_SPEED: Record<RowSpeed, string> = {
		normal: 'var(--stv-transition-normal)',
		slow: 'var(--stv-transition-slow)',
		off: '0s'
	};
	let rowSpeed = $state<RowSpeed>('slow');
	let isPlainFade = $state(false);
	let rowLimit = $state(50);
	let rowMotion = $state<Motion>('auto');
	let rowTreeWrap = $state<HTMLDivElement | null>(null);
	let rowTreeRef: Tree<Item>;
	let rowStatus = $state('');

	function applyRowVars(retries = 10) {
		const container = rowTreeWrap?.querySelector('.stv__container') as HTMLElement | null;
		if (!container) {
			if (retries > 0) requestAnimationFrame(() => applyRowVars(retries - 1));
			return;
		}
		container.style.setProperty('--stv-row-animation-duration', ROW_SPEED[rowSpeed]);
		if (isPlainFade) container.style.setProperty('--stv-row-animation-distance', '0');
		else container.style.removeProperty('--stv-row-animation-distance');
	}

	$effect(() => {
		rowSpeed; isPlainFade; // re-apply when a control changes
		tick().then(() => applyRowVars());
	});

	// collapseAll() returns a Promise that settles once the rows animated out and the
	// tree really collapsed (onNodeCollapse / onExpandedChange fire then).
	async function collapseRowTree() {
		const start = performance.now();
		rowStatus = 'collapsing…';
		await rowTreeRef?.collapseAll();
		rowStatus = `collapsed — the Promise settled after ${Math.round(performance.now() - start)} ms`;
	}

	// ── BU12 · large dataset ─────────────────────────────
	let largeData = $state.raw<GenItem[]>([]);
	let largeTreeRef: Tree<GenItem>;
	let largeOutput = $state('Load data to see node counts');
	async function loadLarge(count: number) {
		largeData = generateLargeTree(count);
		await tick();
		largeOutput = `${largeData.length} nodes loaded · ${largeTreeRef?.getVisibleFlatNodes().length ?? 0} visible`;
	}
	function clearLarge() {
		largeData = [];
		largeOutput = 'Load data to see node counts';
	}

	// ── BU13 · page-wide labels ──────────────────────────
	const LOCALE_CS: Record<string, string> = {
		'svelte-treeview.messages.noData': 'Žádná data',
		'svelte-treeview.menuItems.copy': 'Kopírovat', 'svelte-treeview.menuItems.cut': 'Vyjmout',
		'svelte-treeview.menuItems.paste': 'Vložit', 'svelte-treeview.menuItems.delete': 'Smazat',
		'svelte-treeview.menuItems.expandAll': 'Rozbalit vše', 'svelte-treeview.menuItems.collapseAll': 'Sbalit vše',
		'svelte-treeview.labels.dropBefore': 'Před', 'svelte-treeview.labels.dropAfter': 'Za', 'svelte-treeview.labels.dropChild': 'Dovnitř'
	};
	let localeLang = $state<'en' | 'cs'>('en');
	$effect(() => {
		const components = ((window as any).components ??= {});
		components.locale = localeLang === 'cs' ? { labels: LOCALE_CS } : null;
	});
	onDestroy(() => {
		const components = (globalThis as any).window?.components;
		if (components) components.locale = null;
	});
</script>

<svelte:head>
	<title>Basic Usage - Svelte Treeview</title>
</svelte:head>

<header>
	<a href="/" class="back-link">&larr; Back to Examples</a>
	<h1>Basic Usage</h1>
	<p class="subtitle">Simple tree rendering, expand/collapse, node selection, and hierarchical data</p>
	<RenderModeSwitch />
</header>

<!-- BU01 · Simple Tree -->
<div class="card">
	<h2>BU01 · Simple Tree</h2>
	<p class="description">
		A basic tree with hierarchical data using path-based structure. Click nodes to select, click
		the toggle icon to expand/collapse.
	</p>

	<div class="controls">
		<span class="muted">Display:</span>
		<button class:secondary={activePreset !== 'condensed'} onclick={() => applyPreset('condensed')}>Condensed</button>
		<button class:secondary={activePreset !== 'compact'} onclick={() => applyPreset('compact')}>Compact</button>
		<button class:secondary={activePreset !== 'generous'} onclick={() => applyPreset('generous')}>Generous</button>
	</div>

	<div class="display-sliders">
		<label for="sl-indent">--stv-indent-size</label>
		<input id="sl-indent" type="range" min="0" max="48" step="1" bind:value={indent} oninput={() => (activePreset = null)} />
		<output>{indent}px</output>

		<label for="sl-column">--stv-toggle-icon-width</label>
		<input id="sl-column" type="range" min="0" max="48" step="1" bind:value={toggleWidth} oninput={() => (activePreset = null)} />
		<output>{toggleWidth}px</output>

		<label for="sl-padding">--stv-node-padding (left)</label>
		<input id="sl-padding" type="range" min="0" max="24" step="1" bind:value={padLeft} oninput={() => (activePreset = null)} />
		<output>{padLeft}px</output>
	</div>

	<div class="css-readout">
		{#each cssReadout as v (v.name)}
			<code class:is-gap={v.isGap}>{v.name}: <b>{v.value}</b></code>
		{/each}
	</div>

	<div class="tree-container" bind:this={simpleTreeWrap}>
		<Tree
			nodes={sampleData}
			idMember="id"
			pathMember="path"
			displayValueMember="name"
			isSorted={true}
			expandLevel={1}
			getIconCallback={iconExceptWork}
			onNodeClick={showSelected}
			{...getTreeProps()}
		/>
	</div>

	<div class="note">
		<p class="note-title">What makes a row's left offset</p>
		<p>
			A row sits in by <b>toggle gutter + content padding + (level − 1) × indent</b>. The
			indentation buttons only move <code>--stv-indent-size</code> — multiplied by
			<code>(level − 1)</code>, so at the <em>root</em> that's × 0 and the root rows never move. The
			fixed part left of every label is the <strong>toggle column</strong>
			(<code>--stv-toggle-icon-width</code>, reserved on every row so leaf labels align under branch
			labels) plus the content's left <code>--stv-node-padding</code> — independent of indent.
			<em>Work</em> and <em>Reports</em> have no icon: the icon column is reserved too
			(<code>shouldAlignNodeIcons</code>), so their labels still line up.
		</p>
		<p>
			To tighten the root gap, lower <code>--stv-toggle-icon-width</code> (and/or
			<code>--stv-node-padding</code>); to change nesting density, use <code>--stv-indent-size</code>.
			A toggle column of <b>0</b> hides the chevrons — a supported look for navigation-style trees: a
			row click and <kbd>Enter</kbd> still expand (with <code>clickBehavior="select"</code> only a
			double-click or the keyboard does).
			They're declared <em>on</em> the tree's root element (<code>.stv__container</code>), so a value
			must be set there too — the sliders write them inline on the container.
		</p>
		<div class="code-block" data-language="css">
			<pre>{`/* one instance — scope by a wrapper class */
.my-tree .stv__container {
  --stv-indent-size: ${indent}px;
  --stv-toggle-icon-width: ${toggleWidth}px;
  --stv-node-padding: var(--stv-spacing-sm) ${padLeft}px;
}`}</pre>
		</div>
	</div>

	<div class="output">
		<p class="output-label">Selected node:</p>
		<pre id="tree1-output">{selectedOutput}</pre>
	</div>
</div>

<!-- BU02 · Expand Level -->
<div class="card">
	<h2>BU02 · Expand Level</h2>
	<p class="description">
		Use <code>expandLevel</code> to control how many levels are expanded on initial render. This
		tree starts with 2 levels expanded; change the number and the tree re-expands from the root down
		to that depth.
	</p>

	<div class="controls">
		<label for="tree2-expand-level">expandLevel:</label>
		<input type="number" id="tree2-expand-level" min="0" max="10" step="1" bind:value={expandLevel} class="w-sm" />
		<span class="muted">levels expanded (0 = roots only)</span>
	</div>

	<div class="tree-container">
		<Tree
			nodes={orgChart}
			idMember="id"
			pathMember="path"
			displayValueMember="name"
			isSorted={true}
			expandLevel={Math.max(0, Math.min(10, Number(expandLevel) || 0))}
			{...getTreeProps()}
		/>
	</div>

	<div class="code-block" data-language="svelte">
		<pre>{`<Tree {nodes} expandLevel={${expandLevel}} ... />`}</pre>
	</div>
</div>

<!-- BU03 · Accordion Expand -->
<div class="card">
	<h2>BU03 · Accordion Expand</h2>
	<p class="description">
		With <code>shouldExpandAsAccordion</code>, opening one branch automatically collapses its
		siblings at the same level. Useful when you want only one section open at a time (e.g. file
		managers, settings panels). User-driven toggles honor it; programmatic
		<code>expandNodes()</code> calls are unaffected.
	</p>

	<div class="controls">
		<label>
			<input type="checkbox" id="acc-enabled" bind:checked={isAccordion} />
			Accordion mode
		</label>
		<button class="btn-outline" onclick={() => accordionTreeRef?.collapseAll()}>Collapse all</button>
	</div>

	<div class="tree-container">
		<Tree
			bind:this={accordionTreeRef}
			nodes={sampleData}
			idMember="id"
			pathMember="path"
			displayValueMember="name"
			iconMember="icon"
			isSorted={true}
			expandLevel={1}
			shouldExpandAsAccordion={isAccordion}
			{...getTreeProps()}
		/>
	</div>
	<p class="form-text mt-1">
		Try expanding "Work", then "Personal" &mdash; with accordion on, opening "Personal" auto-collapses
		"Work". Untick the box and the two sections can stay open together.
	</p>
</div>

<!-- BU04 · Custom Data Mappings -->
<div class="card">
	<h2>BU04 · Custom Data Mappings</h2>
	<p class="description">
		Map your own data shape to the tree using <code>idMember</code>, <code>pathMember</code>, and
		<code>displayValueMember</code>.
	</p>

	<div class="tree-container">
		<Tree
			nodes={categories}
			idMember="categoryId"
			pathMember="categoryPath"
			displayValueMember="label"
			isSorted={true}
			expandLevel={1}
			{...getTreeProps()}
		/>
	</div>

	<div class="code-block" data-language="svelte">
		<pre>{`<!-- Your data can use any property names -->
${'<'}script>
  const data = [
    { categoryId: 1, categoryPath: "1", label: "Electronics", ... },
    { categoryId: 2, categoryPath: "1.1", label: "Phones", ... }
  ];
${'<'}/script>

<!-- Map them to tree properties -->
<Tree nodes={data} idMember="categoryId" pathMember="categoryPath" displayValueMember="label" />`}</pre>
	</div>
</div>

<!-- BU05 · Events -->
<div class="card">
	<h2>BU05 · Events</h2>
	<p class="description">
		Listen to tree events: <code>onNodeClick</code>, <code>onFocusChange</code>,
		<code>onNodesChange</code>.
	</p>

	<div class="tree-container">
		<Tree
			nodes={sampleData}
			idMember="id"
			pathMember="path"
			displayValueMember="name"
			iconMember="icon"
			isSorted={true}
			expandLevel={1}
			onNodeClick={({ node }) => logEvent('onNodeClick', node)}
			onFocusChange={({ focusedNode }) => logEvent('onFocusChange', focusedNode)}
			onNodesChange={() => logEvent('onNodesChange')}
			{...getTreeProps()}
		/>
	</div>

	<div class="output">
		<p class="output-label">Event log:</p>
		<LogPanel entries={eventLog} isDark empty="Click a node or move the focus…" />
	</div>
	<button onclick={() => (eventLog = [])} class="btn-outline mt-1">Clear log</button>
</div>

<!-- BU06 · Scroll to Path -->
<div class="card">
	<h2>BU06 · Scroll to Path</h2>
	<p class="description">
		Use <code>scrollToPath()</code> to programmatically scroll to and highlight a specific node.
		Enter a path from the tree below.
	</p>

	<div class="controls">
		<input type="text" id="scroll-path" bind:value={scrollPath} placeholder="Enter path (e.g., 1.2.1)" />
		<button onclick={() => scrollTreeRef?.scrollToPath(scrollPath, { shouldHighlight: true, behavior: 'smooth', block: 'center' })}>Scroll to Path</button>
	</div>

	<div class="tree-container tree-container-tall">
		<Tree
			bind:this={scrollTreeRef}
			nodes={sampleData}
			idMember="id"
			pathMember="path"
			displayValueMember="name"
			iconMember="icon"
			isSorted={true}
			expandLevel={3}
			{...getTreeProps()}
		>
			{#snippet nodeTemplate(node: LTreeNode<Item>)}
				<span>{node.data?.name} <code class="muted">({node.path})</code></span>
			{/snippet}
		</Tree>
	</div>

	<div class="note">
		<p class="note-title">Note</p>
		<p>
			<code>scrollToPath()</code> accepts scroll options like <code>behavior</code> and
			<code>block</code> for smooth scrolling and positioning, and returns a
			<code>Promise&lt;boolean&gt;</code> (false = no such node).
		</p>
	</div>
</div>

<!-- BU07 · Programmatic Expand / Collapse -->
<div class="card">
	<h2>BU07 · Programmatic Expand / Collapse</h2>
	<p class="description">
		Use <code>expandAll()</code>, <code>collapseAll()</code>, <code>expandNodes(path)</code>, and
		<code>collapseNodes(path)</code> to control the tree programmatically.
	</p>

	<div class="controls">
		<button onclick={() => expandCollapseTreeRef?.expandAll()}>Expand All</button>
		<button class="secondary" onclick={() => expandCollapseTreeRef?.collapseAll()}>Collapse All</button>
		<button onclick={() => expandCollapseTreeRef?.expandNodes('1')}>Expand "Documents" (1)</button>
		<button class="secondary" onclick={() => expandCollapseTreeRef?.collapseNodes('1')}>Collapse "Documents" (1)</button>
	</div>

	<div class="tree-container tree-container-tall">
		<Tree
			bind:this={expandCollapseTreeRef}
			nodes={sampleData}
			idMember="id"
			pathMember="path"
			displayValueMember="name"
			iconMember="icon"
			isSorted={true}
			expandLevel={1}
			{...getTreeProps()}
		/>
	</div>

	<div class="code-block" data-language="ts">
		<pre>{`// Get tree reference
let treeRef: Tree;

// Expand/collapse methods
treeRef.expandAll();
treeRef.collapseAll();
treeRef.expandNodes('1');      // Expand specific path
treeRef.collapseNodes('1');    // Collapse specific path`}</pre>
	</div>
</div>

<!-- BU08 · Array Variants -->
<div class="card">
	<h2>BU08 · Array Variants</h2>
	<p class="description">
		All four methods accept either a single path or an array of paths. The array form runs once
		and emits a single change notification — useful when you need to open or close several places
		in the tree at the same time.
	</p>

	<div class="controls">
		<button onclick={() => arrayTreeRef?.collapseAll()}>Reset (collapseAll)</button>
		<button onclick={() => arrayTreeRef?.expandNodes(['1.1.1', '3.1.2'])}>expandNodes(['1.1.1', '3.1.2'])</button>
		<button onclick={() => arrayTreeRef?.expandAll(['1', '3'])}>expandAll(['1', '3'])</button>
		<button onclick={() => arrayTreeRef?.collapseNodes(['1.1', '3.1'])}>collapseNodes(['1.1', '3.1'])</button>
		<button class="secondary" onclick={() => arrayTreeRef?.collapseAll(['1', '3'])}>collapseAll(['1', '3'])</button>
	</div>

	<div class="tree-container tree-container-tall">
		<Tree
			bind:this={arrayTreeRef}
			nodes={sampleData}
			idMember="id"
			pathMember="path"
			displayValueMember="name"
			iconMember="icon"
			isSorted={true}
			expandLevel={0}
			{...getTreeProps()}
		/>
	</div>

	<div class="code-block" data-language="ts">
		<pre>{`// Open multiple spines in one pass
tree.expandNodes(['1.1.1', '3.1.2']);

// Open entire subtrees
tree.expandAll(['1', '3']);

// Close several endpoints (spine ancestors stay open)
tree.collapseNodes(['1.1', '3.1']);

// Close entire subtrees
tree.collapseAll(['1', '3']);`}</pre>
	</div>
</div>

<!-- BU09 · Exclusive Focus -->
<div class="card">
	<h2>BU09 · Exclusive Focus</h2>
	<p class="description">
		Pass <code>{`{ isExclusive: true }`}</code> to <code>expandNodes</code> or
		<code>expandAll</code> to open the target path <em>and</em> collapse everything currently
		open that isn't on its spine. Equivalent to <code>collapseAll() + expandNodes(path)</code> —
		but in a single pass with one emit, so listeners and CSS animations don't see the
		intermediate "all collapsed" state.
	</p>

	<div class="controls">
		<button onclick={() => focusTreeRef?.expandAll()}>Open everything (reset)</button>
		<button onclick={() => focusTreeRef?.expandNodes('1.1.1', { isExclusive: true })}>Focus on 1.1.1</button>
		<button onclick={() => focusTreeRef?.expandNodes(['1.1.1', '3.1.2'], { isExclusive: true })}>Focus on 1.1.1 + 3.1.2</button>
		<button onclick={() => focusTreeRef?.expandAll('1', { isExclusive: true })}>Focus on whole "Documents" subtree</button>
		<button onclick={() => focusTreeRef?.expandAll('3.1', { isExclusive: true })}>Focus on "Web App" subtree</button>
	</div>

	<div class="tree-container tree-container-tall">
		<Tree
			bind:this={focusTreeRef}
			nodes={sampleData}
			idMember="id"
			pathMember="path"
			displayValueMember="name"
			iconMember="icon"
			isSorted={true}
			expandLevel={3}
			{...getTreeProps()}
		/>
	</div>

	<div class="code-block" data-language="ts">
		<pre>{`// "Focus" — open this path, close everything else. Single emit.
tree.expandNodes('1.1.1', { isExclusive: true });

// Multi-focus — union of spines stays open, rest collapses.
tree.expandNodes(['1.1.1', '3.1.2'], { isExclusive: true });

// "Focus on whole subtree" — opens the spine to the target AND its
// full subtree; collapses everything outside.
tree.expandAll('1', { isExclusive: true });`}</pre>
	</div>

	<div class="note">
		<p class="note-title">When to use isExclusive</p>
		<p>
			Best for "spotlight" or "drill-in" UX where you want a single branch in focus. Without
			<code>isExclusive</code>, doing the same thing with <code>collapseAll()</code> followed by
			<code>expandNodes(path)</code> works, but emits twice — downstream listeners (transition
			animations, sync to a URL, virtualized renderers) see the intermediate fully-collapsed
			state. <code>isExclusive: true</code> walks only currently-expanded nodes (cheap) and
			emits once.
		</p>
	</div>
</div>

<!-- BU10 · Expand / Collapse API -->
<div class="card">
	<h2>BU10 · Expand / Collapse API</h2>
	<div class="code-block" data-language="ts">
		<pre>{`interface ExpandOptions { isExclusive?: boolean; isSilent?: boolean }

expandNodes(paths: string | string[], options?: ExpandOptions)   // one level, ancestors opened
collapseNodes(paths: string | string[], options?: ExpandOptions): Promise<void>
toggleNodeExpanded(path: string, options?: ExpandOptions)

expandAll(paths?: string | string[] | null, options?: ExpandOptions)   // null = whole tree,
collapseAll(paths?: string | string[] | null, options?: ExpandOptions): Promise<void> // paths = those + descendants

// collapseNodes / collapseAll return Promise<void>: it settles after the hidden rows
// animated out and the collapse applied (BU11)`}</pre>
	</div>
	<p class="description">
		<code>isSilent: true</code> suppresses the callbacks (<code>onNodeExpand</code>,
		<code>onNodeCollapse</code>, <code>onExpandedChange</code>) only — the tree always re-renders.
	</p>
</div>

<!-- BU11 · Row Animation -->
<div class="card">
	<h2>BU11 · Row Animation</h2>
	<p class="description">
		Rows an expand reveals fade and slide in; rows a collapse hides shrink and fade out, then the
		node really collapses. It is on by default and part of <code>motion</code>: the
		<code>motion</code> prop, a <code>data-motion</code> section, the page-wide
		<code>window.components.motion</code> or the OS reduced-motion setting turn it off
		together with every other animation. There is no on/off prop — to turn off just the rows,
		set <code>--stv-row-animation-duration: 0s</code>.
	</p>

	<div class="controls">
		<label>Duration (<code>--stv-row-animation-duration</code>)
			<select id="ra-speed" bind:value={rowSpeed}>
				<option value="normal">--stv-transition-normal (default)</option>
				<option value="slow">--stv-transition-slow</option>
				<option value="off">0s (rows off)</option>
			</select>
		</label>
		<label>
			<input type="checkbox" id="ra-fade" bind:checked={isPlainFade} />
			Plain fade (<code>--stv-row-animation-distance: 0</code>)
		</label>
		<label><code>maxAnimatedRowCount</code>
			<select id="ra-limit" bind:value={rowLimit}>
				<option value={50}>50 (default)</option>
				<option value={5}>5</option>
				<option value={0}>0 (none)</option>
			</select>
		</label>
		<label><code>motion</code>
			<select id="ra-motion" bind:value={rowMotion}>
				{#each ['auto', 'smooth', 'snappy', 'none'] as level (level)}<option value={level}>{level}</option>{/each}
			</select>
		</label>
	</div>
	<div class="controls">
		<button onclick={() => rowTreeRef?.expandAll()}>Expand all</button>
		<button class="btn-outline" onclick={collapseRowTree}>await collapseAll()</button>
		<button onclick={() => rowTreeRef?.expandNodes('1')}>Expand "Documents" (1)</button>
		<button class="btn-outline" onclick={() => rowTreeRef?.collapseNodes('1')}>Collapse "Documents" (1)</button>
	</div>

	<div class="tree-container" bind:this={rowTreeWrap}>
		<Tree
			bind:this={rowTreeRef}
			nodes={sampleData}
			idMember="id"
			pathMember="path"
			displayValueMember="name"
			iconMember="icon"
			isSorted={true}
			expandLevel={1}
			maxAnimatedRowCount={rowLimit}
			motion={rowMotion}
			{...getTreeProps()}
		/>
	</div>
	<p class="form-text mt-1" id="tree-ra-status">{rowStatus}</p>

	<div class="code-block" data-language="css">
		<pre>{`/* Rows only — everything else keeps animating */
.my-tree .stv__container { --stv-row-animation-duration: 0s; }

/* Slower rows, plain fade (no slide) */
.my-tree .stv__container {
  --stv-row-animation-duration: var(--stv-transition-slow);
  --stv-row-animation-distance: 0;
}`}</pre>
	</div>
	<div class="code-block" data-language="svelte">
		<pre>{`<!-- motion="none" (or window.components.motion = 'none') = no animation at all -->
<Tree {nodes} motion="none" ... />

<!-- At most 5 rows animate per expand / collapse; the rest appear / go at once -->
<Tree {nodes} maxAnimatedRowCount={5} ... />`}</pre>
	</div>
	<div class="code-block" data-language="ts">
		<pre>{`// The collapse applies after the rows animated out — await it before reading state
await tree.collapseAll();
await tree.collapseNodes('1');`}</pre>
	</div>

	<p class="form-text mt-1">
		Only expands and collapses animate &mdash; never the first render, a reload, a filter or a
		re-render. Toggling a node again while its rows are animating out cancels the collapse (it stays
		open). <code>maxAnimatedRowCount</code> is a performance cap: expanding a node with thousands
		of children animates just the first rows.
	</p>
</div>

<!-- BU12 · Large Dataset with Progressive Rendering -->
<div class="card">
	<h2>BU12 · Large Dataset with Progressive Rendering</h2>
	<p class="description">
		A tree with 1000+ nodes demonstrating progressive rendering
		(<code>isProgressiveRenderEnabled</code>). Nodes are rendered in batches to keep the UI
		responsive.
	</p>

	<div class="controls">
		<button onclick={() => loadLarge(1000)}>Load 1,000 nodes</button>
		<button onclick={() => loadLarge(5000)}>Load 5,000 nodes</button>
		<button class="secondary" onclick={clearLarge}>Clear</button>
	</div>

	<div class="tree-container tree-container-lg">
		<Tree
			bind:this={largeTreeRef}
			nodes={largeData}
			idMember="id"
			pathMember="path"
			displayValueMember="name"
			isSorted={true}
			{...getTreeProps()}
			isProgressiveRenderEnabled
		/>
	</div>

	<div class="output">
		<p class="output-label">Render stats:</p>
		<pre id="tree3-output">{largeOutput}</pre>
	</div>
</div>

<!-- BU13 · Page-wide labels -->
<div class="card">
	<h2>BU13 · Page-wide labels &mdash; <code>window.components.locale</code></h2>
	<p class="description">
		Every UI string goes through core <code>/locale</code>: the instance <code>labels</code> win,
		then the page-wide flat dictionary
		<code>window.components.locale.labels['svelte-treeview.&lt;key&gt;']</code>, then English.
		Assigning the page object re-renders every live tree &mdash; texts only, expansion and selection
		are kept. Right-click a node for the built-in menu items, drag a node over another for the
		floating drop pads (<code>labels.dropBefore</code> / <code>labels.dropAfter</code> /
		<code>labels.dropChild</code>); the empty tree in the middle keeps its own
		<code>messages.noData</code>.
	</p>

	<div class="controls">
		<label><input type="radio" name="loc-lang" value="en" bind:group={localeLang} /> English (unset)</label>
		<label><input type="radio" name="loc-lang" value="cs" bind:group={localeLang} /> Czech, page-wide</label>
	</div>

	<div class="tree-container">
		<Tree
			nodes={sampleData}
			idMember="id"
			pathMember="path"
			displayValueMember="name"
			iconMember="icon"
			isSorted={true}
			expandLevel={1}
			dragDropMode="self"
			dropZoneMode="floating"
			getContextMenuItemsCallback={() => ['copy', 'cut', 'paste', 'delete', 'expand-all', 'collapse-all']}
			{...getTreeProps()}
		/>
	</div>
	<div class="tree-container mt-1">
		<Tree nodes={[]} idMember="id" pathMember="path" labels={{ 'messages.noData': 'My own empty text' }} {...getTreeProps()} />
	</div>
	<div class="tree-container mt-1">
		<Tree nodes={[]} idMember="id" pathMember="path" {...getTreeProps()} />
	</div>

	<div class="code-block" data-language="js">
		<pre>{`window.components.locale = {
  labels: {
    'svelte-treeview.messages.noData': 'Žádná data',
    'svelte-treeview.menuItems.copy': 'Kopírovat', 'svelte-treeview.menuItems.cut': 'Vyjmout',
    'svelte-treeview.menuItems.paste': 'Vložit', 'svelte-treeview.menuItems.delete': 'Smazat',
    'svelte-treeview.labels.dropBefore': 'Před', 'svelte-treeview.labels.dropAfter': 'Za', 'svelte-treeview.labels.dropChild': 'Dovnitř',
  },
  // optional: i18next / ICU for every label (key = the full key, 'svelte-treeview.menuItems.copy')
  // translateCallback: ({ key, params }) => i18next.t(key, { ...params, count: params.ctx?.count }),
};
window.components.locale = null;   // back to English`}</pre>
	</div>
</div>
