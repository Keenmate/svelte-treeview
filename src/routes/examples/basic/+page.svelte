<script lang="ts">
	import { tick } from 'svelte';
	import Tree from '$lib/components/Tree.svelte';
	import type { LTreeNode } from '$lib/ltree/types.js';
	import type { NodeRef } from '$lib/index.js';
	import RenderModeSwitch from '../RenderModeSwitch.svelte';
	import { getTreeProps } from '../render-mode.svelte.js';

	type Item = { id: number; path: string; name: string; icon: string };

	// One dataset drives every section on this page.
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

	// State for demos
	let expandLevel = $state(2);
	let isAccordionExpand = $state(false);
	let selectedNode = $state<LTreeNode<Item> | null>(null);
	let scrollPath = $state('1.2.1');
	let scrollTreeRef: Tree<Item>;
	let expandCollapseTreeRef: Tree<Item>;
	let arrayTreeRef: Tree<Item>;
	let focusTreeRef: Tree<Item>;
	let clickedNode = $state<string | null>(null);

	// Display demo: three sliders drive the CSS knobs that compose a row's left
	// offset. --stv-node-indent-per-level is the per-level indent; --stv-toggle-icon-width
	// is the toggle gutter reserved on every row; --stv-node-content-padding's horizontal
	// part is the content's left pad. All three are declared ON .stv__container (the tree
	// root), so a value on an ancestor wrapper is shadowed — we set them inline on the
	// container element itself (inline wins over the stylesheet declaration). Presets just
	// snap all three sliders at once.
	type Preset = 'condensed' | 'compact' | 'generous';
	type DisplayVars = { indent: number; toggle: number; pad: number };
	const presets: Record<Preset, DisplayVars> = {
		condensed: { indent: 4, toggle: 14, pad: 2 },
		compact: { indent: 8, toggle: 17, pad: 4 },
		generous: { indent: 18, toggle: 24, pad: 8 }
	};
	let activePreset = $state<Preset | null>('compact');

	let indent = $state(presets.compact.indent);
	let toggleWidth = $state(presets.compact.toggle);
	let padLeft = $state(presets.compact.pad);

	let simpleTreeWrap = $state<HTMLDivElement | null>(null);
	let cssReadout = $state<{ name: string; value: string; isGap?: boolean }[]>([]);

	function applyPreset(name: Preset) {
		activePreset = name;
		indent = presets[name].indent;
		toggleWidth = presets[name].toggle;
		padLeft = presets[name].pad;
	}

	// Push the slider values onto the real .stv__container (the vars are declared
	// there, so inline-on-container wins) then refresh the measured readout.
	function applyVars(retries = 10) {
		const container = simpleTreeWrap?.querySelector('.stv__container') as HTMLElement | null;
		if (!container) {
			if (retries > 0) requestAnimationFrame(() => applyVars(retries - 1));
			return;
		}
		container.style.setProperty('--stv-node-indent-per-level', `${indent}px`);
		container.style.setProperty('--stv-toggle-icon-width', `${toggleWidth}px`);
		// Only the horizontal (left/right) part — keep the vertical pad at its default.
		container.style.setProperty('--stv-node-content-padding', `calc(0.4 * var(--stv-rem)) ${padLeft}px`);
		measureSpacing();
	}

	// Read the *resolved px* off the real tree elements so the readout reflects what
	// actually rendered. The root gap (toggle width + its right margin + the content's
	// left pad) is the fixed part of a row's offset; only the per-level indent scales.
	function measureSpacing(retries = 10) {
		const container = simpleTreeWrap?.querySelector('.stv__container');
		const toggle = container?.querySelector('.stv__toggle-icon') as HTMLElement | null;
		const content = container?.querySelector('.stv__node-content') as HTMLElement | null;
		if (!container || !toggle || !content) {
			// Tree nodes may not be in the DOM yet on first paint — retry briefly.
			if (retries > 0) requestAnimationFrame(() => measureSpacing(retries - 1));
			return;
		}

		const ts = getComputedStyle(toggle);
		const cs = getComputedStyle(content);
		const px = (v: number) => `${Math.round(v)}px`;

		// Per-level indent = difference in margin-left between a level-1 and level-2 node.
		const n1 = container.querySelector('.stv__node[data-tree-path="1"]') as HTMLElement | null;
		const n2 = container.querySelector('.stv__node[data-tree-path="1.1"]') as HTMLElement | null;
		const indentPx =
			n1 && n2
				? parseFloat(getComputedStyle(n2).marginLeft) - parseFloat(getComputedStyle(n1).marginLeft)
				: indent;
		const colW = parseFloat(ts.width);
		const marginR = parseFloat(ts.marginRight);
		const padL = parseFloat(cs.paddingLeft);

		cssReadout = [
			{ name: '--stv-node-indent-per-level', value: px(indentPx) },
			{ name: '--stv-toggle-icon-width', value: px(colW) },
			{ name: '--stv-node-content-padding (left)', value: px(padL) },
			{ name: 'root gap (toggle + margin + pad)', value: px(colW + marginR + padL), isGap: true }
		];
	}

	$effect(() => {
		indent; toggleWidth; padLeft; // re-apply + re-measure when any slider changes
		tick().then(() => applyVars());
	});

	function sortByName(items: LTreeNode<Item>[]) {
		return [...items].sort((a, b) => (a.data?.name || '').localeCompare(b.data?.name || ''));
	}

	function sortByPath(items: LTreeNode<Item>[]) {
		return [...items].sort((a, b) => a.path.localeCompare(b.path));
	}

	function handleNodeClick({ node, path }: NodeRef<Item>) {
		clickedNode = `${node?.data?.name} (path: ${path})`;
	}

	function scrollToPath() {
		scrollTreeRef?.scrollToPath(scrollPath, { scrollOptions: { behavior: 'smooth', block: 'center' } });
	}
