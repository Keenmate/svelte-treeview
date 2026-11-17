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

	// The values each select offers. A saved value that is no longer one of them (an older
	// name, e.g. selectionMode 'multi' before the 'multiple' rename) falls back to the default
	// — otherwise the select shows empty and the tree gets an invalid value.
	const allowedSettings: Partial<Record<keyof Settings, readonly unknown[]>> = {
		clickBehavior: ['expand-and-focus', 'select', 'expand'],
		selectionMode: ['single', 'multiple'],
		checkboxMode: ['independent', 'cascade'],
		rangeSelectionMode: ['visual', 'logical']
	};

	function loadSettings(): Settings {
		try {
			const raw = localStorage?.getItem(STORAGE_KEY);
			if (raw) {
				const settings: Settings = { ...defaultSettings, ...JSON.parse(raw) };
				for (const [key, allowed] of Object.entries(allowedSettings) as [keyof Settings, readonly unknown[]][])
					if (!allowed.includes(settings[key])) (settings as Record<keyof Settings, unknown>)[key] = defaultSettings[key];
				return settings;
			}
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
	// Same fallback for the style selects (class names changed in the rc11 ltree → stv rename).
	const savedOr = (value: string, options: { value: string }[]) => (options.some((o) => o.value === value) ? value : '');
	let selectedNodeClass = $state(savedOr(saved.selectedNodeClass, selectedNodeClassOptions));
	let focusedNodeClass = $state(savedOr(saved.focusedNodeClass, focusedNodeClassOptions));
	let isCheckboxesShown = $state(saved.isCheckboxesShown);
	let checkboxMode = $state<CheckboxMode>(saved.checkboxMode);
	let shouldClickToggleCheckbox = $state(saved.shouldClickToggleCheckbox);

	// Three-level state
	let clickTreeRef: Tree<Item>;
	let focusedNode1 = $state<LTreeNode<Item> | null>(null);
	let selectedPaths1 = $state(new Set<string>());
	let checkedPaths1 = $state(new Set<string>());

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

	// ── Silent state restore demo (master / detail) ──────────────────
	// The page opens with ?nodePath=1.2.3. The detail (right) knows the path from the URL,
	// so it starts loading at once and is usually ready first. The tree (master) loads its
	// data, then selects the node from the URL so it matches. If that select announces
	// itself (onSelectionChange), the page's "user picked a node → load its detail"
	// handler loads the same record again — the detail blinks to "loading…" and back
	// (flicker). With { isSilent: true } the tree selects + focuses the node quietly.
	let silentTreeRef: Tree<Item>;
	let silentSelectedPaths = $state(new Set<string>());

	let pathFromUrl = $state('1.2.3');
	let silentMode = $state(true);
	let detailText = $state('(nothing loaded yet)');
	let isDetailLoading = $state(false);
	let detailLoads = $state(0);
	let isDetailReloaded = $state(false); // the same record loaded twice in a row = the flicker
	let detailPath: string | null = null;
	let detailTimer: ReturnType<typeof setTimeout> | undefined;
	let masterTimer: ReturnType<typeof setTimeout> | undefined;

	// The detail's loader (in a real app: fetch the record, fill the form fields).
	function loadDetail(path: string, reason: string) {
		detailLoads++;
		isDetailReloaded = path === detailPath;
		detailPath = path;
		isDetailLoading = true;
		clearTimeout(detailTimer);
		detailTimer = setTimeout(() => {
			const name = sampleData.find((item) => item.path === path)?.name ?? '?';
			detailText = `${name} (${path}) — loaded by ${reason}`;
			isDetailLoading = false;
		}, 400);
	}

	// Master → detail: a selection the USER makes loads its detail.
	function handleSelectionChange({ paths }: { paths: Set<string> }) {
		const last = [...paths].pop();
		if (last) loadDetail(last, 'onSelectionChange');
	}

	// Simulated page open with ?nodePath=… : the detail loads from the URL right away,
	// the tree "finishes loading" a moment later and selects the node from the URL.
	function simulateUrlLoad() {
		silentReset();
		loadDetail(pathFromUrl, 'the URL');
		masterTimer = setTimeout(() => {
			silentTreeRef.selectNode(pathFromUrl, 'replace', { isSilent: silentMode });
			silentTreeRef.scrollToPath(pathFromUrl, {
				shouldExpandAncestors: true,
				behavior: 'smooth', block: 'center'
			});
		}, 700);
	}

	function silentReset() {
		clearTimeout(detailTimer);
		clearTimeout(masterTimer);
		silentSelectedPaths = new Set();
		silentTreeRef?.clearFocus({ isSilent: true });
		detailText = '(nothing loaded yet)';
		isDetailLoading = false;
		detailLoads = 0;
		isDetailReloaded = false;
		detailPath = null;
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
		whether a range includes collapsed children. Pick a <strong>Selected Style</strong> below and
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
			Selected Style:
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
			>Select 1.1.1, 1.1.3, 1.2.1</button
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
			<strong>Selected Style</strong> applies to every row in <code>selectedPaths</code>.
			<strong>Focused Style</strong> is <em>additive</em> — it stacks on top of the selection,
			only on the single row in <code>focusedNode</code>. After a plain click the same row is both
			selected and focused, so you'll see both styles on it. After a <kbd>Shift</kbd>+click
			range, the anchor and intermediate rows are selected only, while the row you clicked last
			is selected <em>and</em>
			focused. After <kbd>Ctrl</kbd>+click (or Arrow over an unselectable row) the focused row can
			is not selected at all — that's when Focused Style alone shows.
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
				bind:selectedPaths={selectedPaths1}
				bind:checkedPaths={checkedPaths1}
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
				<p class="output-label">Selected — <code>selectedPaths</code> ({selectedPaths1.size})</p>
				<pre>{selectedPaths1.size > 0
						? [...selectedPaths1].join(', ')
						: '(none — try Ctrl+click or Shift+click)'}</pre>
			</div>
			<div class="output">
				<p class="output-label">Checked — <code>checkedPaths</code> ({checkedPaths1.size})</p>
				<pre>{checkedPaths1.size > 0
						? [...checkedPaths1].join(', ')
						: '(none — use checkboxes)'}</pre>
			</div>
		</div>
	</div>

	<div class="code-block" data-language="svelte">
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

	<div class="code-block" data-language="svelte">
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

	<div class="code-block" data-language="svelte">
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

	<div class="code-block" data-language="svelte">
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
		<code>{`{ isSilent: true }`}</code> changes the tree's state <em>without announcing it</em>: the
		tree ends up exactly as after the normal call, but your change callbacks don't run. Use it
		whenever your own code makes the change and the rest of the page already knows about it —
		restoring state from a URL or a saved session, syncing the tree to another control, undo.
	</p>
	<p class="description">
		Example — a <strong>master / detail</strong> page opened with <code>?nodePath=1.2.3</code>. The
		detail knows the path from the URL, so it starts loading at once and is usually ready first.
		Then the tree finishes loading and selects node 1.2.3 so the master matches. A normal
		<code>selectNode()</code> fires <code>onSelectionChange</code>, the "user picked a node → load
		its detail" handler runs, and the detail loads the same record again: the fields blank out and
		refill (flicker), or overwrite what the user already typed. With <code>isSilent</code> the tree
		selects and focuses the node quietly and the detail is left alone.
	</p>

	<table class="reference-table">
		<thead><tr><th>With <code>isSilent: true</code></th><th>What happens</th></tr></thead>
		<tbody>
			<tr><td>Still changes</td><td><code>selectedPaths</code> (the bound prop updates), the node's selected style, the focused node (<code>bind:focusedNode</code>)</td></tr>
			<tr><td>Not fired</td><td><code>onSelectionChange</code>, <code>onFocusChange</code>, <code>onNodeClick</code></td></tr>
			<tr><td>Not done</td><td>keyboard focus does not jump into the tree (it stays where the user is); with checkboxes hidden, the selection is not copied into <code>checkedPaths</code> (and <code>onCheckedChange</code> does not fire)</td></tr>
		</tbody>
	</table>

	<p class="description">
		Press <strong>Simulate page open</strong> with <strong>isSilent</strong> on, then off. The detail
		loads from the URL and the tree selects the node 0.7 s later: silent leaves the detail alone
		(1 load), loud loads it again (2 loads — the "loading…" blink). Clicking a node yourself always
		loads its detail.
	</p>

	<div class="controls">
		<label>
			<code>?nodePath=</code>
			<input type="text" bind:value={pathFromUrl} class="w-sm" />
		</label>
		<label>
			<input type="checkbox" bind:checked={silentMode} />
			isSilent: true
		</label>
		<button onclick={simulateUrlLoad}>Simulate page open</button>
		<button class="secondary" onclick={silentReset}>Reset</button>
	</div>

	<div class="grid grid-2">
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
		<div>
			<div class="output">
				<p class="output-label">Detail</p>
				<pre>{isDetailLoading ? 'loading…' : detailText}</pre>
			</div>
			<div class="output">
				<p class="output-label">Detail loads</p>
				<pre>{detailLoads}{isDetailReloaded ? ' — the same record loaded again: that is the flicker' : ''}</pre>
			</div>
		</div>
	</div>

	<div class="code-block" data-language="ts">
		<pre>{`// Page script — the detail starts right away, from the URL
const nodePath = page.url.searchParams.get('nodePath');
if (nodePath) loadDetail(nodePath);

let tree: Tree<Item>;
let nodes = $state.raw<Item[]>([]);
onMount(async () => {
  nodes = await fetchTree();
  await tick();
  if (nodePath) {
    // match the master to the URL — quietly: the detail already has this record
    tree.selectNode(nodePath, 'replace', { isSilent: true });
    tree.scrollToPath(nodePath, { block: 'center' });
  }
});`}</pre>
	</div>
	<div class="code-block" data-language="svelte">
		<pre>{`<!-- the user's picks load the detail; silent selects never reach it -->
<Tree bind:this={tree} {nodes} onSelectionChange={({ paths }) => loadDetail([...paths].pop())} ... />`}</pre>
	</div>

	<div class="note">
		<p class="note-title">Load the detail from the callback, not from the bound value</p>
		<p>
			<code>isSilent</code> skips the <em>callbacks</em> only — <code>bind:selectedPaths</code> and
			<code>bind:focusedNode</code> still update, so the tree and your page agree on what is
			selected. If the detail reloads from an <code>$effect</code> on one of those bound values, a
			silent select still triggers it. Load the detail from <code>onSelectionChange</code> (it fires
			only for changes your code didn't make quietly), or let the effect skip a path whose record
			is already loaded.
		</p>
	</div>

	<div class="note">
		<p class="note-title">Every state method takes it</p>
		<p>
			Selection: <code>selectNode(path, mode, opts)</code>, <code>selectNodes</code>,
			<code>selectAll</code>, <code>clearSelection</code> — skips <code>onSelectionChange</code> /
			<code>onFocusChange</code>. Checkboxes: <code>checkNode</code>, <code>checkNodes</code>,
			<code>checkAll</code>, <code>uncheckNode</code>, <code>uncheckNodes</code>,
			<code>uncheckAll</code> — skips <code>onCheckedChange</code>. Focus: <code>focusNode</code>,
			<code>clearFocus</code> — skips <code>onFocusChange</code>. Expand: <code>expandNodes</code>,
			<code>collapseNodes</code>, <code>expandAll</code>, <code>collapseAll</code>,
			<code>toggleNodeExpanded</code> — skips <code>onNodeExpand</code> / <code>onNodeCollapse</code> /
			<code>onExpandedChange</code>. Assigning a bound prop (<code>selectedPaths</code>,
			<code>checkedPaths</code>, <code>focusedNode</code>, <code>expandedPaths</code>) is always silent.
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
