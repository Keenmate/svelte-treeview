<script lang="ts">
	import Tree from '$lib/components/Tree.svelte';
	import type { LTreeNode } from '$lib/ltree/types.js';
	import type {
		ClickBehavior,
		CheckboxMode,
		CascadeCheckPolicy,
		SelectionMode
	} from '$lib/ltree/types.js';
	import type { NodeRef } from '$lib/index.js';
	import RenderModeSwitch from '../RenderModeSwitch.svelte';
	import { getTreeProps } from '../render-mode.svelte.js';
	import LogPanel, { logLine, type LogEntry } from '../../LogPanel.svelte';

	const STORAGE_KEY = 'svelte-treeview-interaction-settings';

	// Sample hierarchical data
	const sampleData = [
		{ id: 1, path: '1', name: 'Documents', icon: '📁' },
		{ id: 2, path: '1.1', name: 'Work', icon: '💼' },
		{ id: 3, path: '1.1.1', name: 'Reports', icon: '📊' },
		{ id: 4, path: '1.1.2', name: 'Presentations', icon: '📽️' },
		{ id: 5, path: '1.1.3', name: 'Spreadsheets', icon: '📈' },
		{ id: 50, path: '1.1.4', name: 'Invoices', icon: '🧾' },
		{ id: 51, path: '1.1.5', name: 'Contracts', icon: '📜' },
		{ id: 52, path: '1.1.6', name: 'Budgets', icon: '💰' },
		{ id: 53, path: '1.1.7', name: 'Meeting Notes', icon: '📝' },
		{ id: 54, path: '1.1.8', name: 'Templates', icon: '📄' },
		{ id: 6, path: '1.2', name: 'Personal', icon: '🏠' },
		{ id: 7, path: '1.2.1', name: 'Photos', icon: '📷' },
		{ id: 8, path: '1.2.2', name: 'Music', icon: '🎵' },
		{ id: 9, path: '1.2.3', name: 'Videos', icon: '🎬' },
		{ id: 55, path: '1.2.4', name: 'Recipes', icon: '🍳' },
		{ id: 56, path: '1.2.5', name: 'Travel', icon: '✈️' },
		{ id: 57, path: '1.2.6', name: 'Fitness', icon: '🏋️' },
		{ id: 58, path: '1.2.7', name: 'Books', icon: '📚' },
		{ id: 10, path: '2', name: 'Downloads', icon: '⬇️' },
		{ id: 11, path: '2.1', name: 'Software', icon: '💿' },
		{ id: 12, path: '2.2', name: 'Media', icon: '🎞️' },
		{ id: 13, path: '2.3', name: 'Archives', icon: '📦' },
		{ id: 60, path: '2.4', name: 'Documents', icon: '📃' },
		{ id: 61, path: '2.5', name: 'Images', icon: '🖼️' },
		{ id: 62, path: '2.6', name: 'Fonts', icon: '🔤' },
		{ id: 63, path: '2.7', name: 'Plugins', icon: '🔌' },
		{ id: 64, path: '2.8', name: 'Drivers', icon: '🖨️' },
		{ id: 14, path: '3', name: 'Projects', icon: '🚀' },
		{ id: 15, path: '3.1', name: 'Web App', icon: '🌐' },
		{ id: 16, path: '3.1.1', name: 'Frontend', icon: '🎨' },
		{ id: 17, path: '3.1.2', name: 'Backend', icon: '⚙️' },
		{ id: 18, path: '3.1.3', name: 'Tests', icon: '🧪' },
		{ id: 70, path: '3.1.4', name: 'DevOps', icon: '🔧' },
		{ id: 71, path: '3.1.5', name: 'Docs', icon: '📖' },
		{ id: 19, path: '3.2', name: 'Mobile App', icon: '📱' },
		{ id: 20, path: '3.2.1', name: 'iOS', icon: '🍎' },
		{ id: 21, path: '3.2.2', name: 'Android', icon: '🤖' },
		{ id: 72, path: '3.2.3', name: 'Flutter', icon: '🦋' },
		{ id: 73, path: '3.2.4', name: 'React Native', icon: '⚛️' },
		{ id: 74, path: '3.3', name: 'CLI Tools', icon: '⌨️' },
		{ id: 75, path: '3.3.1', name: 'Linter', icon: '🔍' },
		{ id: 76, path: '3.3.2', name: 'Formatter', icon: '✨' },
		{ id: 77, path: '3.3.3', name: 'Bundler', icon: '📦' },
		{ id: 78, path: '3.3.4', name: 'Compiler', icon: '🏗️' }
	];

	type Item = (typeof sampleData)[0];

	function sortByName({ nodes: items }: { nodes: LTreeNode<Item>[] }) {
		return [...items].sort((a, b) => (a.data?.name || '').localeCompare(b.data?.name || ''));
	}

	// ── Persisted settings ───────────────────────────────────────────
	interface Settings {
		clickBehavior: ClickBehavior;
		selectionMode: SelectionMode;
		selectedNodeClass: string;
		focusedNodeClass: string;
		isCheckboxesShown: boolean;
		checkboxMode: CheckboxMode;
		shouldClickToggleCheckbox: boolean;
		rangeSelectionMode: 'visual' | 'logical';
	}

	const defaultSettings: Settings = {
		clickBehavior: 'expand-and-focus',
		// Default this demo to multi so Ctrl/Shift+click work out of the box —
		// the library default is 'single'.
		selectionMode: 'multiple',
		// Empty → the built-in defaults show (soft background tint for selection,
		// an inset left accent bar for focus). Pick a style below to swap them out.
		selectedNodeClass: '',
		focusedNodeClass: '',
		isCheckboxesShown: false,
		checkboxMode: 'independent',
		shouldClickToggleCheckbox: false,
		rangeSelectionMode: 'visual'
	};

	function loadSettings(): Settings {
		try {
			const raw = localStorage?.getItem(STORAGE_KEY);
			if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
		} catch {}
		return { ...defaultSettings };
	}

	const saved = loadSettings();

	function saveSettings() {
		try {
			localStorage?.setItem(
				STORAGE_KEY,
				JSON.stringify({
					clickBehavior,
					selectionMode,
					selectedNodeClass,
					focusedNodeClass,
					isCheckboxesShown,
					checkboxMode,
					shouldClickToggleCheckbox,
					rangeSelectionMode
				})
			);
		} catch {}
	}

	const selectedNodeClassOptions = [
		{ value: '', label: 'Default (soft tint)' },
		{ value: 'stv__node-content--selected-bold', label: 'Bold' },
		{ value: 'stv__node-content--selected-border', label: 'Border' },
		{ value: 'stv__node-content--selected-brackets', label: 'Brackets' },
		{ value: 'stv__node-content--selected-fill', label: 'Highlight (Explorer-style)' },
		{ value: 'stv__node-content--selected-glow', label: 'Glow (soft ring)' }
	];

	// Empty ('') = the built-in default focus look (a thin inset ring). The
	// rest are page-scoped demo classes (see the style block below) you'd define
	// yourself and pass via focusedNodeClass to override the default.
	const focusedNodeClassOptions = [
		{ value: '', label: 'Default (ring)' },
		{ value: 'demo-focused-underline', label: 'Underline' },
		{ value: 'demo-focused-bg', label: 'Background tint' },
		{ value: 'demo-focused-bar', label: 'Left bar' },
		{ value: 'demo-focus-none', label: 'None' }
	];

	// ── Click Behavior demo ──────────────────────────────────────────
	let clickBehavior = $state<ClickBehavior>(saved.clickBehavior);
	let selectionMode = $state<SelectionMode>(saved.selectionMode);
	let selectedNodeClass = $state(saved.selectedNodeClass);
	let focusedNodeClass = $state(saved.focusedNodeClass);
	let isCheckboxesShown = $state(saved.isCheckboxesShown);
	let checkboxMode = $state<CheckboxMode>(saved.checkboxMode);
	let shouldClickToggleCheckbox = $state(saved.shouldClickToggleCheckbox);

	// Three-level state
	let clickTreeRef: Tree<Item>;
	let focusedNode1 = $state<LTreeNode<Item> | null>(null);
	let highlightedPaths1 = $state(new Set<string>());
	let selectedPaths1 = $state(new Set<string>());

	$effect(() => {
		clickBehavior;
		selectionMode;
		selectedNodeClass;
		focusedNodeClass;
		isCheckboxesShown;
		checkboxMode;
		shouldClickToggleCheckbox;
		rangeSelectionMode;
		saveSettings();
	});

	function onClickDemoNodeClick(_ctx: NodeRef<Item>) {}

	// ── Multi-select range mode (shared by the merged IN01 tree) ──────
	let rangeSelectionMode = $state<'visual' | 'logical'>(saved.rangeSelectionMode);

	// ── Cascade Checkboxes & Value Policy demo ───────────────────────
	// Two orthogonal knobs: checkboxMode controls how checking a branch BEHAVES;
	// cascadeCheckPolicy controls WHICH paths the selection EMITS (bind:checkedPaths).
	let policyCheckboxMode = $state<CheckboxMode>('cascade');
	let cascadeCheckPolicy = $state<CascadeCheckPolicy>('rolled-up');
	let policyChecked = $state(new Set<string>());

	// ── Keyboard navigation demo ─────────────────────────────────────
	let navFocusedNode = $state<LTreeNode<Item> | null>(null);
	let navLog = $state<LogEntry[]>([]);

	function onNavNodeClick({ node, path }: NodeRef<Item>) {
		navLog = [...navLog.slice(-49), logLine('Navigated', `${node?.data?.name} (${path})`)];
	}

	// ── Silent state restore demo ────────────────────────────────────
	// Imagine the user shares a URL like  /app?nodePath=1.2.3&detailId=42
	// On load the page parses the URL, fetches the detail record into the
	// form, and just needs the tree to scroll + highlight the matching node.
	// Firing onSelectionChange in that flow would re-trigger the form-load
	// listener and cause a loop or wipe the data the URL just supplied.
	let silentTreeRef: Tree<Item>;
	let silentSelectedPaths = $state(new Set<string>());

	// "Form data" — only updated by onSelectionChange so we can see when
	// it would have been clobbered.
	let formNotes = $state<string>('(form not loaded yet)');
	let selectionChangeFires = $state(0);

	function handleSelectionChange({ paths }: { paths: Set<string> }) {
		selectionChangeFires++;
		// In a real app this is the listener that would re-fetch & overwrite
		// form data based on the newly highlighted node.
		const last = [...paths].pop();
		if (last) formNotes = `Form reloaded for ${last} (overwrote any URL-loaded data)`;
	}

	// Simulated "load from URL" — picks a path + writes some form data, then
	// asks the tree to scroll + highlight either silently or noisily.
	let pathFromUrl = $state('1.2.3');
	let silentMode = $state(true);

	async function simulateUrlLoad() {
		// 1. The page loads form data based on the URL — this is the value
		//    we want to preserve.
		formNotes = `URL-loaded data for "${pathFromUrl}" — do not overwrite`;
		selectionChangeFires = 0;

		// 2. Mark the matching tree node so the user sees what's selected.
		silentTreeRef.selectNode(pathFromUrl, 'replace', { isSilent: silentMode });

		// 3. Scroll the tree into view. scrollToPath itself never fires
		//    selection callbacks, only the visual scroll-flash highlight.
		await silentTreeRef.scrollToPath(pathFromUrl, {
			shouldExpandAncestors: true,
			shouldHighlight: true,
			behavior: 'smooth', block: 'center'
		});
	}

	function silentReset() {
		silentSelectedPaths = new Set();
		formNotes = '(form not loaded yet)';
		selectionChangeFires = 0;
	}