</script>

<svelte:head>
	<title>Basic Usage - Svelte Treeview</title>
</svelte:head>

<div class="container">
	<header class="example-header">
		<a href="/" class="back-link">&larr; Back to Examples</a>
		<h1>Basic Usage</h1>
		<p class="subtitle">
			The essentials — render a tree, control the initial expansion, scroll to a node, and drive
			expand/collapse programmatically (array + exclusive-focus variants).
		</p>
		<RenderModeSwitch />
	</header>

	<!-- Simple Tree -->
	<div class="card">
		<h2>BU01 · Simple Tree</h2>
		<p class="description">A basic tree with hierarchical data. Click nodes to select them.</p>

		<div class="controls">
			<span class="controls-label">Display:</span>
			<button
				class="btn {activePreset === 'condensed' ? '' : 'btn-secondary'}"
				onclick={() => applyPreset('condensed')}
			>Condensed</button>
			<button
				class="btn {activePreset === 'compact' ? '' : 'btn-secondary'}"
				onclick={() => applyPreset('compact')}
			>Compact</button>
			<button
				class="btn {activePreset === 'generous' ? '' : 'btn-secondary'}"
				onclick={() => applyPreset('generous')}
			>Generous</button>
		</div>

		<div class="display-sliders">
			<label for="sl-indent">--stv-node-indent-per-level</label>
			<input id="sl-indent" type="range" min="0" max="32" step="1"
				bind:value={indent} oninput={() => (activePreset = null)} />
			<output>{indent}px</output>

			<label for="sl-toggle">--stv-toggle-icon-width</label>
			<input id="sl-toggle" type="range" min="12" max="32" step="1"
				bind:value={toggleWidth} oninput={() => (activePreset = null)} />
			<output>{toggleWidth}px</output>

			<label for="sl-pad">--stv-node-content-padding (left)</label>
			<input id="sl-pad" type="range" min="0" max="16" step="1"
				bind:value={padLeft} oninput={() => (activePreset = null)} />
			<output>{padLeft}px</output>
		</div>

		<div class="css-readout">
			{#each cssReadout as v (v.name)}
				<code class:is-gap={v.isGap}><span class="css-readout-name">{v.name}</span>: <span class="css-readout-value">{v.value}</span></code>
			{/each}
		</div>

		<div class="tree-container tree-container-tall" bind:this={simpleTreeWrap}>
			<Tree
				data={sampleData}
				idMember="id"
				pathMember="path"
				sortCallback={sortByName}
				isSorted={true}
				expandLevel={2}
				bind:focusedNode={selectedNode}
				onNodeClick={handleNodeClick}
				{...getTreeProps()}
			>
				{#snippet nodeTemplate(node: any)}
					<!-- "Work" (1.1) and "Reports" (1.1.1) intentionally have no icon to show label alignment for icon-less nodes -->
					<span>{#if node.path !== '1.1' && node.path !== '1.1.1'}{node.data?.icon} {/if}{node.data?.name}</span>
				{/snippet}
			</Tree>
		</div>

		<div class="note">
			<p class="note-title">What makes a row's left offset</p>
			<p>
				A row sits in by <strong>toggle gutter + toggle margin + content left-pad + level × indent</strong>.
				Three CSS variables control the fixed part and the per-level step — there are no props for
				them. They're declared <em>on</em> the tree's root element (<code>.stv__container</code>), so a
				value must be set there too; a value on an ancestor wrapper is shadowed by the tree's own
				declaration. The sliders above write them inline on the container (inline wins); the readout
				shows the resolved px and the derived <em>root gap</em> (the fixed part, independent of indent).
			</p>
			<div class="code-block">
				<pre>{`/* one instance — scope by a wrapper class */
.my-tree .stv__container {
  --stv-node-indent-per-level: ${indent}px;
  --stv-toggle-icon-width: ${toggleWidth}px;
  --stv-node-content-padding: calc(0.4 * var(--stv-rem)) ${padLeft}px;
}`}</pre>
			</div>
		</div>

		{#if selectedNode}
			<div class="output">
				<p class="output-label">Selected Node:</p>
				<pre>{JSON.stringify({ path: selectedNode.path, name: selectedNode.data?.name }, null, 2)}</pre>
			</div>
		{/if}

		{#if clickedNode}
			<div class="output">
				<p class="output-label">Last Clicked:</p>
				<pre>{clickedNode}</pre>
			</div>
		{/if}
	</div>

	<!-- Expand Level -->
	<div class="card">
		<h2>BU02 · Expand Level</h2>
		<p class="description">Control how many levels are expanded by default using the <code>expandLevel</code> prop. Enable <code>isAccordionExpand</code> to auto-collapse siblings when a node is expanded.</p>

		<div class="controls">
			<label>
				Expand Level:
				<input type="number" bind:value={expandLevel} min="0" max="5" style="width: 60px" />
			</label>
			<label>
				<input type="checkbox" bind:checked={isAccordionExpand} />
				Accordion Expand
			</label>
		</div>

		<div class="tree-container">
			{#key expandLevel}
				<Tree
					data={sampleData}
					idMember="id"
					pathMember="path"
					sortCallback={sortByName}
					isSorted={true}
					{expandLevel}
					{isAccordionExpand}
					{...getTreeProps()}
				>
					{#snippet nodeTemplate(node: any)}
						<span>{node.data?.icon} {node.data?.name} <code style="font-size: 0.8em; color: #718096;">({node.path})</code></span>
					{/snippet}
				</Tree>
			{/key}
		</div>

		<div class="code-block">
			<pre>{`<Tree
  data={sampleData}
  idMember="id"
  pathMember="path"
  sortCallback={sortByName}
  expandLevel={${expandLevel}}
  isAccordionExpand={${isAccordionExpand}}
/>`}</pre>
		</div>
	</div>

	<!-- Scroll to Path -->
	<div class="card">
		<h2>BU03 · Scroll to Path</h2>
		<p class="description">Use <code>scrollToPath()</code> to programmatically scroll to and highlight a specific node. Enter a path from the tree below.</p>

		<div class="controls">
			<input type="text" bind:value={scrollPath} placeholder="Enter path (e.g., 1.2.1)" />
			<button class="btn" onclick={scrollToPath}>Scroll to Path</button>
		</div>

		<div class="tree-container tree-container-tall">
			<Tree
				bind:this={scrollTreeRef}
				data={sampleData}
				idMember="id"
				pathMember="path"
				sortCallback={sortByName}
				isSorted={true}
				expandLevel={3}
				{...getTreeProps()}
			>
				{#snippet nodeTemplate(node: any)}
					<span>{node.data?.icon} {node.data?.name} <code style="font-size: 0.8em; color: #718096;">({node.path})</code></span>
				{/snippet}
			</Tree>
		</div>

		<div class="note">
			<p class="note-title">Note</p>
			<p>The <code>scrollToPath()</code> method accepts scroll options like <code>behavior</code> and <code>block</code> for smooth scrolling and positioning.</p>
		</div>
	</div>

	<!-- Programmatic Expand/Collapse -->
	<div class="card">
		<h2>BU04 · Programmatic Expand / Collapse</h2>
		<p class="description">Use <code>expandAll()</code>, <code>collapseAll()</code>, <code>expandNodes(path)</code>, and <code>collapseNodes(path)</code> to control the tree programmatically.</p>

		<div class="controls">
			<button class="btn" onclick={() => expandCollapseTreeRef?.expandAll()}>Expand All</button>
			<button class="btn btn-secondary" onclick={() => expandCollapseTreeRef?.collapseAll()}>Collapse All</button>
			<button class="btn" onclick={() => expandCollapseTreeRef?.expandNodes('1')}>Expand "Documents" (1)</button>
			<button class="btn btn-secondary" onclick={() => expandCollapseTreeRef?.collapseNodes('1')}>Collapse "Documents" (1)</button>
		</div>

		<div class="tree-container tree-container-tall">
			<Tree
				bind:this={expandCollapseTreeRef}
				data={sampleData}
				idMember="id"
				pathMember="path"
				sortCallback={sortByName}
				isSorted={true}
				expandLevel={1}
				{...getTreeProps()}
			>
				{#snippet nodeTemplate(node: any)}
					<span>{node.data?.icon} {node.data?.name} <code style="font-size: 0.8em; color: #718096;">({node.path})</code></span>
				{/snippet}
			</Tree>
		</div>

		<div class="code-block">
			<pre>{`// Get tree reference
let treeRef: Tree;

// Expand/collapse methods
treeRef.expandAll();
treeRef.collapseAll();
treeRef.expandNodes('1');      // Expand specific path
treeRef.collapseNodes('1');    // Collapse specific path`}</pre>
		</div>
	</div>

	<!-- Array variants -->
	<div class="card">
		<h2>BU05 · Array Variants</h2>
		<p class="description">
			All four methods accept either a single path or an array of paths. The array form runs once
			and emits a single change notification — useful when you need to open or close several places
			in the tree at the same time.
		</p>

		<div class="controls">
			<button class="btn" onclick={() => arrayTreeRef?.collapseAll()}>Reset (collapseAll)</button>
			<button
				class="btn"
				onclick={() => arrayTreeRef?.expandNodes(['1.1.1', '3.1.2'])}
			>
				expandNodes(['1.1.1', '3.1.2'])
			</button>
			<button class="btn" onclick={() => arrayTreeRef?.expandAll(['1', '3'])}>
				expandAll(['1', '3'])
			</button>
			<button class="btn" onclick={() => arrayTreeRef?.collapseNodes(['1.1', '3.1'])}>
				collapseNodes(['1.1', '3.1'])
			</button>
			<button class="btn btn-secondary" onclick={() => arrayTreeRef?.collapseAll(['1', '3'])}>
				collapseAll(['1', '3'])
			</button>
		</div>

		<div class="tree-container tree-container-tall">
			<Tree
				bind:this={arrayTreeRef}
				data={sampleData}
				idMember="id"
				pathMember="path"
				sortCallback={sortByPath}
				isSorted={true}
				expandLevel={0}
				{...getTreeProps()}
			>
				{#snippet nodeTemplate(node: LTreeNode<Item>)}
					<span>{node.data?.icon} {node.data?.name}</span>
				{/snippet}
			</Tree>
		</div>

		<div class="code-block">
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

	<!-- Exclusive focus -->
	<div class="card">
		<h2>BU06 · Exclusive Focus</h2>
		<p class="description">
			Pass <code>{`{ exclusive: true }`}</code> to <code>expandNodes</code> or
			<code>expandAll</code> to open the target path <em>and</em> collapse everything currently
			open that isn't on its spine. Equivalent to <code>collapseAll() + expandNodes(path)</code> —
			but in a single pass with one emit, so listeners and CSS animations don't see the
			intermediate "all collapsed" state.
		</p>

		<div class="controls">
			<button class="btn" onclick={() => focusTreeRef?.expandAll()}>Open everything (reset)</button>
			<button
				class="btn"
				onclick={() => focusTreeRef?.expandNodes('1.1.1', { exclusive: true })}
			>
				Focus on 1.1.1
			</button>
			<button
				class="btn"
				onclick={() => focusTreeRef?.expandNodes(['1.1.1', '3.1.2'], { exclusive: true })}
			>
				Focus on 1.1.1 + 3.1.2
			</button>
			<button
				class="btn"
				onclick={() => focusTreeRef?.expandAll('1', { exclusive: true })}
			>
				Focus on whole "Documents" subtree
			</button>
			<button
				class="btn"
				onclick={() => focusTreeRef?.expandAll('3.1', { exclusive: true })}
			>
				Focus on "Web App" subtree
			</button>
		</div>

		<div class="tree-container tree-container-tall">
			<Tree
				bind:this={focusTreeRef}
				data={sampleData}
				idMember="id"
				pathMember="path"
				sortCallback={sortByPath}
				isSorted={true}
				expandLevel={3}
				{...getTreeProps()}
			>
				{#snippet nodeTemplate(node: LTreeNode<Item>)}
					<span>{node.data?.icon} {node.data?.name}</span>
				{/snippet}
			</Tree>
		</div>

		<div class="code-block">
			<pre>{`// "Focus" — open this path, close everything else. Single emit.
tree.expandNodes('1.1.1', { exclusive: true });

// Multi-focus — union of spines stays open, rest collapses.
tree.expandNodes(['1.1.1', '3.1.2'], { exclusive: true });

// "Focus on whole subtree" — opens the spine to the target AND its
// full subtree; collapses everything outside.
tree.expandAll('1', { exclusive: true });`}</pre>
		</div>

		<div class="note">
			<p class="note-title">When to use exclusive</p>
			<p>
				Best for "spotlight" or "drill-in" UX where you want a single branch in focus. Without
				<code>exclusive</code>, doing the same thing with <code>collapseAll()</code> followed by
				<code>expandNodes(path)</code> works, but emits twice — downstream listeners (transition
				animations, sync to a URL, virtualized renderers) see the intermediate fully-collapsed
				state. <code>exclusive: true</code> walks only currently-expanded nodes (cheap) and
				emits once.
			</p>
		</div>
	</div>

	<!-- Expand / Collapse API -->
	<div class="card">
		<h2>BU07 · Expand / Collapse API</h2>
		<div class="code-block">
			<pre>{`expandNodes(path: string | string[], options?: { exclusive?: boolean; noEmit?: boolean })
collapseNodes(path: string | string[], options?: { noEmit?: boolean })

expandAll(nodePath?: string | string[] | null, options?: { exclusive?: boolean; noEmit?: boolean })
collapseAll(nodePath?: string | string[] | null, options?: { noEmit?: boolean })`}</pre>
		</div>
		<p class="description">
			<code>noEmit: true</code> suppresses the change notification — handy when you want to batch
			several calls and emit once at the end via <code>tree.refresh()</code>.
		</p>
	</div>

	<footer>
		<p><a href="/">&larr; Back to Examples</a></p>
	</footer>
</div>
