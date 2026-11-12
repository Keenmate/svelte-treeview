<script lang="ts">
	import Tree from '$lib/components/Tree.svelte';
	import TreeProvider from '$lib/components/TreeProvider.svelte';
	import RenderModeSwitch from '../RenderModeSwitch.svelte';
	import { getTreeProps } from '../render-mode.svelte.js';
	import Node from '$lib/components/Node.svelte';
	import { TreeController } from '$lib/core/TreeController.svelte.js';
	import type { LTreeNode } from '$lib/ltree/types.js';
	import type { DropPosition } from '$lib/ltree/types.js';
	import { notepadppData, type FileItem } from './notepadpp-data.js';
	import WindowsExplorer from './WindowsExplorer.svelte';
	import LogPanel from '../../LogPanel.svelte';

	// ── Sample data ────────────────────────────────────────────────────────
	const sampleData = [
		{ id: 1, path: '1', name: 'Documents', icon: '📁', size: '2.4 GB', order: 10 },
		{ id: 2, path: '1.1', name: 'Work', icon: '💼', size: '1.1 GB', order: 10 },
		{ id: 3, path: '1.1.1', name: 'Reports', icon: '📊', size: '340 MB', order: 10 },
		{ id: 4, path: '1.1.2', name: 'Presentations', icon: '📽️', size: '780 MB', order: 20 },
		{ id: 5, path: '1.2', name: 'Personal', icon: '🏠', size: '1.3 GB', order: 20 },
		{ id: 6, path: '1.2.1', name: 'Photos', icon: '📷', size: '950 MB', order: 10 },
		{ id: 7, path: '1.2.2', name: 'Music', icon: '🎵', size: '380 MB', order: 20 },
		{ id: 8, path: '2', name: 'Downloads', icon: '⬇️', size: '5.1 GB', order: 20 },
		{ id: 9, path: '2.1', name: 'Software', icon: '💿', size: '3.2 GB', order: 10 },
		{ id: 10, path: '2.2', name: 'Media', icon: '🎬', size: '1.9 GB', order: 20 },
		{ id: 11, path: '3', name: 'Projects', icon: '🚀', size: '890 MB', order: 30 },
		{ id: 12, path: '3.1', name: 'Web App', icon: '🌐', size: '540 MB', order: 10 },
		{ id: 13, path: '3.1.1', name: 'Frontend', icon: '🎨', size: '210 MB', order: 10 },
		{ id: 14, path: '3.1.2', name: 'Backend', icon: '⚙️', size: '330 MB', order: 20 },
		{ id: 15, path: '3.2', name: 'Mobile App', icon: '📱', size: '350 MB', order: 20 }
	];

	type Item = (typeof sampleData)[0];

	function sortByName({ nodes: items }: { nodes: LTreeNode<Item>[] }) {
		return [...items].sort((a, b) =>
			(a.data?.name || '').localeCompare(b.data?.name || '')
		);
	}

	function sortFilesByName({ nodes: items }: { nodes: LTreeNode<FileItem>[] }) {
		return [...items].sort((a, b) =>
			(a.data?.name || '').localeCompare(b.data?.name || '')
		);
	}

	function sortByOrder({ nodes: items }: { nodes: LTreeNode<Item>[] }) {
		return [...items].sort((a, b) =>
			(a.data?.order ?? 0) - (b.data?.order ?? 0)
		);
	}

	// ── Standard Tree (for comparison) ─────────────────────────────────────
	let selectedStd = $state<LTreeNode<Item> | null>(null);

	// ── iOS Files Explorer state ──────────────────────────────────────────
	let filesCurrentPath = $state('Notepad++');
	let filesHistory = $state<string[]>([]);
	let filesSelectedFile = $state<LTreeNode<FileItem> | null>(null);
	let filesShowDetail = $state(false);
	let filesSortBy = $state<'name' | 'date' | 'size' | 'kind'>('name');
	let filesSortAsc = $state(true);
	let filesShowSortMenu = $state(false);
	let filesSearch = $state('');

	function getFileIcon(node: LTreeNode<FileItem>): string {
		if (node.data?.isDirectory) return '📁';
		const ext = node.data?.extension || '';
		switch (ext) {
			case '.xml': return '📄';
			case '.exe': return '⚙️';
			case '.dll': return '🔧';
			case '.msix': return '📦';
			case '.log': return '📝';
			case '.txt': case '.md': return '📃';
			case '.ico': return '🖼️';
			default: return '📄';
		}
	}

	function formatSize(bytes: number): string {
		if (bytes === 0) return '—';
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function formatDate(isoStr: string): string {
		const d = new Date(isoStr);
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function sortFileNodes(nodes: LTreeNode<FileItem>[], sortBy: string, asc: boolean): LTreeNode<FileItem>[] {
		const sorted = [...nodes].sort((a, b) => {
			const aDir = a.data?.isDirectory ? 0 : 1;
			const bDir = b.data?.isDirectory ? 0 : 1;
			if (aDir !== bDir) return aDir - bDir;
			let cmp = 0;
			switch (sortBy) {
				case 'name':
					cmp = (a.data?.name || '').localeCompare(b.data?.name || '');
					break;
				case 'date':
					cmp = (a.data?.modified || '').localeCompare(b.data?.modified || '');
					break;
				case 'size':
					cmp = (a.data?.size || 0) - (b.data?.size || 0);
					break;
				case 'kind':
					cmp = (a.data?.extension || '').localeCompare(b.data?.extension || '');
					break;
			}
			return asc ? cmp : -cmp;
		});
		return sorted;
	}

	function navigateToFolder(path: string) {
		filesHistory = [...filesHistory, filesCurrentPath];
		filesCurrentPath = path;
		filesShowSortMenu = false;
	}

	function navigateBack() {
		if (filesHistory.length === 0) return;
		filesCurrentPath = filesHistory[filesHistory.length - 1];
		filesHistory = filesHistory.slice(0, -1);
		filesShowSortMenu = false;
	}

	function navigateToBreadcrumb(index: number) {
		const segments = filesCurrentPath.split('/');
		const targetPath = segments.slice(0, index + 1).join('/');
		if (targetPath === filesCurrentPath) return;
		filesHistory = [...filesHistory, filesCurrentPath];
		filesCurrentPath = targetPath;
		filesShowSortMenu = false;
	}

	// ── Badge / tag cloud state ────────────────────────────────────────────
	let badgeSelected = $state<string | null>(null);

	// ── Horizontal Token DnD state ──────────────────────────────────────
	let tokenDropLog = $state<string[]>([]);
	let tokenExpanded = $state(new Set<string>(['1', '2', '3']));

	function toggleToken(path: string) {
		const next = new Set(tokenExpanded);
		if (next.has(path)) {
			next.delete(path);
		} else {
			// Per-parent accordion: collapse siblings before expanding
			const lastDot = path.lastIndexOf('.');
			const parentPath = lastDot === -1 ? null : path.substring(0, lastDot);
			const depth = path.split('.').length;
			for (const ep of [...next]) {
				const epLastDot = ep.lastIndexOf('.');
				const epParent = epLastDot === -1 ? null : ep.substring(0, epLastDot);
				if (epParent === parentPath && ep.split('.').length === depth) {
					next.delete(ep);
				}
			}
			next.add(path);
		}
		tokenExpanded = next;
	}

	function expandAllTokens() {
		tokenExpanded = new Set(sampleData.map(d => d.path));
	}

	function collapseAllTokens() {
		tokenExpanded = new Set<string>();
	}

	// ── Dendrogram state ──────────────────────────────────────────────────
	let dendroExpanded = $state(new Set<string>(['1', '2', '3']));

	function toggleDendro(path: string) {
		const next = new Set(dendroExpanded);
		if (next.has(path)) next.delete(path);
		else next.add(path);
		dendroExpanded = next;
	}

	// Drag-drop log for dendrogram
	let dendroDropLog = $state<string[]>([]);

	function expandAllDendro() {
		dendroExpanded = new Set(sampleData.map(d => d.path));
	}

	function collapseAllDendro() {
		dendroExpanded = new Set<string>();
	}
</script>

<svelte:head>
	<title>Custom Layout - Svelte Treeview</title>
</svelte:head>

<!-- Recursive horizontal token node renderer (nested groups with drop zone pills) -->
{#snippet tokenNode(node: LTreeNode<Item>, getChildrenFn: (path: string) => LTreeNode<Item>[], ctrl: TreeController<Item>)}
	{@const depth = Math.min(node.path.split('.').length - 1, 3)}
	{@const isOpen = tokenExpanded.has(node.path)}
	{@const isDragging = ctrl.draggedNode?.path === node.path}
	{@const isDropTarget = ctrl.hoveredNodeForDrop?.path === node.path}
	{@const dropPos = isDropTarget ? ctrl.activeDropPosition : null}
	{@const showZones = isDropTarget && !isDragging}
	<div class="hz-token-group">
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="hz-token-wrapper" role="group"
			ondragover={() => { if (ctrl.isDragInProgress && !isDragging) ctrl.hoveredNodeForDrop = node; }}
			ondragleave={(e) => { if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as globalThis.Node)) { ctrl.hoveredNodeForDrop = null; ctrl.activeDropPosition = null; } }}
		>
			{#if showZones}<div class="hz-hitbox"></div>{/if}
			<button class="hz-token hz-depth-{depth}"
				draggable={true}
				class:hz-dragging={isDragging}
				onclick={() => { if (node.hasChildren) toggleToken(node.path); }}
				ondragstart={(e) => ctrl.startDrag(node, e)}
			>
				<span class="hz-token-icon">{node.data?.icon}</span>
				<span class="hz-token-name">{node.data?.name}</span>
				{#if node.hasChildren}
					<span class="hz-token-badge">{getChildrenFn(node.path).length}</span>
					<span class="hz-token-chevron" class:hz-open={isOpen}>&#x25B8;</span>
				{/if}
			</button>

			{#if showZones}
				<div role="button" tabindex="-1" class="hz-zone hz-zone-before"
					ondragover={(e) => { e.preventDefault(); e.stopPropagation(); ctrl.hoveredNodeForDrop = node; ctrl.activeDropPosition = 'before'; }}
					ondrop={(e) => { e.stopPropagation(); ctrl.dropAt(node, 'before', e); }}
					class:hz-zone-active={dropPos === 'before'}
				>Before</div>
				<div role="button" tabindex="-1" class="hz-zone hz-zone-after"
					ondragover={(e) => { e.preventDefault(); e.stopPropagation(); ctrl.hoveredNodeForDrop = node; ctrl.activeDropPosition = 'after'; }}
					ondrop={(e) => { e.stopPropagation(); ctrl.dropAt(node, 'after', e); }}
					class:hz-zone-active={dropPos === 'after'}
				>After</div>
				<div role="button" tabindex="-1" class="hz-zone hz-zone-child"
					ondragover={(e) => { e.preventDefault(); e.stopPropagation(); ctrl.hoveredNodeForDrop = node; ctrl.activeDropPosition = 'child'; }}
					ondrop={(e) => { e.stopPropagation(); ctrl.dropAt(node, 'child', e); }}
					class:hz-zone-active={dropPos === 'child'}
				>Child</div>
			{/if}
		</div>

		{#if node.hasChildren && isOpen}
			<div class="hz-children-group hz-children-depth-{depth}">
				{#each getChildrenFn(node.path) as child (child.id)}
					{@render tokenNode(child, getChildrenFn, ctrl)}
				{/each}
			</div>
		{/if}
	</div>
{/snippet}

<!-- Recursive dendrogram node renderer (with explicit drop zone pills) -->
{#snippet dendroNode(node: LTreeNode<Item>, getChildrenFn: (path: string) => LTreeNode<Item>[], ctrl: TreeController<Item>)}
	{@const depth = Math.min(node.path.split('.').length - 1, 3)}
	{@const isOpen = dendroExpanded.has(node.path)}
	{@const isDragging = ctrl.draggedNode?.path === node.path}
	{@const isDropTarget = ctrl.hoveredNodeForDrop?.path === node.path}
	{@const dropPos = isDropTarget ? ctrl.activeDropPosition : null}
	{@const showZones = isDropTarget && !isDragging}
	<div class="dg-row">
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="dg-node-wrapper" role="group"
			ondragover={() => { if (ctrl.isDragInProgress && !isDragging) ctrl.hoveredNodeForDrop = node; }}
			ondragleave={(e) => { if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as globalThis.Node)) { ctrl.hoveredNodeForDrop = null; ctrl.activeDropPosition = null; } }}
		>
			{#if showZones}<div class="dg-hitbox"></div>{/if}
			<button
				class="dg-label dg-depth-{depth}"
				class:dg-expandable={node.hasChildren}
				class:dg-dragging={isDragging}
				draggable={true}
				onclick={() => { if (node.hasChildren) toggleDendro(node.path); }}
				ondragstart={(e) => ctrl.startDrag(node, e)}
			>
				<span class="dg-node-icon">{node.data?.icon}</span>
				<span class="dg-node-name">{node.data?.name}</span>
				{#if node.hasChildren}
					<span class="dg-chevron" class:dg-open={isOpen}>&#x25B8;</span>
				{/if}
			</button>
			{#if showZones}
				<div role="button" tabindex="-1" class="dg-zone dg-zone-before"
					ondragover={(e) => { e.preventDefault(); e.stopPropagation(); ctrl.hoveredNodeForDrop = node; ctrl.activeDropPosition = 'before'; }}
					ondrop={(e) => { e.stopPropagation(); ctrl.dropAt(node, 'before', e); }}
					class:dg-zone-active={dropPos === 'before'}
				>Before</div>
				<div role="button" tabindex="-1" class="dg-zone dg-zone-after"
					ondragover={(e) => { e.preventDefault(); e.stopPropagation(); ctrl.hoveredNodeForDrop = node; ctrl.activeDropPosition = 'after'; }}
					ondrop={(e) => { e.stopPropagation(); ctrl.dropAt(node, 'after', e); }}
					class:dg-zone-active={dropPos === 'after'}
				>After</div>
				<div role="button" tabindex="-1" class="dg-zone dg-zone-child"
					ondragover={(e) => { e.preventDefault(); e.stopPropagation(); ctrl.hoveredNodeForDrop = node; ctrl.activeDropPosition = 'child'; }}
					ondrop={(e) => { e.stopPropagation(); ctrl.dropAt(node, 'child', e); }}
					class:dg-zone-active={dropPos === 'child'}
				>Child</div>
			{/if}
		</div>
		{#if node.hasChildren && isOpen}
			<div class="dg-bridge"></div>
			<div class="dg-children">
				{#each getChildrenFn(node.path) as child (child.id)}
					<div class="dg-branch">
						{@render dendroNode(child, getChildrenFn, ctrl)}
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/snippet}

<!-- Recursive vertical dendrogram node renderer (top-to-bottom, with explicit drop zone pills) -->
{#snippet vertDendroNode(node: LTreeNode<Item>, getChildrenFn: (path: string) => LTreeNode<Item>[], ctrl: TreeController<Item>)}
	{@const depth = Math.min(node.path.split('.').length - 1, 3)}
	{@const isOpen = dendroExpanded.has(node.path)}
	{@const isDragging = ctrl.draggedNode?.path === node.path}
	{@const isDropTarget = ctrl.hoveredNodeForDrop?.path === node.path}
	{@const dropPos = isDropTarget ? ctrl.activeDropPosition : null}
	{@const showZones = isDropTarget && !isDragging}
	<div class="vdg-subtree">
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="vdg-node-wrapper" role="group"
			ondragover={() => { if (ctrl.isDragInProgress && !isDragging) ctrl.hoveredNodeForDrop = node; }}
			ondragleave={(e) => { if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as globalThis.Node)) { ctrl.hoveredNodeForDrop = null; ctrl.activeDropPosition = null; } }}
		>
			{#if showZones}<div class="vdg-hitbox"></div>{/if}
			<button
				class="vdg-label vdg-depth-{depth}"
				class:vdg-expandable={node.hasChildren}
				class:vdg-dragging={isDragging}
				draggable={true}
				onclick={() => { if (node.hasChildren) toggleDendro(node.path); }}
				ondragstart={(e) => ctrl.startDrag(node, e)}
			>
				<span class="vdg-node-icon">{node.data?.icon}</span>
				<span class="vdg-node-name">{node.data?.name}</span>
				{#if node.hasChildren}
					<span class="vdg-chevron" class:vdg-open={isOpen}>&#x25B8;</span>
				{/if}
			</button>
			{#if showZones}
				<div role="button" tabindex="-1" class="vdg-zone vdg-zone-before"
					ondragover={(e) => { e.preventDefault(); e.stopPropagation(); ctrl.hoveredNodeForDrop = node; ctrl.activeDropPosition = 'before'; }}
					ondrop={(e) => { e.stopPropagation(); ctrl.dropAt(node, 'before', e); }}
					class:vdg-zone-active={dropPos === 'before'}
				>Before</div>
				<div role="button" tabindex="-1" class="vdg-zone vdg-zone-after"
					ondragover={(e) => { e.preventDefault(); e.stopPropagation(); ctrl.hoveredNodeForDrop = node; ctrl.activeDropPosition = 'after'; }}
					ondrop={(e) => { e.stopPropagation(); ctrl.dropAt(node, 'after', e); }}
					class:vdg-zone-active={dropPos === 'after'}
				>After</div>
				<div role="button" tabindex="-1" class="vdg-zone vdg-zone-child"
					ondragover={(e) => { e.preventDefault(); e.stopPropagation(); ctrl.hoveredNodeForDrop = node; ctrl.activeDropPosition = 'child'; }}
					ondrop={(e) => { e.stopPropagation(); ctrl.dropAt(node, 'child', e); }}
					class:vdg-zone-active={dropPos === 'child'}
				>Child</div>
			{/if}
		</div>
		{#if node.hasChildren && isOpen}
			<div class="vdg-stem"></div>
			<div class="vdg-children">
				{#each getChildrenFn(node.path) as child (child.id)}
					<div class="vdg-branch">
						{@render vertDendroNode(child, getChildrenFn, ctrl)}
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/snippet}

<header class="example-header">
	<a href="/" class="back-link">&larr; Back to Examples</a>
	<h1>Custom Layout (TreeProvider)</h1>
	<p class="subtitle">
		Build entirely different UIs on the same core TreeController.
		Compare the standard <code>&lt;Tree&gt;</code> with custom layouts using <code>&lt;TreeProvider&gt;</code>.
	</p>
	<RenderModeSwitch />
</header>

<!-- ================================================================== -->
<!-- 0. Windows File Explorer clone                                     -->
<!-- ================================================================== -->
<div class="card">
	<h2>CL01 · 🪟 Windows File Explorer</h2>
	<p class="description">
		A near-complete Windows File Explorer where <strong>both panes are
		<code>&lt;Tree&gt;</code></strong> with custom <code>nodeTemplate</code> renderers: the
		left is the folder nav tree, the right is a flat <code>&lt;Tree&gt;</code> rendering the
		details list as a 4-column grid (the columns line up because each row's content is a CSS
		grid sharing the header's track template). Selection, keyboard navigation, the
		right-click context menu (<code>getContextMenuItemsCallback</code>) and
		double-click-to-open (<code>onNodeDoubleClick</code>) all come from the library; rows are
		tagged folder/file via the <code>getNodeClassCallback</code> hook. Click a folder (either pane) to
		browse, double-click to open, use the breadcrumb / Back / Forward / Up to navigate, sort
		by any column, search the current folder and its subfolders (results show where each hit
		lives, with <code>*.dll</code>-style wildcards), and create / rename / delete folders.
		Panes stay in sync via <code>expandNodes()</code> / <code>focusNode()</code>. It opens on
		a real <code>C:\Windows</code> tree — 32 folders with multi-level subfolders and files.
	</p>
	<WindowsExplorer />
</div>

<!-- ================================================================== -->
<!-- 1. Standard <Tree> for comparison                                  -->
<!-- ================================================================== -->
<div class="card">
	<h2>CL02 · 1. Standard &lt;Tree&gt; (reference)</h2>
	<p class="description">
		This is the default <code>&lt;Tree&gt;</code> component rendering. Everything below uses the same
		data but renders it differently via <code>&lt;TreeProvider&gt;</code>.
	</p>
	<div class="tree-container tree-container-tall">
		<Tree
			nodes={sampleData}
			idMember="id"
			pathMember="path"
			sortCallback={sortByName}
			isSorted={true}
			expandLevel={3}
			bind:focusedNode={selectedStd}
			{...getTreeProps()}
		>
			{#snippet nodeTemplate(node: any)}
				<span>{node.data?.icon} {node.data?.name}</span>
			{/snippet}
		</Tree>
	</div>
	{#if selectedStd}
		<div class="output">
			<p class="output-label">Selected:</p>
			<p>{selectedStd.data?.icon} {selectedStd.data?.name} &mdash; {selectedStd.path}</p>
		</div>
	{/if}
</div>

<!-- ================================================================== -->
<!-- 2. iOS Files Explorer                                              -->
<!-- ================================================================== -->
<div class="card">
	<h2>CL03 · 2. iOS Files Explorer (custom layout)</h2>
	<p class="description">
		A realistic iOS Files-style mobile explorer powered by <code>&lt;TreeProvider&gt;</code>
		with 120+ real Notepad++ files. Drill into folders, sort, and tap files for details.
	</p>

	<TreeProvider
		nodes={notepadppData}
		idMember="id"
		pathMember="path"
		sortCallback={sortFilesByName}
		isSorted={true}
		expandLevel={99}
		treePathSeparator="/"
	>
		{#snippet children(ctrl: any)}
			{@const allChildren = sortFileNodes(ctrl.getChildren(filesCurrentPath), filesSortBy, filesSortAsc)}
			{@const currentChildren = filesSearch
				? allChildren.filter(n => (n.data?.name || '').toLowerCase().includes(filesSearch.toLowerCase()))
				: allChildren}
			{@const pathSegments = filesCurrentPath.split('/')}
			{@const currentFolderName = pathSegments[pathSegments.length - 1]}

			<div class="ios-phone-frame">
				<!-- Status bar -->
				<div class="ios-status-bar">
					<span>9:41</span>
					<span class="ios-status-icons">📶 📡 🔋</span>
				</div>

				<!-- Nav bar -->
				<div class="ios-navbar">
					<button class="ios-nav-btn ios-nav-back" disabled={filesHistory.length === 0}
						onclick={() => navigateBack()}>
						{#if filesHistory.length > 0}‹ Back{/if}
					</button>
					<span class="ios-nav-title">{currentFolderName}</span>
					<button class="ios-nav-btn" onclick={() => { filesShowSortMenu = !filesShowSortMenu; }}>
						⇅
					</button>
				</div>

				<!-- Search bar -->
				<div class="ios-search-bar">
					<div class="ios-search-field">
						<span class="ios-search-icon">🔍</span>
						<input
							type="text"
							class="ios-search-input"
							placeholder="Search"
							bind:value={filesSearch}
						/>
						{#if filesSearch}
							<button class="ios-search-clear" onclick={() => { filesSearch = ''; }}>✕</button>
						{/if}
					</div>
				</div>

				<!-- Sort dropdown -->
				{#if filesShowSortMenu}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<div class="ios-sort-overlay" onclick={() => { filesShowSortMenu = false; }}></div>
					<div class="ios-sort-menu">
						{#each [
							{ key: 'name', label: 'Name' },
							{ key: 'date', label: 'Date' },
							{ key: 'size', label: 'Size' },
							{ key: 'kind', label: 'Kind' }
						] as opt (opt.key)}
							<button class="ios-sort-option"
								class:ios-sort-active={filesSortBy === opt.key}
								onclick={() => {
									if (filesSortBy === opt.key) {
										filesSortAsc = !filesSortAsc;
									} else {
										filesSortBy = opt.key as typeof filesSortBy;
										filesSortAsc = true;
									}
									filesShowSortMenu = false;
								}}
							>
								<span>{opt.label}</span>
								{#if filesSortBy === opt.key}
									<span class="ios-sort-check">{filesSortAsc ? '↑' : '↓'}</span>
								{/if}
							</button>
						{/each}
					</div>
				{/if}

				<!-- Breadcrumbs -->
				{#if pathSegments.length > 1}
					<div class="ios-breadcrumbs">
						{#each pathSegments as segment, i}
							{#if i > 0}<span class="ios-breadcrumb-sep">›</span>{/if}
							<button class="ios-breadcrumb"
								class:ios-breadcrumb-active={i === pathSegments.length - 1}
								onclick={() => navigateToBreadcrumb(i)}>
								{segment}
							</button>
						{/each}
					</div>
				{/if}

				<!-- File list -->
				<div class="ios-file-list">
					{#each currentChildren as node (node.id)}
						<button class="ios-file-row" onclick={() => {
							if (node.data?.isDirectory) {
								navigateToFolder(node.path);
							} else {
								filesSelectedFile = node;
								filesShowDetail = true;
							}
						}}>
							<span class="ios-file-icon">{getFileIcon(node)}</span>
							<div class="ios-file-info">
								<span class="ios-file-name">{node.data?.name}</span>
								<span class="ios-file-meta">
									{#if node.data?.isDirectory}
										{ctrl.getChildren(node.path).length} items
									{:else}
										{formatSize(node.data?.size ?? 0)} · {formatDate(node.data?.modified ?? '')}
									{/if}
								</span>
							</div>
							{#if node.data?.isDirectory}
								<span class="ios-file-chevron">›</span>
							{/if}
						</button>
					{:else}
						<div class="ios-file-empty">This folder is empty</div>
					{/each}
				</div>

				<!-- Footer -->
				<div class="ios-footer">{currentChildren.length} items</div>
			</div>

			<!-- Detail bottom sheet -->
			{#if filesShowDetail && filesSelectedFile}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<div class="ios-overlay" onclick={() => { filesShowDetail = false; }}></div>
				<div class="ios-detail-sheet">
					<div class="ios-detail-handle"></div>
					<div class="ios-detail-header">
						<span class="ios-detail-icon">{getFileIcon(filesSelectedFile)}</span>
						<span>{filesSelectedFile.data?.name}</span>
					</div>
					<div class="ios-detail-rows">
						<div class="ios-detail-row">
							<span>Kind</span>
							<span>{filesSelectedFile.data?.extension || 'Document'}</span>
						</div>
						<div class="ios-detail-row">
							<span>Size</span>
							<span>{formatSize(filesSelectedFile.data?.size ?? 0)}</span>
						</div>
						<div class="ios-detail-row">
							<span>Modified</span>
							<span>{formatDate(filesSelectedFile.data?.modified ?? '')}</span>
						</div>
						<div class="ios-detail-row">
							<span>Path</span>
							<span class="ios-detail-path">{filesSelectedFile.data?.path}</span>
						</div>
					</div>
					<button class="ios-detail-done" onclick={() => { filesShowDetail = false; }}>Done</button>
				</div>
			{/if}
		{/snippet}
	</TreeProvider>
</div>

<!-- ================================================================== -->
<!-- 4. Badge / tag cloud                                               -->
<!-- ================================================================== -->
<div class="card">
	<h2>CL04 · 4. Badge Cloud (custom layout)</h2>
	<p class="description">
		All leaf nodes rendered as badges in a tag cloud. Hover shows the full path.
		Built with <code>&lt;TreeProvider&gt;</code> &mdash; the controller's
		<code>tree.visibleFlatNodes</code> provides the flat node list.
	</p>

	<TreeProvider
		nodes={sampleData}
		idMember="id"
		pathMember="path"
		sortCallback={sortByName}
		isSorted={true}
		expandLevel={99}
	>
		{#snippet children(ctrl: any)}
			{@const leaves = ctrl.tree.visibleFlatNodes.filter((n: any) => !n.hasChildren)}
			<div class="badge-cloud">
				{#each leaves as node (node.id)}
					<button
						class="cloud-badge"
						class:cloud-badge--active={badgeSelected === node.path}
						title="Path: {node.path}"
						onclick={() => { badgeSelected = node.path; }}
					>
						{node.data?.icon} {node.data?.name}
						<span class="cloud-badge__size">{node.data?.size}</span>
					</button>
				{/each}
			</div>

			{#if badgeSelected}
				{@const node = ctrl.getNodeByPath(badgeSelected)}
				{#if node}
					<div class="output">
						<p class="output-label">Selected badge:</p>
						<p>{node.data?.icon} {node.data?.name} &mdash; path: {node.path}, size: {node.data?.size}</p>
					</div>
				{/if}
			{/if}
		{/snippet}
	</TreeProvider>
</div>

<!-- ================================================================== -->
<!-- 3b. Horizontal Token DnD                                           -->
<!-- ================================================================== -->
<div class="card">
	<h2>CL05 · 3. Horizontal Tokens (drag-and-drop)</h2>
	<p class="description">
		Nodes as <strong>pill tokens</strong> in nested flex-wrap groups.
		Click a folder token to expand/collapse its children into a bordered sub-group.
		Drag a token, hover another to see <strong>Before / After / Child</strong> drop-zone pills.
	</p>

	<TreeProvider
		nodes={sampleData}
		idMember="id"
		pathMember="path"
		orderMember="order"
		sortCallback={sortByOrder}
		isSorted={true}
		expandLevel={1}
		dragDropMode="self"
		getIsDraggableCallback={() => true}
		getIsDropAllowedCallback={() => true}
		onNodeDrop={({ source, target, position }) => {
			const draggedNode = source.node;
			const dropNode = target?.node ?? null;
			tokenDropLog = [`Moved "${draggedNode?.data?.name}" ${position} "${dropNode?.data?.name}"`, ...tokenDropLog.slice(0, 4)];
			if (position === 'child' && dropNode) {
				tokenExpanded = new Set([...tokenExpanded, dropNode.path]);
			}
		}}
	>
		{#snippet children(ctrl: any)}
			<div class="controls">
				<button onclick={() => expandAllTokens()}>Expand All</button>
				<button class="secondary" onclick={() => collapseAllTokens()}>Collapse All</button>
			</div>
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="hz-container" role="group" ondragend={ctrl._onNodeDragEnd}>
				{#key ctrl.tree.changeTracker}
					{#each ctrl.tree.tree as rootNode (rootNode.id)}
						{@render tokenNode(rootNode, (path: string) => ctrl.getChildren(path), ctrl)}
					{/each}
				{/key}
			</div>
			{#if tokenDropLog.length > 0}
				<div class="output">
					<p class="output-label">Drop log:</p>
					<LogPanel entries={tokenDropLog} shouldFollow={false} />
				</div>
			{/if}
		{/snippet}
	</TreeProvider>
</div>

<!-- ================================================================== -->
<!-- 4. Controller API demo                                             -->
<!-- ================================================================== -->
<div class="card">
	<h2>CL06 · 5. Controller API (programmatic access)</h2>
	<p class="description">
		Demonstrates using the <code>TreeController</code> methods directly:
		<code>expandAll</code>, <code>collapseAll</code>, <code>searchNodes</code>,
		<code>getChildren</code>, and <code>statistics</code>.
	</p>

	<TreeProvider
		nodes={sampleData}
		idMember="id"
		pathMember="path"
		sortCallback={sortByName}
		isSorted={true}
		expandLevel={2}
		shouldUseInternalSearchIndex={true}
		searchValueMember="name"
	>
		{#snippet children(ctrl: any)}
			{@const stats = ctrl.statistics}
			<div class="card-grid api-grid">
				<div class="demo-card">
					<h3>Statistics</h3>
					<ul class="stat-list">
						<li><strong>Total nodes:</strong> {stats?.nodeCount ?? 0}</li>
						<li><strong>Max depth:</strong> {stats?.maxLevel ?? 0}</li>
						<li><strong>Root children:</strong> {ctrl.tree.tree.length}</li>
					</ul>
				</div>

				<div class="demo-card">
					<h3>Actions</h3>
					<div class="field-row">
						<button onclick={() => ctrl.expandAll()}>Expand All</button>
						<button onclick={() => ctrl.collapseAll()}>Collapse All</button>
						<button onclick={() => ctrl.expandNodes('3.1')}>Expand 3.1</button>
					</div>
				</div>

				<div class="demo-card">
					<h3>getChildren("1")</h3>
					<ul class="stat-list">
						{#each ctrl.getChildren('1') as child}
							<li>{child.data?.icon} {child.data?.name} ({child.path})</li>
						{/each}
					</ul>
				</div>
			</div>

			<!-- Still render a normal-looking tree using the Node component from context -->
			<div class="tree-container">
				<div class="stv__container">
					<div class="stv__tree stv__tree--flat">
						{#each ctrl.flatNodesToRender as node (node.id + '|' + node.path + '|' + node.hasChildren)}
							<Node
								{node}
								isDragInProgress={false}
								hoveredNodeForDropPath={null}
								activeDropPosition={null}
								dropOperation={'move'}
							>
								{#snippet children(nodeData: any)}
									<span>{nodeData.data?.icon} {nodeData.data?.name}</span>
								{/snippet}
							</Node>
						{/each}
					</div>
				</div>
			</div>
		{/snippet}
	</TreeProvider>
</div>

<!-- ================================================================== -->
<!-- 6. Dendrogram (horizontal tree)                                    -->
<!-- ================================================================== -->
<div class="card">
	<h2>CL07 · 6. Dendrogram (horizontal tree with drag-and-drop)</h2>
	<p class="description">
		A horizontal org-chart layout with CSS-drawn connecting lines and <strong>drag-and-drop</strong>
		powered by the controller's public API.
		Drag a node, then hover over another node to see <strong>drop zone pills</strong> appear around it.
		Move onto a zone to select <em>Before</em>, <em>After</em>, or <em>Child</em> position, then drop.
		Click any node with children to expand or collapse.
	</p>

	<TreeProvider
		nodes={sampleData}
		idMember="id"
		pathMember="path"
		orderMember="order"
		sortCallback={sortByOrder}
		isSorted={true}
		expandLevel={1}
		dragDropMode="self"
		getIsDraggableCallback={() => true}
		getIsDropAllowedCallback={() => true}
		onNodeDrop={({ source, target, position }) => {
			const draggedNode = source.node;
			const dropNode = target?.node ?? null;
			const msg = `Moved "${draggedNode?.data?.name}" ${position} "${dropNode?.data?.name ?? 'root'}"`;
			dendroDropLog = [msg, ...dendroDropLog.slice(0, 4)];
			// Expand target if dropping as child
			if (position === 'child' && dropNode) {
				dendroExpanded = new Set([...dendroExpanded, dropNode.path]);
			}
		}}
	>
		{#snippet children(ctrl: any)}
			<div class="controls">
				<button onclick={() => expandAllDendro()}>Expand All</button>
				<button class="secondary" onclick={() => collapseAllDendro()}>Collapse All</button>
			</div>
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="dg-viewport" role="group" ondragend={ctrl._onNodeDragEnd}>
				<div class="dg-canvas">
					{#key ctrl.tree.changeTracker}
						{#each ctrl.tree.tree as rootNode (rootNode.id)}
							<div class="dg-root-branch">
								{@render dendroNode(rootNode, (path: string) => ctrl.getChildren(path), ctrl)}
							</div>
						{/each}
					{/key}
				</div>
			</div>
			{#if dendroDropLog.length > 0}
				<div class="output">
					<p class="output-label">Drop log:</p>
					<LogPanel entries={dendroDropLog} shouldFollow={false} />
				</div>
			{/if}
		{/snippet}
	</TreeProvider>
</div>

<!-- ================================================================== -->
<!-- 7. Vertical Dendrogram (top to bottom)                             -->
<!-- ================================================================== -->
<div class="card">
	<h2>CL08 · 7. Vertical Dendrogram (top to bottom)</h2>
	<p class="description">
		Top-to-bottom org-chart layout with <strong>drag-and-drop</strong>.
		Drag a node, then hover over another node to see <strong>drop zone pills</strong> appear around it.
		Move onto a zone to select <em>Before</em>, <em>After</em>, or <em>Child</em> position, then drop.
	</p>

	<TreeProvider
		nodes={sampleData}
		idMember="id"
		pathMember="path"
		orderMember="order"
		sortCallback={sortByOrder}
		isSorted={true}
		expandLevel={1}
		dragDropMode="self"
		getIsDraggableCallback={() => true}
		getIsDropAllowedCallback={() => true}
		onNodeDrop={({ source, target, position }) => {
			const draggedNode = source.node;
			const dropNode = target?.node ?? null;
			const msg = `Moved "${draggedNode?.data?.name}" ${position} "${dropNode?.data?.name ?? 'root'}"`;
			dendroDropLog = [msg, ...dendroDropLog.slice(0, 4)];
			if (position === 'child' && dropNode) {
				dendroExpanded = new Set([...dendroExpanded, dropNode.path]);
			}
		}}
	>
		{#snippet children(ctrl: any)}
			<div class="controls">
				<button onclick={() => expandAllDendro()}>Expand All</button>
				<button class="secondary" onclick={() => collapseAllDendro()}>Collapse All</button>
			</div>
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="vdg-viewport" role="group" ondragend={ctrl._onNodeDragEnd}>
				<!-- Virtual root connecting all top-level nodes -->
				<div class="vdg-subtree">
					<div class="vdg-label vdg-root-label">
						<span class="vdg-node-icon">🗂️</span>
						<span class="vdg-node-name">File System</span>
					</div>
					<div class="vdg-stem"></div>
					<div class="vdg-children">
						{#key ctrl.tree.changeTracker}
							{#each ctrl.tree.tree as rootNode (rootNode.id)}
								<div class="vdg-branch">
									{@render vertDendroNode(rootNode, (path: string) => ctrl.getChildren(path), ctrl)}
								</div>
							{/each}
						{/key}
					</div>
				</div>
			</div>
			{#if dendroDropLog.length > 0}
				<div class="output">
					<p class="output-label">Drop log:</p>
					<LogPanel entries={dendroDropLog} shouldFollow={false} />
				</div>
			{/if}
		{/snippet}
	</TreeProvider>
</div>

<!-- ================================================================== -->
<!-- Code hint                                                          -->
<!-- ================================================================== -->
<div class="card">
	<h2>CL09 · How it works</h2>
	<p class="description">
		<code>&lt;TreeProvider&gt;</code> creates a <code>TreeController</code> and provides it
		via a snippet parameter. The controller holds all tree state (expand/collapse, search,
		drag-drop) while you render however you like.
	</p>
	<div class="code-block">
<pre>{`<TreeProvider nodes={myData} idMember="id" pathMember="path" ...>
  {#snippet children(controller)}
    <!-- controller.tree.tree        → root nodes -->
    <!-- controller.flatNodesToRender → all visible nodes -->
    <!-- controller.getChildren(path) → children of a path -->
    <!-- controller.expandAll()       → expand everything -->

    {#each controller.flatNodesToRender as node}
      <div style="padding-left: {node.level}rem">
        {node.data?.name}
      </div>
    {/each}
  {/snippet}
</TreeProvider>`}</pre>
	</div>
</div>

<style>
	/* Page chrome (cards, controls, buttons, outputs, logs) is the devkit kit's. What stays
	   here are the custom UIs themselves — the point of the page. Generic colours read the
	   kit's --kmwc-* tokens; product skins (iOS Files) keep their own palette, in light AND
	   dark via light-dark() (color-scheme comes from the kit's theme switch). */

	/* ── iOS Files Explorer ──────────────────────────────────────────── */
	/* kmwc-fixed-colors: imitation of the iOS Files app — Apple's system palette
	   (systemGroupedBackground, separator, label, systemBlue …) in its light and dark variants. */
	.ios-phone-frame,
	.ios-detail-sheet {
		--ios-bg: light-dark(#fff, #000);
		--ios-grouped-bg: light-dark(#f2f2f7, #1c1c1e);
		--ios-fill: light-dark(#e5e5ea, #2c2c2e);
		--ios-menu-bg: light-dark(#fff, #2c2c2e);
		--ios-separator: light-dark(#c6c6c8, #38383a);
		--ios-separator-soft: light-dark(#e5e5ea, #2c2c2e);
		--ios-label: light-dark(#000, #fff);
		--ios-label-2: light-dark(#8e8e93, #98989f);
		--ios-label-3: light-dark(#c7c7cc, #48484a);
		--ios-blue: light-dark(#007aff, #0a84ff);
		--ios-blue-hover: light-dark(#0066d6, #409cff);
		--ios-ring: light-dark(rgba(0, 0, 0, 0.08), rgba(255, 255, 255, 0.14));
	}

	/* Skin buttons are sized by the skin, not by the kit's control height. */
	.ios-phone-frame button,
	.ios-detail-sheet button {
		min-height: 0;
		line-height: normal;
	}

	.ios-phone-frame {
		width: min(420px, 100%);
		margin: 0 auto;
		border-radius: 24px;
		overflow: hidden;
		min-height: 600px;
		background: var(--ios-bg);
		box-shadow:
			0 0 0 1px var(--ios-ring),
			0 8px 40px rgba(0, 0, 0, 0.12),
			0 2px 8px rgba(0, 0, 0, 0.06);
		display: flex;
		flex-direction: column;
		position: relative;
	}

	.ios-status-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 24px 4px;
		font-size: 13px;
		font-weight: 600;
		color: var(--ios-label);
		background: var(--ios-grouped-bg);
	}
	.ios-status-icons {
		font-size: 11px;
		letter-spacing: 2px;
	}

	.ios-navbar {
		display: flex;
		align-items: center;
		height: 44px;
		padding: 0 8px;
		background: var(--ios-grouped-bg);
		border-bottom: 0.5px solid var(--ios-separator);
		position: sticky;
		top: 0;
		z-index: 10;
	}
	.ios-nav-btn {
		background: none;
		border: none;
		color: var(--ios-blue);
		font-size: 17px;
		padding: 0 8px;
		min-width: 60px;
		text-align: left;
	}
	.ios-nav-btn:hover {
		background: none;
	}
	.ios-nav-btn:disabled {
		color: transparent;
		cursor: default;
	}
	.ios-nav-title {
		flex: 1;
		min-width: 0;
		text-align: center;
		font-size: 17px;
		font-weight: 600;
		color: var(--ios-label);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.ios-search-bar {
		padding: 8px 16px;
		background: var(--ios-grouped-bg);
	}
	.ios-search-field {
		display: flex;
		align-items: center;
		background: var(--ios-fill);
		border-radius: 10px;
		padding: 0 10px;
		height: 36px;
		gap: 6px;
	}
	.ios-search-icon {
		font-size: 14px;
		flex-shrink: 0;
		opacity: 0.5;
	}
	.ios-search-input {
		flex: 1;
		height: auto;
		padding: 0;
		border: none;
		background: none;
		box-shadow: none;
		outline: none;
		font-size: 17px;
		color: var(--ios-label);
		min-width: 0;
	}
	.ios-search-input::placeholder {
		color: var(--ios-label-2);
	}
	.ios-search-clear {
		background: none;
		border: none;
		color: var(--ios-label-2);
		font-size: 14px;
		padding: 0 2px;
		flex-shrink: 0;
	}
	.ios-search-clear:hover {
		background: none;
	}

	.ios-sort-overlay {
		position: absolute;
		inset: 0;
		z-index: 19;
	}
	.ios-sort-menu {
		position: absolute;
		right: 16px;
		top: 96px;
		background: var(--ios-menu-bg);
		border-radius: 14px;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.18);
		overflow: hidden;
		min-width: 180px;
		z-index: 20;
	}
	.ios-sort-option {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 12px 16px;
		background: none;
		border: none;
		border-bottom: 0.5px solid var(--ios-separator-soft);
		border-radius: 0;
		font-size: 17px;
		color: var(--ios-label);
		text-align: left;
	}
	.ios-sort-option:last-child {
		border-bottom: none;
	}
	.ios-sort-option:hover {
		background: var(--ios-grouped-bg);
	}
	.ios-sort-active {
		color: var(--ios-blue);
		font-weight: 500;
	}
	.ios-sort-check {
		color: var(--ios-blue);
		font-weight: 600;
	}

	.ios-breadcrumbs {
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 8px 16px;
		background: var(--ios-grouped-bg);
		overflow-x: auto;
		white-space: nowrap;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
	}
	.ios-breadcrumbs::-webkit-scrollbar {
		display: none;
	}
	.ios-breadcrumb {
		background: none;
		border: none;
		padding: 4px 6px;
		font-size: 13px;
		color: var(--ios-blue);
		border-radius: 4px;
		flex-shrink: 0;
	}
	.ios-breadcrumb:hover {
		background: color-mix(in srgb, var(--ios-blue) 8%, transparent);
	}
	.ios-breadcrumb-active {
		color: var(--ios-label-2);
		cursor: default;
	}
	.ios-breadcrumb-active:hover {
		background: none;
	}
	.ios-breadcrumb-sep {
		color: var(--ios-label-3);
		font-size: 12px;
		flex-shrink: 0;
	}

	.ios-file-list {
		flex: 1;
		overflow-y: auto;
		max-height: 440px;
		background: var(--ios-bg);
	}
	.ios-file-row {
		display: flex;
		align-items: center;
		width: 100%;
		height: 56px;
		padding: 0 16px;
		background: var(--ios-bg);
		border: none;
		border-bottom: 0.5px solid var(--ios-separator-soft);
		border-radius: 0;
		text-align: left;
		transition: background 0.1s;
	}
	.ios-file-row:hover {
		background: var(--ios-grouped-bg);
	}
	.ios-file-row:active {
		background: var(--ios-fill);
	}
	.ios-file-icon {
		width: 40px;
		flex-shrink: 0;
		font-size: 1.5rem;
		text-align: center;
	}
	.ios-file-info {
		display: flex;
		flex-direction: column;
		flex: 1;
		overflow: hidden;
		gap: 2px;
	}
	.ios-file-name {
		font-size: 17px;
		color: var(--ios-label);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.ios-file-meta {
		font-size: 13px;
		color: var(--ios-label-2);
	}
	.ios-file-chevron {
		color: var(--ios-label-3);
		font-size: 20px;
		font-weight: 300;
		flex-shrink: 0;
		margin-left: 4px;
	}
	.ios-file-empty {
		text-align: center;
		padding: 3rem 1rem;
		color: var(--ios-label-2);
		font-size: 17px;
	}

	.ios-footer {
		text-align: center;
		color: var(--ios-label-2);
		font-size: 13px;
		padding: 12px;
		border-top: 0.5px solid var(--ios-separator-soft);
		background: var(--ios-grouped-bg);
	}

	/* Detail sheet */
	.ios-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.3);
		z-index: 100;
		animation: ios-fade-in 0.2s ease-out;
	}
	@keyframes ios-fade-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	.ios-detail-sheet {
		position: fixed;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 100%;
		max-width: 420px;
		max-height: 50vh;
		background: var(--ios-grouped-bg);
		border-radius: 14px 14px 0 0;
		z-index: 101;
		padding: 0 0 24px;
		animation: ios-slide-up 0.3s ease-out;
		overflow-y: auto;
	}
	@keyframes ios-slide-up {
		from { transform: translateX(-50%) translateY(100%); }
		to { transform: translateX(-50%) translateY(0); }
	}
	.ios-detail-handle {
		width: 36px;
		height: 5px;
		border-radius: 3px;
		background: var(--ios-label-3);
		margin: 8px auto 12px;
	}
	.ios-detail-header {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 0 20px 16px;
		font-size: 20px;
		font-weight: 600;
		color: var(--ios-label);
		border-bottom: 0.5px solid var(--ios-separator);
	}
	.ios-detail-icon {
		font-size: 28px;
	}
	.ios-detail-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 13px 20px;
		border-bottom: 0.5px solid var(--ios-separator-soft);
		font-size: 17px;
	}
	.ios-detail-row span:first-child {
		color: var(--ios-label);
	}
	.ios-detail-row span:last-child {
		color: var(--ios-label-2);
		text-align: right;
		max-width: 60%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.ios-detail-row span.ios-detail-path {
		font-size: 13px;
	}
	.ios-detail-done {
		display: block;
		width: calc(100% - 40px);
		margin: 16px auto 0;
		padding: 14px;
		background: var(--ios-blue);
		color: #fff;
		border: none;
		border-radius: 12px;
		font-size: 17px;
		font-weight: 600;
	}
	.ios-detail-done:hover {
		background: var(--ios-blue-hover);
	}

	/* ── Badge cloud ─────────────────────────────────────────────────── */
	.badge-cloud {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding: 1rem 0;
	}
	.cloud-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 0.85rem;
		background: var(--kmwc-main-bg);
		color: var(--kmwc-text-color-1);
		border: 1px solid var(--kmwc-border-color);
		border-radius: 999px;
		font-size: 0.9rem;
		transition: all 0.15s;
	}
	.cloud-badge:hover {
		background: var(--kmwc-main-bg);
		border-color: var(--kmwc-accent-color);
		box-shadow: 0 2px 4px var(--kmwc-accent-shadow-color);
	}
	.cloud-badge--active,
	.cloud-badge--active:hover {
		background: var(--kmwc-accent-color);
		color: var(--kmwc-text-color-on-accent);
		border-color: var(--kmwc-accent-color);
	}
	.cloud-badge__size {
		font-size: 0.75rem;
		color: var(--kmwc-text-color-3);
	}
	.cloud-badge--active .cloud-badge__size {
		color: inherit;
		opacity: 0.8;
	}

	/* ── Controller API ──────────────────────────────────────────────── */
	.api-grid {
		--grid-min: 200px;
		--grid-gap: 1rem;
		margin-bottom: 1rem;
	}
	.stat-list {
		list-style: none;
		font-size: 0.9rem;
	}
	.stat-list li {
		padding: 0.25rem 0;
	}

	/* ── Shared by the three drag-and-drop layouts (tokens, dendrograms) ── */
	.hz-container,
	.dg-viewport,
	.vdg-viewport {
		border: 1px solid var(--kmwc-border-color);
		border-radius: var(--kmwc-radius-md);
		background:
			radial-gradient(circle, color-mix(in srgb, var(--kmwc-text-color-1) 28%, transparent) 0.75px, transparent 0.75px),
			var(--kmwc-page-bg);
		background-size: 20px 20px;
	}

	/* The node chips (they are <button>s — the skin, not the kit's button look). */
	.hz-token,
	.dg-label,
	.vdg-label {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		background: var(--kmwc-main-bg);
		border: 1.5px solid var(--kmwc-border-color);
		font-family: var(--kmwc-mono-font-family);
		color: var(--kmwc-text-color-1);
		white-space: nowrap;
		transition: all 0.15s ease;
		box-shadow: 0 1px 2px var(--kmwc-shadow-color);
	}
	.hz-token:hover,
	.dg-label:hover,
	.vdg-label:hover {
		background: var(--kmwc-main-bg);
	}
	.hz-token:hover,
	.dg-label.dg-expandable:hover,
	.vdg-label.vdg-expandable:hover {
		border-color: var(--kmwc-border-color-strong);
		box-shadow: 0 2px 8px var(--kmwc-shadow-color);
	}
	.hz-token[draggable='true'],
	.dg-label[draggable='true'],
	.vdg-label[draggable='true'] {
		cursor: grab;
	}
	.hz-token[draggable='true']:active,
	.dg-label[draggable='true']:active,
	.vdg-label[draggable='true']:active {
		cursor: grabbing;
	}
	.hz-dragging,
	.dg-dragging,
	.vdg-dragging {
		opacity: 0.4;
		box-shadow: none !important;
	}

	/* kmwc-fixed-colors: the depth legend (amber / teal / violet / pink) is data, not
	   chrome — the same hues in both themes; mid-tone so they read on light and dark. */
	:is(.hz-depth-0, .hz-children-depth-0, .dg-depth-0, .vdg-depth-0) { --cl-depth: #f59e0b; }
	:is(.hz-depth-1, .hz-children-depth-1, .dg-depth-1, .vdg-depth-1) { --cl-depth: #0d9488; }
	:is(.hz-depth-2, .hz-children-depth-2, .dg-depth-2, .vdg-depth-2) { --cl-depth: #7c3aed; }
	:is(.hz-depth-3, .hz-children-depth-3, .dg-depth-3, .vdg-depth-3) { --cl-depth: #ec4899; }

	.hz-token-icon,
	.dg-node-icon,
	.vdg-node-icon {
		font-size: 1rem;
		line-height: 1;
	}
	.hz-token-name,
	.dg-node-name,
	.vdg-node-name {
		font-weight: 500;
	}
	.hz-token-chevron,
	.dg-chevron,
	.vdg-chevron {
		font-size: 0.7rem;
		color: var(--kmwc-text-color-3);
		transition: transform 0.2s ease;
		margin-left: 0.15rem;
	}
	.hz-open,
	.dg-open,
	.vdg-open {
		transform: rotate(90deg);
	}

	.hz-token-wrapper,
	.dg-node-wrapper,
	.vdg-node-wrapper {
		position: relative;
		display: inline-flex;
		align-items: center;
	}
	/* Invisible expanded hitbox — catches drag events in the gap between chip and zones. */
	.hz-hitbox,
	.dg-hitbox,
	.vdg-hitbox {
		position: absolute;
		inset: -28px;
	}

	/* Drop-zone pills: one look, positioned per layout below. */
	.hz-zone,
	.dg-zone,
	.vdg-zone {
		position: absolute;
		font-size: 0.75rem;
		font-weight: 700;
		padding: 5px 14px;
		border-radius: 999px;
		white-space: nowrap;
		pointer-events: all;
		cursor: default;
		opacity: 0.85;
		transition: opacity 0.1s, box-shadow 0.1s, scale 0.1s;
		z-index: 21;
		user-select: none;
		animation: zone-in 0.15s ease-out;
	}
	@keyframes zone-in {
		from { opacity: 0; }
		to { opacity: 0.85; }
	}
	/* kmwc-fixed-colors: the drop-position legend (before = green, after = orange,
	   child = violet) — pastel pill + dark text, identical and legible in both themes. */
	.hz-zone-before,
	.dg-zone-before,
	.vdg-zone-before {
		--cl-zone-glow: rgba(34, 197, 94, 0.6);
		background: #bbf7d0;
		color: #14532d;
		border: 2px solid #4ade80;
	}
	.hz-zone-after,
	.dg-zone-after,
	.vdg-zone-after {
		--cl-zone-glow: rgba(249, 115, 22, 0.6);
		background: #fed7aa;
		color: #7c2d12;
		border: 2px solid #fb923c;
	}
	.hz-zone-child,
	.dg-zone-child,
	.vdg-zone-child {
		--cl-zone-glow: rgba(139, 92, 246, 0.6);
		background: #ddd6fe;
		color: #4c1d95;
		border: 2px solid #a78bfa;
	}
	.hz-zone-active,
	.dg-zone-active,
	.vdg-zone-active {
		opacity: 1 !important;
		scale: 1.08;
		box-shadow: 0 0 12px var(--cl-zone-glow);
	}
	/* Zones beside the chip … */
	.hz-zone-before,
	.vdg-zone-before {
		right: calc(100% + 4px);
		top: 50%;
		transform: translateY(-50%);
	}
	.hz-zone-after,
	.vdg-zone-after,
	.dg-zone-child {
		left: calc(100% + 4px);
		top: 50%;
		transform: translateY(-50%);
	}
	/* … above / below it. */
	.dg-zone-before {
		bottom: calc(100% + 4px);
		left: 50%;
		transform: translateX(-50%);
	}
	.hz-zone-child,
	.vdg-zone-child,
	.dg-zone-after {
		top: calc(100% + 4px);
		left: 50%;
		transform: translateX(-50%);
	}

	/* ── Horizontal Tokens ──────────────────────────────────────────── */
	.hz-container {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		padding: 1.5rem;
		min-height: 80px;
	}
	.hz-token-group {
		display: contents;
	}
	.hz-token {
		padding: 8px 16px;
		border-left: 3px solid var(--cl-depth, var(--kmwc-text-color-4));
		border-radius: 999px;
		font-size: 0.85rem;
	}
	.hz-token:hover {
		border-left-color: var(--cl-depth, var(--kmwc-text-color-4));
		transform: translateY(-1px);
	}
	.hz-token-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 18px;
		height: 18px;
		padding: 0 5px;
		border-radius: 999px;
		background: var(--kmwc-elevated-bg);
		color: var(--kmwc-text-color-3);
		font-size: 0.7rem;
		font-weight: 700;
		line-height: 1;
	}
	/* Nested children group — bordered sub-container tinted by its depth. */
	.hz-children-group {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		padding: 10px 12px;
		border-radius: 10px;
		border: 1.5px dashed color-mix(in srgb, var(--cl-depth, var(--kmwc-border-color-strong)) 35%, transparent);
		background: color-mix(in srgb, var(--cl-depth, var(--kmwc-main-bg)) 4%, transparent);
		width: 100%;
		animation: hz-group-in 0.2s ease-out;
	}
	@keyframes hz-group-in {
		from { opacity: 0; transform: translateY(-4px); }
		to { opacity: 1; transform: translateY(0); }
	}

	/* ── Dendrogram (left to right) ─────────────────────────────────── */
	.dg-viewport {
		padding: 1.5rem 2rem;
		overflow-x: auto;
	}
	.dg-canvas {
		display: flex;
		flex-direction: column;
		min-width: fit-content;
	}
	.dg-root-branch + .dg-root-branch {
		margin-top: 0.75rem;
	}
	.dg-row {
		display: flex;
		align-items: flex-start;
	}
	.dg-label {
		height: 36px;
		padding: 0 0.75rem;
		border-left: 3px solid var(--cl-depth, var(--kmwc-text-color-4));
		border-radius: 6px;
		font-size: 0.82rem;
		cursor: default;
		flex-shrink: 0;
	}
	.dg-label.dg-expandable {
		cursor: pointer;
	}
	.dg-label.dg-expandable:hover {
		border-left-color: var(--cl-depth, var(--kmwc-text-color-4));
		transform: translateX(1px);
	}
	.dg-bridge {
		width: 28px;
		height: 0;
		border-top: 1.5px solid var(--kmwc-text-color-4);
		margin-top: 18px;
		flex-shrink: 0;
	}
	.dg-children {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		animation: dg-expand 0.2s ease-out;
	}
	@keyframes dg-expand {
		from { opacity: 0; transform: translateX(-8px); }
		to { opacity: 1; transform: translateX(0); }
	}
	.dg-branch {
		position: relative;
		padding-left: 28px;
	}
	/* Horizontal connector from rail to child node */
	.dg-branch::before {
		content: '';
		position: absolute;
		left: 0;
		top: 18px;
		width: 28px;
		height: 0;
		border-top: 1.5px solid var(--kmwc-text-color-4);
		pointer-events: none;
	}
	/* Vertical rail segment — extends into gap above to connect siblings */
	.dg-branch::after {
		content: '';
		position: absolute;
		left: 0;
		top: -0.75rem;
		bottom: 0;
		width: 0;
		border-left: 1.5px solid var(--kmwc-text-color-4);
		pointer-events: none;
	}
	/* First child: rail starts at node center */
	.dg-branch:first-child::after {
		top: 18px;
	}
	/* Last child: rail from gap above down to node center */
	.dg-branch:last-child::after {
		top: -0.75rem;
		bottom: auto;
		height: calc(19px + 0.75rem);
	}
	/* Only child: no vertical rail */
	.dg-branch:only-child::after {
		display: none;
	}

	/* ── Vertical Dendrogram (top to bottom) ────────────────────────── */
	.vdg-viewport {
		padding: 2rem;
		overflow: auto;
		display: flex;
		/* safe: a tree wider than the frame starts at the left edge and scrolls,
		   instead of overflowing past the (unreachable) left side. */
		justify-content: safe center;
	}
	.vdg-subtree {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.vdg-label {
		height: 36px;
		padding: 0 0.75rem;
		border-top: 3px solid var(--cl-depth, var(--kmwc-text-color-4));
		border-radius: 6px;
		font-size: 0.82rem;
		cursor: default;
	}
	.vdg-label.vdg-expandable {
		cursor: pointer;
	}
	.vdg-label.vdg-expandable:hover {
		border-top-color: var(--cl-depth, var(--kmwc-text-color-4));
		transform: translateY(-1px);
	}
	.vdg-root-label {
		border-top-color: var(--kmwc-text-color-1);
		font-weight: 600;
	}
	.vdg-stem {
		width: 0;
		height: 16px;
		border-left: 1.5px solid var(--kmwc-text-color-4);
	}
	.vdg-children {
		display: flex;
		justify-content: center;
		animation: vdg-expand 0.2s ease-out;
	}
	@keyframes vdg-expand {
		from { opacity: 0; transform: translateY(-6px); }
		to { opacity: 1; transform: translateY(0); }
	}
	.vdg-branch {
		position: relative;
		padding: 16px 6px 0;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	/* Horizontal rail segment */
	.vdg-branch::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 0;
		border-top: 1.5px solid var(--kmwc-text-color-4);
		pointer-events: none;
	}
	/* Vertical connector from rail down to child node */
	.vdg-branch::after {
		content: '';
		position: absolute;
		top: 0;
		left: 50%;
		height: 16px;
		width: 0;
		border-left: 1.5px solid var(--kmwc-text-color-4);
		pointer-events: none;
	}
	/* First child: rail from center to right only */
	.vdg-branch:first-child::before {
		left: 50%;
	}
	/* Last child: rail from left to center only */
	.vdg-branch:last-child::before {
		right: 50%;
	}
	/* Only child: no horizontal rail */
	.vdg-branch:only-child::before {
		display: none;
	}
</style>