</script>

<svelte:head>
	<title>Interaction - Svelte Treeview</title>
</svelte:head>

<header>
	<a href="/" class="back-link">&larr; Back to Examples</a>
	<h1>Interaction</h1>
	<p class="subtitle">
		Click behavior, checkboxes, multi-select, keyboard navigation, and silent state restore
	</p>
	<RenderModeSwitch />
</header>

<!-- Click Behavior & Multi-Select -->
<div class="card">
	<h2>IN01 · Click Behavior &amp; Multi-Select</h2>
	<p class="description">
		The <code>clickBehavior</code> prop controls what happens when you click a node;
		<code>selectionMode</code> decides whether Ctrl/Shift+click can extend the set. With
		<code>selectionMode="multiple"</code>, hold <kbd>Ctrl</kbd> (or <kbd>Cmd</kbd>) and click to toggle
		individual nodes, hold <kbd>Shift</kbd> and click to select a range, and
		<kbd>Shift+ArrowUp/Down</kbd> extends from the focused node. <code>rangeSelectionMode</code> controls
		whether a range includes collapsed children. Pick a <strong>Highlighted Style</strong> below and
		build up a set to see it on every row.
	</p>

	<div class="controls">
		<label>
			Click Behavior:
			<select bind:value={clickBehavior}>
				<option value="expand-and-focus">expand-and-focus (select + expand)</option>
				<option value="select">select (dbl-click to expand)</option>
				<option value="expand">expand (no selection)</option>
			</select>
		</label>
		<label>
			Selection Mode:
			<select bind:value={selectionMode}>
				<option value="single">single (Ctrl/Shift+click = plain click)</option>
				<option value="multiple">multiple (Ctrl-toggle, Shift-range, Shift+Arrow)</option>
			</select>
		</label>
		<label>
			Highlighted Style:
			<select bind:value={selectedNodeClass}>
				{#each selectedNodeClassOptions as opt}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>
		</label>
		<label>
			Focused Style:
			<select bind:value={focusedNodeClass}>
				{#each focusedNodeClassOptions as opt}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>
		</label>
		<label>
			<input type="checkbox" bind:checked={isCheckboxesShown} />
			Show Checkboxes
		</label>
		{#if isCheckboxesShown}
			<label>
				Checkbox Mode:
				<select bind:value={checkboxMode}>
					<option value="independent">independent (each checkbox standalone)</option>
					<option value="cascade">cascade (parent toggles all children)</option>
				</select>
			</label>
			<label>
				<input type="checkbox" bind:checked={shouldClickToggleCheckbox} />
				Click row toggles checkbox
			</label>
		{/if}
		<label>
			Range Selection Mode:
			<select bind:value={rangeSelectionMode}>
				<option value="visual">visual (only visible/expanded nodes)</option>
				<option value="logical">logical (all nodes in tree order)</option>
			</select>
		</label>
		<button
			onclick={() => {
				clickTreeRef?.clearSelection();
				clickTreeRef?.selectNodes(['1.1.1', '1.1.3', '1.2.1']);
			}}
			>Highlight 1.1.1, 1.1.3, 1.2.1</button
		>
		<button
			class="secondary"
			onclick={() => {
				clickTreeRef?.clearSelection();
				clickTreeRef?.uncheckAll();
				clickTreeRef?.clearFocus();
			}}>Clear All</button
		>
	</div>

	<div class="note">
		<p class="note-title">How the styles stack</p>
		<p>
			<strong>Highlighted Style</strong> applies to every row in <code>selectedPaths</code>.
			<strong>Focused Style</strong> is <em>additive</em> — it stacks on top of the highlight,
			only on the single row in <code>focusedNode</code>. After a plain click the same row is both
			highlighted and focused, so you'll see both styles on it. After a <kbd>Shift</kbd>+click
			range, the anchor and intermediate rows are highlighted only, while the row you clicked last
			is highlighted <em>and</em>
			focused. After <kbd>Ctrl</kbd>+click (or Arrow over an unselectable row) the focused row can
			have no highlight at all — that's when Focused Style alone shows.
		</p>
		<p>
			<strong>Visual vs logical range</strong> — in <strong>visual</strong> mode, Shift+click selects
			only the nodes you can see between the anchor and the clicked node. In <strong>logical</strong>
			mode it selects all nodes in depth-first order, including children inside collapsed parents.
		</p>
	</div>

	<div class="grid-2">
		<div class="tree-container tree-container-tall">
			<Tree
				bind:this={clickTreeRef}
				nodes={sampleData}
				idMember="id"
				pathMember="path"
				sortCallback={sortByName}
				isSorted={true}
				expandLevel={3}
				{selectedNodeClass}
				{focusedNodeClass}
				{clickBehavior}
				{selectionMode}
				{rangeSelectionMode}
				{isCheckboxesShown}
				{checkboxMode}
				{shouldClickToggleCheckbox}
				bind:focusedNode={focusedNode1}
				bind:selectedPaths={highlightedPaths1}
				bind:checkedPaths={selectedPaths1}
				onNodeClick={onClickDemoNodeClick}
				{...getTreeProps()}
			>
				{#snippet nodeTemplate(node: any)}
					<span>{node.data?.icon} <span class="demo-node-name">{node.data?.name}</span></span>
				{/snippet}
			</Tree>
		</div>
		<div>
			<div class="output">
				<p class="output-label">Focused Node</p>
				<pre>{focusedNode1
						? `${focusedNode1.data?.icon} ${focusedNode1.data?.name} (${focusedNode1.path})`
						: '(none)'}</pre>
			</div>
			<div class="output">
				<p class="output-label">Highlighted ({highlightedPaths1.size})</p>
				<pre>{highlightedPaths1.size > 0
						? [...highlightedPaths1].join(', ')
						: '(none — try Ctrl+click or Shift+click)'}</pre>
			</div>
			<div class="output">
				<p class="output-label">Selected / Checked ({selectedPaths1.size})</p>
				<pre>{selectedPaths1.size > 0
						? [...selectedPaths1].join(', ')
						: '(none — use checkboxes)'}</pre>
			</div>
		</div>
	</div>

	<div class="code-block">
		<pre>{`<Tree
  clickBehavior="${clickBehavior}"
  selectionMode="${selectionMode}"
  selectedNodeClass="${selectedNodeClass}"${focusedNodeClass ? `\n  focusedNodeClass="${focusedNodeClass}"` : ''}
  isCheckboxesShown={${isCheckboxesShown}}${isCheckboxesShown ? `\n  checkboxMode="${checkboxMode}"` : ''}${isCheckboxesShown && shouldClickToggleCheckbox ? `\n  shouldClickToggleCheckbox` : ''}
  ...
/>

<!-- clickBehavior options:
  'expand-and-focus' — click selects + expands (default)
  'select'           — click selects, double-click expands
  'expand'           — click expands only, no selection

<!-- selectionMode options:
  'single' — plain click only; Ctrl/Shift+click degrade to plain click (default)
  'multiple' — Ctrl-toggle, Shift-range, Shift+Arrow extends, Enter toggles

<!-- checkboxMode options:
  'independent' — each checkbox standalone (default)
  'cascade'     — parent toggles all descendants
-->`}</pre>
	</div>

	<div class="note">
		<p class="note-title">Adding your own highlight &amp; focus styles</p>
		<p>
			Both props take <em>any</em> class name. <strong>Glow</strong> (highlight) and
			<strong>Ring</strong> (focus) above are two recent additions: Glow is a built-in class
			shipped in <code>states.css</code>, while Ring is a page-scoped class this demo defines
			itself. The component ships no default focus styling, so a focus class is always your own —
			highlight classes can be either built-in or custom. Both work the same way: name a CSS
			class, make sure the rule is in scope (built-in, global, or a <code>:global()</code> rule), and
			pass it.
		</p>
	</div>

	<div class="code-block">
		<pre>{`<!-- 1. Built-in highlight (just reference it) -->
<Tree selectedNodeClass="stv__node-content--selected-glow" ... />

/* stv__node-content--selected-glow (from states.css) */
.stv__node-content--selected-glow {
  background-color: color-mix(in srgb, var(--stv-accent-color) 12%, transparent);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--stv-accent-color) 40%, transparent),
    0 0 8px 1px color-mix(in srgb, var(--stv-accent-color) 35%, transparent);
  border-radius: 6px;
}

<!-- 2. Custom focus style (define your own class, then pass it) -->
<Tree focusedNodeClass="my-focus-ring" ... />

/* Must be global so it reaches nodes rendered inside <Tree> */
:global(.my-focus-ring) {
  box-shadow: 0 0 0 2px var(--stv-accent-color, #0d6efd);
  border-radius: 4px;
}

<!-- Highlight applies to every row in selectedPaths.
     Focus is additive — it stacks on top, only on the focusedNode row. -->`}</pre>
	</div>
</div>

<!-- Keyboard Navigation -->
<div class="card">
	<h2>IN02 · Keyboard Navigation</h2>
	<p class="description">
		Click a node to focus the tree, then use arrow keys to navigate. The tree supports full
		keyboard control out of the box.
	</p>

	<div class="grid-2">
		<div class="tree-container tree-container-tall">
			<Tree
				nodes={sampleData}
				idMember="id"
				pathMember="path"
				sortCallback={sortByName}
				isSorted={true}
				expandLevel={2}
				{selectedNodeClass}
				{focusedNodeClass}
				bind:focusedNode={navFocusedNode}
				onNodeClick={onNavNodeClick}
				{...getTreeProps()}
			>
				{#snippet nodeTemplate(node: any)}
					<span>{node.data?.icon} {node.data?.name}</span>
				{/snippet}
			</Tree>
		</div>
		<div>
			<div class="output">
				<p class="output-label">Keyboard Shortcuts</p>
				<pre>&#8593; &#8595;    Navigate between siblings
&#8594;      Expand node / go to first child
&#8592;      Collapse node / go to parent
Enter  Toggle expand/collapse
Space  Toggle expand/collapse
Home   Go to first node
End    Go to last visible node
&#9003;   Collapse and go to parent</pre>
			</div>
			{#if navFocusedNode}
				<div class="output">
					<p class="output-label">Focused Node</p>
					<pre>{navFocusedNode.data?.icon} {navFocusedNode.data
							?.name} ({navFocusedNode.path})</pre>
				</div>
			{/if}
			<div class="output">
				<p class="output-label">Navigation Log</p>
				<LogPanel entries={navLog} empty="Click a node to log it" />
			</div>
		</div>
	</div>

	<div class="note">
		<p class="note-title">Custom Navigation</p>
		<p>
			You can override individual navigation methods via the <code>navigationOverrides</code>
			prop. This accepts a partial <code>TreeNavigationOverrides&lt;T&gt;</code> object — override
			only the methods you need, the rest fall back to the default implementation.
		</p>
	</div>

	<div class="code-block">
		<pre>{`<!-- Override specific navigation methods -->
<Tree
  navigationOverrides={{
    navInto: (node) => { /* custom expand behavior */ },
    navOut: (node) => { /* custom collapse behavior */ },
  }}
  ...
/>`}</pre>
	</div>
</div>

<!-- Cascade Checkboxes & Value Policy -->
<div class="card">
	<h2>IN03 · Cascade Checkboxes &amp; Value Policy</h2>
	<p class="description">
		Two orthogonal knobs. <code>checkboxMode</code> controls how checking a branch
		<em>behaves</em>; <code>cascadeCheckPolicy</code> controls which paths the selection
		<em>emits</em> (what <code>bind:checkedPaths</code> and <code>onCheckedChange</code> report).
		Flip them below on a single live tree and watch the emitted set change while the checkboxes stay
		put.
	</p>

	<div class="controls">
		<label>
			checkboxMode:
			<select bind:value={policyCheckboxMode}>
				<option value="independent">independent (each node standalone)</option>
				<option value="cascade">cascade (branch toggles its subtree)</option>
			</select>
		</label>
		<label>
			cascadeCheckPolicy:
			<select bind:value={cascadeCheckPolicy} disabled={policyCheckboxMode !== 'cascade'}>
				<option value="rolled-up">rolled-up (minimal cover)</option>
				<option value="leaves">leaves (only checked leaves)</option>
				<option value="all">all (every fully-checked node)</option>
			</select>
		</label>
		<button class="secondary" onclick={() => (policyChecked = new Set())}>Clear</button>
	</div>

	<div class="note">
		<p class="note-title">What each option does</p>
		<p>
			<code>checkboxMode="independent"</code> — each node toggles on its own; the policy is
			ignored and <code>checkedPaths</code> is exactly the set of checked nodes.<br />
			<code>checkboxMode="cascade"</code> — checking a branch checks its whole subtree; a partial
			branch shows a tristate (dash). Then the policy projects the emitted set:<br />
			&nbsp;&nbsp;• <strong>rolled-up</strong> — a fully-checked subtree collapses to its root; a
			partial branch emits its individually-checked descendants.<br />
			&nbsp;&nbsp;• <strong>leaves</strong> — only the checked leaf nodes.<br />
			&nbsp;&nbsp;• <strong>all</strong> — every fully-checked node (branches + leaves).
		</p>
	</div>

	<div class="grid-2">
		<div class="tree-container tree-container-tall">
			<Tree
				nodes={sampleData}
				idMember="id"
				pathMember="path"
				sortCallback={sortByName}
				isSorted={true}
				expandLevel={3}
				isCheckboxesShown={true}
				checkboxMode={policyCheckboxMode}
				{cascadeCheckPolicy}
				bind:checkedPaths={policyChecked}
				{...getTreeProps()}
			>
				{#snippet nodeTemplate(node: any)}
					<span>{node.data?.icon} {node.data?.name}</span>
				{/snippet}
			</Tree>
		</div>
		<div>
			<div class="output">
				<p class="output-label">Emitted checkedPaths ({policyChecked.size})</p>
				<pre>{policyChecked.size > 0
						? [...policyChecked].sort().join('\n')
						: '(none — check some branches)'}</pre>
			</div>
		</div>
	</div>

	<div class="code-block">
		<pre>{`<Tree
  isCheckboxesShown={true}
  checkboxMode="${policyCheckboxMode}"${policyCheckboxMode === 'cascade' ? `\n  cascadeCheckPolicy="${cascadeCheckPolicy}"` : ''}
  bind:checkedPaths={selected}
  onCheckedChange={({ paths }) => { /* projected set */ }}
  ...
/>`}</pre>
	</div>
</div>

<!-- Silent State Restore -->
<div class="card">
	<h2>IN04 · Silent State Restore</h2>
	<p class="description">
		Restore tree state from URL parameters <em>without</em> firing selection callbacks. You share a
		link like <code>?nodePath=1.2.3</code>. The page loads form data from the URL, and the tree just
		needs to scroll + visually highlight the matching node. Firing <code>onSelectionChange</code> in
		that flow would re-trigger your form-loader and overwrite whatever the URL just supplied.
	</p>

	<p class="description">
		Pass <code>{`{ isSilent: true }`}</code> to <code>selectNode()</code> /
		<code>selectNodes()</code> / <code>clearSelection()</code> / <code>uncheckAll()</code>.
		State (<code>selectedPaths</code>, <code>isSelected</code> CSS class, focused node) still
		updates — only <code>onNodeClick</code> / <code>onSelectionChange</code> / <code>onCheckedChange</code>
		are suppressed.
	</p>

	<div class="controls">
		<label>
			Path from URL:
			<input type="text" bind:value={pathFromUrl} class="w-sm" />
		</label>
		<label>
			<input type="checkbox" bind:checked={silentMode} />
			isSilent: true
		</label>
		<button onclick={simulateUrlLoad}>Simulate URL load</button>
		<button class="secondary" onclick={silentReset}>Reset</button>
	</div>

	<div class="tree-container tree-container-tall">
		<Tree
			bind:this={silentTreeRef}
			nodes={sampleData}
			idMember="id"
			pathMember="path"
			sortCallback={sortByName}
			isSorted={true}
			expandLevel={2}
			selectedNodeClass="stv__node-content--selected-bold"
			bind:selectedPaths={silentSelectedPaths}
			onSelectionChange={handleSelectionChange}
			{...getTreeProps()}
		>
			{#snippet nodeTemplate(node: LTreeNode<Item>)}
				<span>{node.data?.icon} {node.data?.name}</span>
			{/snippet}
		</Tree>
	</div>

	<div class="output">
		<p class="output-label">Form data (only changes when onSelectionChange fires)</p>
		<pre>{formNotes}</pre>
	</div>

	<div class="output">
		<p class="output-label">onSelectionChange fired</p>
		<pre>{selectionChangeFires} time(s)
{silentMode
? '→ expected 0 in silent mode'
: '→ expected 1 in loud mode (form data was overwritten)'}</pre>
	</div>

	<div class="code-block">
		<pre>{`// Restore tree state from URL params without firing onSelectionChange
function restoreFromUrl(nodePath: string) {
  // 1. Load form data based on the URL — preserve this value
  loadFormDataFromUrl(nodePath);

  // 2. Mark the matching node visually — { isSilent: true } skips
  //    onNodeClick / onSelectionChange so the form-load handler
  //    doesn't re-fire and clobber the data above.
  tree.selectNode(nodePath, 'replace', { isSilent: true });

  // 3. Scroll into view (scrollToPath never fires selection events).
  tree.scrollToPath(nodePath, { shouldExpandAncestors: true, shouldHighlight: true });
}`}</pre>
	</div>

	<div class="note">
		<p class="note-title">Also supported</p>
		<p>
			All four methods accept <code>{`{ isSilent: true }`}</code>:
			<code>selectNode(path, mode, opts)</code>,
			<code>selectNodes(paths, opts)</code>,
			<code>clearSelection(paths?, opts)</code>,
			<code>uncheckNodes(paths, opts?)</code> / <code>uncheckAll(opts?)</code>.
			The bindable props (<code>selectedPaths</code>, <code>checkedPaths</code>, <code>focusedNode</code>)
			still sync back to the parent — silent only skips the explicit callbacks.
		</p>
	</div>
</div>

<style>
	/* Demo focus styles. The component ships a DEFAULT focus look (a thin inset
	   ring, shown when no focusedNodeClass is set); these are opt-in FLAVORS
	   an app defines itself and passes via `focusedNodeClass` to override it.
	   :global so they apply to nodes rendered inside <Tree>. */
	/* .demo-focus-none needs no rule — passing ANY focusedNodeClass already
	   suppresses the built-in focus bar. */
	/* Underline the LABEL only (not the icon / emoji), dropped well clear of the
	   descenders so it reads as a marker rather than a text link. */
	:global(.demo-focused-underline .demo-node-name) {
		text-decoration: underline;
		text-decoration-color: var(--stv-accent-color);
		text-decoration-thickness: 2px;
		text-underline-offset: 0.4em;
		text-decoration-skip-ink: none;
	}
	:global(.demo-focused-bg) {
		background-color: color-mix(in srgb, var(--stv-accent-color) 12%, transparent);
	}
	/* Left accent bar, painted as a background-image layer so it sits over the
	   highlight tint and survives box-shadow presets. */
	:global(.demo-focused-bar) {
		background-image: linear-gradient(var(--stv-accent-color), var(--stv-accent-color));
		background-repeat: no-repeat;
		background-size: 2px 100%;
	}
</style>
