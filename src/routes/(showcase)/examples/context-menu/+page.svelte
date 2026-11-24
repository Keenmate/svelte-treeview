<script lang="ts">
	import Tree from '$lib/components/Tree.svelte';
	import ContextMenuItem from '$lib/components/ContextMenuItem.svelte';
	import ContextMenuDivider from '$lib/components/ContextMenuDivider.svelte';
	import type { LTreeNode } from '$lib/ltree/types.js';
	import type { TreeMenuContext, TreeMenuEntry } from '$lib/core/menu.js';
	import RenderModeSwitch from '../RenderModeSwitch.svelte';
	import LogPanel, { logLine, type LogEntry } from '../../LogPanel.svelte';
	import { getTreeProps } from '../render-mode.svelte.js';

	type FileItem = {
		id: number;
		path: string;
		name: string;
		icon: string;
		type: 'folder' | 'file';
		readonly?: boolean;
	};

	const sampleData: FileItem[] = [
		{ id: 1, path: '1', name: 'Documents', icon: '📁', type: 'folder' },
		{ id: 2, path: '1.1', name: 'Reports', icon: '📊', type: 'folder' },
		{ id: 3, path: '1.1.1', name: 'Q1 Report.pdf', icon: '📄', type: 'file' },
		{ id: 4, path: '1.1.2', name: 'Q2 Report.pdf', icon: '📄', type: 'file', readonly: true },
		{ id: 5, path: '1.2', name: 'Notes.txt', icon: '📝', type: 'file' },
		{ id: 6, path: '2', name: 'Images', icon: '🖼️', type: 'folder' },
		{ id: 7, path: '2.1', name: 'Photo.jpg', icon: '📷', type: 'file' },
		{ id: 8, path: '2.2', name: 'Logo.png', icon: '🎨', type: 'file' }
	];

	let activityLog = $state<LogEntry[]>([]);
	let snippetLog = $state<LogEntry[]>([]);
	let xOffset = $state(8);
	let yOffset = $state(0);

	function sortByName({ nodes: items }: { nodes: LTreeNode<FileItem>[] }) {
		return [...items].sort((a, b) => (a.data?.name || '').localeCompare(b.data?.name || ''));
	}

	// Timeline lines for the kit log panel: the menu item is the name, the node the detail.
	type LogVariant = 'info' | 'success' | 'warning' | 'danger';

	function addLog(name: string, detail: string, variant?: LogVariant) {
		activityLog = [...activityLog.slice(-9), logLine(name, detail, variant)];
	}

	function addSnippetLog(name: string, detail: string, variant?: LogVariant) {
		snippetLog = [...snippetLog.slice(-9), logLine(name, detail, variant)];
	}

	function clearLog() {
		activityLog = [];
	}

	function clearSnippetLog() {
		snippetLog = [];
	}

	// Context menu callback: items, createMenuDivider()s and built-in action names (TreeMenuEntry)
	function getContextMenu({ node, controller }: TreeMenuContext<FileItem>): TreeMenuEntry<FileItem>[] {
		const close = () => controller.closeContextMenu();
		const isFolder = node.data?.type === 'folder';
		const isReadonly = node.data?.readonly;

		const entries: TreeMenuEntry<FileItem>[] = [];

		if (isFolder) {
			entries.push({
				icon: '📄',
				text: 'New File',
				shortcut: 'N',
				onClick: () => { addLog('New File', `in "${node.data?.name}"`); close(); }
			});
			entries.push({
				icon: '📁',
				text: 'New Folder',
				shortcut: 'Shift+N',
				onClick: () => { addLog('New Folder', `in "${node.data?.name}"`); close(); }
			});
			entries.push({ divider: true });
		}

		entries.push({
			icon: '📋',
			text: 'Copy',
			shortcut: 'C',
			onClick: () => { addLog('Copy', `"${node.data?.name}"`); close(); }
		});

		entries.push({
			icon: '✂️',
			text: 'Cut',
			shortcut: 'X',
			isDisabled: isReadonly,
			onClick: () => { addLog('Cut', `"${node.data?.name}"`); close(); }
		});

		entries.push({
			icon: '📥',
			text: 'Paste',
			shortcut: 'V',
			isDisabled: !isFolder,
			onClick: () => { addLog('Paste', `into "${node.data?.name}"`); close(); }
		});

		// Submenu example: Export As...
		entries.push({
			icon: '📤',
			text: 'Export As...',
			children: [
				{ text: 'JSON', shortcut: 'J', onClick: () => { addLog('Export', `"${node.data?.name}" as JSON`); close(); } },
				{ text: 'XML', shortcut: 'X', onClick: () => { addLog('Export', `"${node.data?.name}" as XML`); close(); } },
				{ text: 'CSV', shortcut: 'C', onClick: () => { addLog('Export', `"${node.data?.name}" as CSV`); close(); } },
			]
		});

		entries.push({ divider: true, text: 'Danger zone' });

		entries.push({
			icon: '✏️',
			text: 'Rename',
			shortcut: 'F2',
			isDisabled: isReadonly,
			onClick: () => { addLog('Rename', `"${node.data?.name}"`); close(); }
		});

		entries.push({
			icon: '🗑️',
			text: 'Delete',
			isDanger: true,
			isDisabled: isReadonly,
			onClick: () => { addLog('Delete', `"${node.data?.name}"`, 'danger'); close(); }
		});

		// isVisible example: only show lock info for readonly
		entries.push({
			icon: '🔒',
			text: 'Read-only file',
			isDisabled: true,
			isVisible: !!isReadonly
		});

		return entries;
	}
</script>

<svelte:head>
	<title>Context Menu Examples - Svelte Treeview</title>
</svelte:head>

<header class="example-header">
	<a href="/" class="back-link">&larr; Back to Examples</a>
	<h1>Context Menu</h1>
	<p class="subtitle">Right-click context menus with callbacks, snippets, shortcuts, submenus, and named dividers</p>
	<RenderModeSwitch />
</header>

<div class="note">
	<p class="note-title">The same menu as web-treeview</p>
	<p>The menu is web-components-core's <code>openMenu()</code>: it keeps itself and its submenus inside the viewport (a submenu flips left when there's no room on the right), closes on an outside click, a scroll that moves the tree, Escape or Tab, and runs the menu keyboard — arrows, Home / End, → / ← for submenus, Enter, an item's shortcut while open. <kbd>Shift+F10</kbd> or the ContextMenu key opens the focused node's menu. On a phone it opens as a bottom sheet (<code>menuPresentation</code>: <code>'auto'</code> · <code>'floating'</code> · <code>'sheet'</code> · <code>'drawer'</code>). The <code>contextMenuXOffset</code>/<code>contextMenuYOffset</code> props set the root menu's offset from the cursor.</p>
</div>

<!-- Dynamic Context Menu (Callback approach) -->
<div class="card">
	<h2>CM01 · Callback Approach</h2>
	<p class="description">Right-click on any node. Demonstrates shortcuts, submenus, named dividers, <code>className="danger"</code>, and <code>isVisible</code>.</p>

	<div class="controls">
		<label>
			X Offset:
			<input type="number" class="w-xs" bind:value={xOffset} />
			<span class="muted">px</span>
		</label>
		<label>
			Y Offset:
			<input type="number" class="w-xs" bind:value={yOffset} />
			<span class="muted">px</span>
		</label>
		<button class="secondary" onclick={clearLog}>Clear Log</button>
	</div>

	<div class="tree-container tree-container-tall">
		<Tree
			nodes={sampleData}
			idMember="id"
			pathMember="path"
			sortCallback={sortByName}
			isSorted={true}
			expandLevel={3}
			getContextMenuItemsCallback={getContextMenu}
			contextMenuXOffset={xOffset}
			contextMenuYOffset={yOffset}
			{...getTreeProps()}
		>
			{#snippet nodeTemplate(node: any)}
				<span>
					{node.data?.icon} {node.data?.name}
					{#if node.data?.readonly}
						<small class="muted">(read-only)</small>
					{/if}
				</span>
			{/snippet}
		</Tree>
	</div>

	<div class="output">
		<p class="output-label">Activity log</p>
		<LogPanel entries={activityLog} empty="Right-click a node and pick an item…" />
	</div>
</div>

<!-- Snippet Approach -->
<div class="card">
	<h2>CM02 · Snippet + Component Approach</h2>
	<p class="description">Uses <code>ContextMenuItem</code> and <code>ContextMenuDivider</code> Svelte components inside a <code>contextMenu</code> snippet for declarative menus with conditional rendering.</p>

	<div class="controls">
		<button class="secondary" onclick={clearSnippetLog}>Clear Log</button>
	</div>

	<div class="tree-container tree-container-tall">
		<Tree
			nodes={sampleData}
			idMember="id"
			pathMember="path"
			sortCallback={sortByName}
			isSorted={true}
			expandLevel={3}
			{...getTreeProps()}
		>
			{#snippet nodeTemplate(node: any)}
				<span>
					{node.data?.icon} {node.data?.name}
					{#if node.data?.readonly}
						<small class="muted">(read-only)</small>
					{/if}
				</span>
			{/snippet}
			{#snippet contextMenu(node: LTreeNode<FileItem>, close: () => void)}
				<ContextMenuItem text="Copy" icon="📋" shortcut="C" onClick={() => { addSnippetLog('Copy', `"${node.data?.name}"`); close(); }} />
				<ContextMenuItem text="Cut" icon="✂️" shortcut="X" isDisabled={!!node.data?.readonly} onClick={() => { addSnippetLog('Cut', `"${node.data?.name}"`); close(); }} />
				{#if node.data?.type === 'folder'}
					<ContextMenuItem text="Export As..." icon="📤">
						<ContextMenuItem text="JSON" shortcut="J" onClick={() => { addSnippetLog('Export', `"${node.data?.name}" as JSON`); close(); }} />
						<ContextMenuItem text="XML" shortcut="X" onClick={() => { addSnippetLog('Export', `"${node.data?.name}" as XML`); close(); }} />
					</ContextMenuItem>
				{/if}
				<ContextMenuDivider text="Danger zone" />
				<ContextMenuItem text="Delete" icon="🗑️" isDanger isDisabled={!!node.data?.readonly} onClick={() => { addSnippetLog('Delete', `"${node.data?.name}"`, 'danger'); close(); }} />
			{/snippet}
		</Tree>
	</div>

	<div class="output">
		<p class="output-label">Activity log</p>
		<LogPanel entries={snippetLog} empty="Right-click a node and pick an item…" />
	</div>
</div>

<!-- Callback API Reference -->
<div class="card">
	<h2>CM03 · Callback API</h2>
	<p class="description">Use <code>getContextMenuItemsCallback</code> to dynamically generate menu entries based on the node.</p>

	<div class="code-block" data-language="ts">
		<pre>{`import { createMenuDivider } from '@keenmate/svelte-treeview';
import type { TreeMenuContext, TreeMenuEntry } from '@keenmate/svelte-treeview';

// ctx = { node, path, parent, siblings, controller }; the menu closes after an item runs.
function getContextMenu({ node }: TreeMenuContext<FileItem>): TreeMenuEntry<FileItem>[] {
  return [
    { id: 'edit', text: 'Edit', icon: '✏️', onClick: () => edit(node) },
    { text: 'Export As...', icon: '📤', children: [
        { id: 'json', text: 'JSON', shortcut: 'J', onClick: () => exportAs(node, 'json') },
        { id: 'xml', text: 'XML', shortcut: 'X', onClick: () => exportAs(node, 'xml') },
    ]},
    'copy', 'cut', 'paste',            // built-in names: texts from labels
    createMenuDivider('Danger zone'),
    { action: 'delete', isDisabled: node.data.readonly },
  ];
}
// Order: beforeActionCallback(detail) → item onClick(detail) → built-in → onAction(detail)`}</pre>
	</div>
</div>

<!-- Snippet API Reference -->
<div class="card">
	<h2>CM04 · Snippet + Component API</h2>
	<p class="description">Use <code>ContextMenuItem</code> and <code>ContextMenuDivider</code> components inside the <code>contextMenu</code> snippet.</p>

	<div class="code-block" data-language="svelte">
		<pre>{`${'<'}script>
  import { ContextMenuItem, ContextMenuDivider } from '@keenmate/svelte-treeview';
${'<'}/script>

<Tree nodes={data} ...>
  {#snippet contextMenu(node, close)}
    <ContextMenuItem text="Copy" icon="📋" shortcut="C"
      onClick={() => { copy(node); close(); }} />
    {#if node.data.canExport}
      <ContextMenuItem text="Export As..." icon="📤">
        <ContextMenuItem text="JSON"
          onClick={() => { exportAs(node, 'json'); close(); }} />
        <ContextMenuItem text="XML"
          onClick={() => { exportAs(node, 'xml'); close(); }} />
      </ContextMenuItem>
    {/if}
    <ContextMenuDivider text="Danger zone" />
    <ContextMenuItem text="Delete" isDanger
      isDisabled={node.data.readonly}
      onClick={() => { del(node); close(); }} />
  {/snippet}
</Tree>`}</pre>
	</div>
</div>

<!-- TreeMenuEntry Types -->
<div class="card">
	<h2>CM05 · TreeMenuEntry Types</h2>
	<p class="description">The unified type definition shared across svelte-treeview and canvas-tree.</p>

	<div class="code-block" data-language="ts">
		<pre>{`// Divider (simple or named) — create with createMenuDivider(text?)
interface MenuDivider { divider: true; text?: string; }

// Menu item — core MenuItem (same model as @keenmate/web-treeview)
interface TreeMenuItem<T> {
  action?: TreeAction | 'custom';   // a built-in, or omit for your own item
  id?: string;
  text?: string;
  icon?: string;
  tooltip?: string;
  shortcut?: string;
  cssClass?: string;
  isVisible?: boolean;
  isDisabled?: boolean;
  isDanger?: boolean;
  isToggled?: boolean;
  onClick?: (detail: TreeActionEventDetail<T>) => void | Promise<void>;
  children?: TreeMenuEntry<T>[];
  shouldCloseOnClick?: boolean;   // default true
}

// An entry: an item, a divider or a built-in action name
type TreeMenuEntry<T> = TreeMenuItem<T> | MenuDivider | TreeAction;
type TreeAction = 'copy' | 'cut' | 'paste' | 'delete' | 'expand' | 'collapse'
  | 'expand-subtree' | 'collapse-subtree' | 'expand-all' | 'collapse-all'
  | 'sort' | 'sort-subtree' | 'sort-all';`}</pre>
	</div>

	<table class="reference-table">
		<thead>
			<tr>
				<th>Property</th>
				<th>Type</th>
				<th>Description</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td><code>label</code></td>
				<td><code>string</code></td>
				<td>Display text (required for items, optional for dividers)</td>
			</tr>
			<tr>
				<td><code>onclick</code></td>
				<td><code>() =&gt; void | Promise</code></td>
				<td>Click handler (optional: parent items with children may omit)</td>
			</tr>
			<tr>
				<td><code>icon</code></td>
				<td><code>string</code></td>
				<td>Emoji or text icon shown before the label</td>
			</tr>
			<tr>
				<td><code>shortcut</code></td>
				<td><code>string</code></td>
				<td>Keyboard shortcut hint (right-aligned, muted)</td>
			</tr>
			<tr>
				<td><code>isDisabled</code></td>
				<td><code>boolean</code></td>
				<td>If true, item is grayed out and not clickable</td>
			</tr>
			<tr>
				<td><code>isVisible</code></td>
				<td><code>boolean</code></td>
				<td>If false, item is not rendered (callback approach)</td>
			</tr>
			<tr>
				<td><code>className</code></td>
				<td><code>string</code></td>
				<td>CSS class name (e.g. "danger" for red styling)</td>
			</tr>
			<tr>
				<td><code>children</code></td>
				<td><code>TreeMenuEntry[]</code></td>
				<td>Nested submenu items (opens on hover)</td>
			</tr>
			<tr>
				<td><code>divider</code></td>
				<td><code>true</code></td>
				<td>Type discriminator for divider entries</td>
			</tr>
		</tbody>
	</table>
</div>

<!-- Menu Position Offset -->
<div class="card">
	<h2>CM06 · Menu Position Offset</h2>
	<p class="description">Adjust the context menu position relative to the cursor using <code>contextMenuXOffset</code> and <code>contextMenuYOffset</code>.</p>

	<div class="code-block" data-language="svelte">
		<pre>{`<Tree
  getContextMenuItemsCallback={getContextMenu}
  contextMenuXOffset={8}   // Default: 8px right of cursor
  contextMenuYOffset={0}   // Default: 0px below cursor
/>`}</pre>
	</div>

</div>

<!-- CSS Customization -->
<div class="card">
	<h2>CM07 · CSS Customization</h2>
	<p class="description">
		The menu is core's <code>openMenu()</code> (the same menu as web-treeview), so it carries core's
		<code>km-menu</code> classes and styles. Theme it through the variables, not the classes:
		<code>--stv-context-menu-*</code> for this tree, <code>--km-menu-*</code> on <code>:root</code>
		for every Keenmate menu on the page, then the shared <code>--base-*</code> tokens.
	</p>

	<table class="reference-table">
		<thead>
			<tr>
				<th>Class</th>
				<th>Description</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td><code>.km-menu</code></td>
				<td>A menu level (root and submenus); <code>--submenu</code>, <code>--custom</code> (a <code>contextMenu</code> snippet), <code>--sheet</code></td>
			</tr>
			<tr>
				<td><code>.km-menu__item</code></td>
				<td>Each menu item; <code>--disabled</code>, <code>--danger</code>, <code>--toggled</code>, <code>--has-submenu</code></td>
			</tr>
			<tr>
				<td><code>.km-menu__icon</code></td>
				<td>Icon column (core <code>renderIcon</code>)</td>
			</tr>
			<tr>
				<td><code>.km-menu__label</code></td>
				<td>Label text span</td>
			</tr>
			<tr>
				<td><code>.km-menu__shortcut</code></td>
				<td>Shortcut hint, formatted for the platform (<code>Ctrl+K</code> / <code>⌘K</code>)</td>
			</tr>
			<tr>
				<td><code>.km-menu__divider</code></td>
				<td>Divider line; <code>--named</code> carries the label text</td>
			</tr>
			<tr>
				<td><code>.km-menu__loading</code></td>
				<td>Loading row of a lazy (<code>getChildrenCallback</code>) submenu</td>
			</tr>
			<tr>
				<td><code>.km-menu-sheet</code></td>
				<td>The phone bottom sheet / drawer (<code>menuPresentation</code>): <code>__header</code>, <code>__title</code>, <code>__close</code></td>
			</tr>
		</tbody>
	</table>
</div>

