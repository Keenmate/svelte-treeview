<script lang="ts">
	// Windows File Explorer clone built on @keenmate/svelte-treeview.
	// BOTH panes are <Tree> instances with custom nodeTemplate renderers:
	//   • LEFT  — the folder navigation tree (hierarchical, folders only).
	//   • RIGHT — the details list (flat: the current folder's children rendered as
	//             a 4-column grid). Selection, keyboard nav, the context menu, and
	//             double-click-to-open all come from the library; the columns line up
	//             because each row's .stv__node-content is a CSS grid and the header
	//             shares the same track template inside one sticky-header scroll area.
	import { tick, onMount } from 'svelte';
	import { Tree } from '$lib/index.js';
	import type { LTreeNode } from '$lib/ltree/types.js';
	import type { TreeMenuContext, TreeMenuEntry } from '$lib/core/menu.js';
	import { explorerData, DEFAULT_PATH, type FsNode } from './explorer-data.js';

	const SEP = '.';

	// Mutable filesystem (New folder / Rename / Delete operate on this).
	let fs = $state<FsNode[]>(explorerData.map((n) => ({ ...n })));

	// The folder-only slice drives the nav tree.
	const folderData = $derived(fs.filter((n) => n.kind === 'folder'));

	let navTreeRef: Tree<FsNode>;
	let navExpanded = $state<Set<string>>(new Set());
	let focusedFolder = $state<LTreeNode<FsNode> | null>(null);

	let currentPath = $state(DEFAULT_PATH); // C:\Windows
	let filter = $state('');
	let sortKey = $state<'name' | 'modified' | 'type' | 'size'>('name');
	let sortDir = $state<'asc' | 'desc'>('asc');
	let statusInfo = $state<string | null>(null); // transient status-bar message

	// Right-pane selection lives in the right <Tree>'s highlight set. Its paths are
	// the synthetic per-row paths (see rightTreeData), not the real fs paths.
	let rightSel = $state<Set<string>>(new Set());

	let history = $state<string[]>([DEFAULT_PATH]);
	let histIndex = $state(0);

	// ── path helpers ─────────────────────────────────────────────────────────
	const byPath = (p: string) => fs.find((n) => n.path === p);
	const parentOf = (p: string) => {
		const i = p.lastIndexOf(SEP);
		return i === -1 ? '' : p.slice(0, i);
	};
	function ancestorPaths(p: string): string[] {
		const segs = p.split(SEP);
		const out: string[] = [];
		for (let i = 1; i < segs.length; i++) out.push(segs.slice(0, i).join(SEP));
		return out; // excludes p itself
	}
	function directChildren(parentPath: string, list: FsNode[]): FsNode[] {
		const prefix = parentPath ? parentPath + SEP : '';
		return list.filter((n) => {
			if (!n.path.startsWith(prefix) || n.path === parentPath) return false;
			const rest = n.path.slice(prefix.length);
			return rest.length > 0 && !rest.includes(SEP);
		});
	}
	// Everything nested under parentPath, any depth (used by recursive search).
	function descendantsOf(parentPath: string, list: FsNode[]): FsNode[] {
		const prefix = parentPath + SEP;
		return list.filter((n) => n.path.startsWith(prefix));
	}
	// Folder chain from currentPath down to an item's parent, e.g. "System32 \ drivers \ etc".
	function locationOf(p: string): string {
		const names: string[] = [];
		let cur = parentOf(p);
		while (cur && cur.length > currentPath.length && cur !== currentPath) {
			names.unshift(byPath(cur)?.name ?? cur);
			cur = parentOf(cur);
		}
		return names.join(' \\ ');
	}

	// ── formatting ─────────────────────────────────────────────────────────────
	function formatSize(b: number | null): string {
		if (b == null) return '';
		if (b < 1024) return `${b} B`;
		const kb = b / 1024;
		if (kb < 1024) return `${Math.max(1, Math.round(kb)).toLocaleString('en-US')} KB`;
		const mb = kb / 1024;
		if (mb < 1024) return `${mb.toFixed(1)} MB`;
		return `${(mb / 1024).toFixed(1)} GB`;
	}

	const TYPE_NAMES: Record<string, string> = {
		css: 'Cascading Style Sheet', js: 'JavaScript File', md: 'Markdown File',
		html: 'HTML Document', txt: 'Text Document', ini: 'Configuration settings',
		yml: 'YAML File', log: 'Text Document', json: 'JSON File', mp3: 'MP3 File',
		mp4: 'MP4 Video', mov: 'MOV Video', flac: 'FLAC File',
		jpg: 'JPG File', png: 'PNG File', ico: 'Icon', gif: 'GIF File', bmp: 'BMP File',
		exe: 'Application', dll: 'Application extension', sys: 'System file',
		ttf: 'TrueType font file', fon: 'Font file', cur: 'Cursor', ani: 'Animated Cursor',
		wav: 'Wave Sound', inf: 'Setup Information', admx: 'ADMX File', adml: 'ADML File',
		nls: 'NLS File', dat: 'DAT File', edb: 'EDB File', sdb: 'Security database',
		theme: 'Windows Theme File', msstyles: 'Visual Style', rtf: 'Rich Text Document',
		mui: 'MUI File', bin: 'BIN File', xlsx: 'Microsoft Excel Worksheet', zip: 'Compressed (zipped) Folder'
	};
	function typeLabel(n: FsNode): string {
		if (n.kind === 'folder') return 'File folder';
		if (!n.ext) return 'File';
		return TYPE_NAMES[n.ext] ?? `${n.ext.toUpperCase()} File`;
	}
	function iconFor(n: FsNode): string {
		if (n.kind === 'folder') return '📁';
		if (['jpg', 'png', 'ico', 'gif', 'bmp'].includes(n.ext)) return '🖼️';
		if (['mp3', 'wav', 'flac'].includes(n.ext)) return '🎵';
		if (['mp4', 'mov', 'avi'].includes(n.ext)) return '🎬';
		if (['zip', 'rar', '7z'].includes(n.ext)) return '🗜️';
		if (['exe'].includes(n.ext)) return '⚙️';
		if (['dll', 'sys', 'mui', 'nls', 'dat', 'bin', 'edb', 'sdb'].includes(n.ext)) return '🧩';
		if (['ttf', 'fon'].includes(n.ext)) return '🔤';
		if (['cur', 'ani'].includes(n.ext)) return '🖱️';
		if (['ini', 'inf', 'admx', 'adml', 'theme', 'msstyles'].includes(n.ext)) return '🛠️';
		return '📄';
	}
	function previewText(n: FsNode): string {
		return `${n.name} — ${typeLabel(n)}${n.size != null ? ' · ' + formatSize(n.size) : ''}`;
	}

	// ── sorting ──────────────────────────────────────────────────────────────
	const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
	function parseDate(s: string): number {
		const m = s.match(/(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})/);
		return m ? Number(`${m[3]}${m[2]}${m[1]}${m[4]}${m[5]}`) : 0;
	}
	function sortItems(items: FsNode[]): FsNode[] {
		const sign = sortDir === 'asc' ? 1 : -1;
		return [...items].sort((a, b) => {
			if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1; // folders first
			let r = 0;
			if (sortKey === 'name') r = collator.compare(a.name, b.name);
			else if (sortKey === 'type') r = collator.compare(typeLabel(a), typeLabel(b));
			else if (sortKey === 'size') r = (a.size ?? -1) - (b.size ?? -1);
			else r = parseDate(a.modified) - parseDate(b.modified);
			return (r || collator.compare(a.name, b.name)) * sign;
		});
	}

	// ── derived view state ─────────────────────────────────────────────────────
	const isSearching = $derived(filter.trim().length > 0);
	// Build a name predicate. A query with `*`/`?` is treated as an anchored glob
	// (so `*.dll` matches names ending in .dll); otherwise it's a substring match.
	function makeMatcher(query: string): (name: string) => boolean {
		const q = query.trim().toLowerCase();
		if (!q) return () => true;
		if (/[*?]/.test(q)) {
			const rx = new RegExp(
				'^' + q.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
			);
			return (name) => rx.test(name.toLowerCase());
		}
		return (name) => name.toLowerCase().includes(q);
	}
	const rightItems = $derived.by(() => {
		// When searching, recurse into all subfolders (like Explorer); otherwise just
		// the current folder's direct children.
		if (isSearching) {
			const match = makeMatcher(filter);
			return sortItems(descendantsOf(currentPath, fs).filter((n) => match(n.name)));
		}
		return sortItems(directChildren(currentPath, fs));
	});

	// The right <Tree> wants a path-keyed dataset. We feed it the already-sorted
	// list re-keyed to flat synthetic paths ("1", "2", …) so it renders a flat list
	// (real fs paths would imply a hierarchy). Each row keeps its real FsNode fields,
	// plus `treePath` for the tree and selection mapping.
	type RightItem = FsNode & { treePath: string };
	const rightTreeData = $derived<RightItem[]>(rightItems.map((n, i) => ({ ...n, treePath: String(i + 1) })));
	// Preserve our sort order in the tree (its sortCallback would otherwise reorder).
	const keepRightOrder = ({ nodes: items }: { nodes: LTreeNode<RightItem>[] }) =>
		[...items].sort((a, b) => Number(a.data?.treePath ?? 0) - Number(b.data?.treePath ?? 0));
	// Per-row class from data — dogfoods the getNodeClassCallback hook.
	const rightNodeClass = ({ node }: { node: LTreeNode<RightItem> }) =>
		node.data?.kind === 'folder' ? 'winx-folder' : 'winx-file';

	const selectedNodes = $derived(rightTreeData.filter((n) => rightSel.has(n.treePath)));
	const selectedCount = $derived(selectedNodes.length);

	const breadcrumb = $derived(
		[...ancestorPaths(currentPath), currentPath].map((p) => ({ path: p, name: byPath(p)?.name ?? p }))
	);
	const canBack = $derived(histIndex > 0);
	const canFwd = $derived(histIndex < history.length - 1);
	const canUp = $derived(currentPath !== '1' && !!parentOf(currentPath));

	function sortBy(key: typeof sortKey) {
		if (sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		else { sortKey = key; sortDir = 'asc'; }
	}

	// ── navigation ─────────────────────────────────────────────────────────────
	async function revealInTree(path: string) {
		for (const a of ancestorPaths(path)) await navTreeRef?.expandNodes(a);
		if (byPath(path)?.kind === 'folder') await navTreeRef?.expandNodes(path);
		navTreeRef?.focusNode(path);
	}
	function navigateTo(path: string, opts: { pushHistory?: boolean; syncTree?: boolean } = {}) {
		const { pushHistory = true, syncTree = true } = opts;
		if (!byPath(path)) return;
		statusInfo = null;
		currentPath = path;
		filter = ''; // opening/navigating clears the active search (Explorer behaviour)
		rightSel = new Set();
		if (pushHistory) {
			history = [...history.slice(0, histIndex + 1), path];
			histIndex = history.length - 1;
		}
		if (syncTree) revealInTree(path);
	}
	const goBack = () => { if (canBack) { histIndex--; navigateTo(history[histIndex], { pushHistory: false }); } };
	const goForward = () => { if (canFwd) { histIndex++; navigateTo(history[histIndex], { pushHistory: false }); } };
	const goUp = () => { if (canUp) navigateTo(parentOf(currentPath)); };

	// ── opening (double-click / Enter via the right tree) ────────────────────────
	function open(n: FsNode) {
		if (n.kind === 'folder') navigateTo(n.path);
		else statusInfo = `Opening “${n.name}”…`;
	}

	// ── mutations ────────────────────────────────────────────────────────────────
	const nextId = () => Math.max(0, ...fs.map((n) => n.id)) + 1;
	function nextChildPath(parentPath: string): string {
		const prefix = parentPath ? parentPath + SEP : '';
		let max = 0;
		for (const k of directChildren(parentPath, fs)) {
			const seg = Number(k.path.slice(prefix.length));
			if (Number.isFinite(seg) && seg > max) max = seg;
		}
		return `${prefix}${max + 1}`;
	}
	function uniqueName(base: string, parentPath: string): string {
		const taken = new Set(directChildren(parentPath, fs).map((n) => n.name));
		if (!taken.has(base)) return base;
		let n = 2;
		while (taken.has(`${base} (${n})`)) n++;
		return `${base} (${n})`;
	}
	// Reassigning `fs` re-inits the nav tree, so snapshot + restore its expansion.
	async function withTreeState(mutate: () => void) {
		const expanded = new Set(navExpanded);
		mutate();
		await tick();
		navExpanded = expanded;
		for (const a of ancestorPaths(currentPath)) await navTreeRef?.expandNodes(a);
		navTreeRef?.focusNode(currentPath);
	}
	async function newFolder() {
		const path = nextChildPath(currentPath);
		const name = uniqueName('New folder', currentPath);
		await withTreeState(() => {
			fs = [...fs, { id: nextId(), path, name, kind: 'folder', ext: '', modified: '28.06.2026 10:00', size: null }];
		});
		// Select the freshly created folder in the right pane (find its synthetic path).
		const created = rightTreeData.find((n) => n.path === path);
		rightSel = created ? new Set([created.treePath]) : new Set();
	}
	function runDeleteCommand(targets: FsNode[]) {
		if (!targets.length) return;
		const doomed = new Set<string>();
		for (const t of targets) {
			doomed.add(t.path);
			for (const n of fs) if (n.path.startsWith(t.path + SEP)) doomed.add(n.path);
		}
		withTreeState(() => { fs = fs.filter((n) => !doomed.has(n.path)); });
		rightSel = new Set();
	}
	function renameNode(target: FsNode) {
		const next = typeof prompt === 'function' ? prompt('Rename', target.name) : null;
		if (!next || next === target.name) return;
		withTreeState(() => {
			fs = fs.map((n) => (n.path === target.path ? { ...n, name: uniqueName(next, parentOf(target.path)) } : n));
		});
	}
	function selectAll() { rightSel = new Set(rightTreeData.map((n) => n.treePath)); }

	// Full Windows-style path, e.g. C:\Windows\System32\drivers\etc\hosts.
	function fullPathOf(p: string): string {
		return [...ancestorPaths(p), p]
			.map((q) => byPath(q)?.name ?? q)
			.filter((name) => name !== 'This PC')
			.map((name) => (name.startsWith('Local Disk') ? 'C:' : name))
			.join('\\');
	}
	async function copyPath(node: FsNode) {
		const text = fullPathOf(node.path);
		try { await navigator.clipboard?.writeText(text); } catch { /* clipboard may be blocked */ }
		statusInfo = `Path copied: ${text}`;
	}

	// Library context menu for the right pane. Acts on the current selection when the
	// right-clicked row is part of it, otherwise on just that row (Explorer behaviour).
	function rightMenu(
		{ node, controller }: TreeMenuContext<RightItem>): TreeMenuEntry<RightItem>[] {
		const selected = controller.getSelectedNodes();
		const data = node.data!;
		const inSel = rightSel.has(data.treePath);
		const targets: FsNode[] = inSel && selected?.length ? selected.map((s) => s.data!) : [data];
		return [
			{ text: 'Open', icon: data.kind === 'folder' ? '📂' : '📄', onClick: () => open(data) },
			{ divider: true },
			{ text: 'Copy path', icon: '📋', onClick: () => copyPath(data) },
			{ text: 'Rename', icon: '✎', isDisabled: targets.length !== 1, onClick: () => renameNode(targets[0]) },
			{ text: `Delete${targets.length > 1 ? ` (${targets.length})` : ''}`, icon: '🗑', isDanger: true, onClick: () => runDeleteCommand(targets) },
			{ divider: true },
			{ text: 'New folder', icon: '🗀', onClick: () => newFolder() },
			{ text: 'Select all', onClick: () => selectAll() }
		];
	}

	function navSort({ nodes: items }: { nodes: LTreeNode<FsNode>[] }) {
		return [...items].sort((a, b) => collator.compare(a.data?.name ?? '', b.data?.name ?? ''));
	}

	onMount(() => {
		// Reveal C:\Windows in the nav tree on first paint.
		revealInTree(currentPath);
	});
</script>

<div class="winx" role="application" aria-label="File Explorer">
	<!-- Title bar -->
	<div class="winx__titlebar">
		<span class="winx__title">📁 {byPath(currentPath)?.name ?? 'Explorer'}</span>
		<div class="winx__winbtns" aria-hidden="true">
			<span class="winx__winbtn">—</span>
			<span class="winx__winbtn">▢</span>
			<span class="winx__winbtn winx__winbtn--close">✕</span>
		</div>
	</div>

	<!-- Command bar -->
	<div class="winx__commandbar">
		<button class="winx__navbtn" disabled={!canBack} onclick={goBack} title="Back" aria-label="Back">←</button>
		<button class="winx__navbtn" disabled={!canFwd} onclick={goForward} title="Forward" aria-label="Forward">→</button>
		<button class="winx__navbtn" disabled={!canUp} onclick={goUp} title="Up" aria-label="Up">↑</button>

		<!-- Address bar / breadcrumb -->
		<div class="winx__address">
			{#each breadcrumb as crumb, i (crumb.path)}
				<button class="winx__crumb" onclick={() => navigateTo(crumb.path)}>{crumb.name}</button>
				{#if i < breadcrumb.length - 1}<span class="winx__crumb-sep">›</span>{/if}
			{/each}
		</div>

		<div class="winx__search">
			<span class="winx__search-icon" aria-hidden="true">🔎</span>
			<input
				type="text"
				placeholder="Search {byPath(currentPath)?.name ?? ''}"
				bind:value={filter}
				aria-label="Search current folder and subfolders"
			/>
		</div>
	</div>

	<!-- Action bar -->
	<div class="winx__actionbar">
		<button class="winx__action" onclick={newFolder}>🗀 New folder</button>
		<span class="winx__sep"></span>
		<button class="winx__action" disabled={selectedCount !== 1} onclick={() => renameNode(selectedNodes[0])}>✎ Rename</button>
		<button class="winx__action winx__action--danger" disabled={selectedCount === 0} onclick={() => runDeleteCommand(selectedNodes)}>🗑 Delete</button>
	</div>

	<!-- Body: nav pane + contents pane -->
	<div class="winx__body">
		<div class="winx__nav">
			<Tree
				bind:this={navTreeRef}
				bind:expandedPaths={navExpanded}
				nodes={folderData}
				idMember="id"
				pathMember="path"
				sortCallback={navSort}
				isSorted={true}
				expandLevel={2}
				clickBehavior="select"
				leafIconClass=""
				bind:focusedNode={focusedFolder}
				onNodeClick={({ node }) => { if (node) navigateTo(node.path, { syncTree: false }); }}
				onNodeDoubleClick={({ node }) => { if (node) navigateTo(node.path); }}
			>
				{#snippet nodeTemplate(node: LTreeNode<FsNode>)}
					<span class="winx__navrow">
						<span class="winx__navicon">📁</span>{node.data?.name}
					</span>
				{/snippet}
			</Tree>
		</div>

		<!-- Right pane: a second <Tree> rendering the details list -->
		<div class="winx__contents">
			<!-- column header (sticky; shares the row grid template) -->
			<div class="winx__cols">
				<button class="winx__col winx__col--name" onclick={() => sortBy('name')}>
					Name {sortKey === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
				</button>
				<button class="winx__col winx__col--date" onclick={() => sortBy('modified')}>
					Date modified {sortKey === 'modified' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
				</button>
				<button class="winx__col winx__col--type" onclick={() => sortBy('type')}>
					Type {sortKey === 'type' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
				</button>
				<button class="winx__col winx__col--size" onclick={() => sortBy('size')}>
					Size {sortKey === 'size' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
				</button>
			</div>

			<div class="winx-right" aria-label="Folder contents">
				<Tree
					nodes={rightTreeData}
					idMember="id"
					pathMember="treePath"
					sortCallback={keepRightOrder}
					isSorted={true}
					expandLevel={1}
					clickBehavior="select"
					selectionMode="multiple"
					leafIconClass=""
					getNodeClassCallback={rightNodeClass}
					bind:selectedPaths={rightSel}
					onNodeClick={({ node }) => { if (node?.data) statusInfo = previewText(node.data); }}
					onNodeDoubleClick={({ node }) => { if (node?.data) open(node.data); }}
					getContextMenuItemsCallback={rightMenu}
				>
					{#snippet nodeTemplate(node: LTreeNode<RightItem>)}
						{@const item = node.data!}
						<span class="winx__cell winx__cell--name">
							<span class="winx__rowicon">{iconFor(item)}</span>
							<span class="winx__namebox">
								<span class="winx__rowname">{item.name}</span>
								{#if isSearching}
									<span class="winx__rowloc">in {byPath(currentPath)?.name}{locationOf(item.path) ? ' \\ ' + locationOf(item.path) : ''}</span>
								{/if}
							</span>
						</span>
						<span class="winx__cell winx__cell--date">{item.modified}</span>
						<span class="winx__cell winx__cell--type">{typeLabel(item)}</span>
						<span class="winx__cell winx__cell--size">{formatSize(item.size)}</span>
					{/snippet}
				</Tree>

				{#if rightTreeData.length === 0}
					<div class="winx__empty">
						{filter ? `No items match "${filter}".` : 'This folder is empty.'}
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Status bar -->
	<div class="winx__status">
		<span>{rightTreeData.length} item{rightTreeData.length === 1 ? '' : 's'}</span>
		{#if selectedCount > 0}<span class="winx__status-sel">{selectedCount} item{selectedCount === 1 ? '' : 's'} selected</span>{/if}
		{#if statusInfo}<span class="winx__status-info">{statusInfo}</span>{/if}
	</div>
</div>

<style>
	/* kmwc-fixed-colors: imitation of the Windows 11 File Explorer skin — its own light and
	   dark palettes (light-dark(), so it follows the examples theme switch like Windows'
	   app mode). The red title bar is the demo's window chrome in both modes. */
	.winx {
		--winx-accent: light-dark(#0067c0, #4cc2ff);
		--winx-border: light-dark(#d9d9d9, #3a3a3a);
		--winx-frame-border: light-dark(#c8c8c8, #454545);
		--winx-text: light-dark(#1b1b1b, #ffffff);
		--winx-text-2: light-dark(#444444, #c8c8c8);
		--winx-text-3: light-dark(#8a8a8a, #9d9d9d);
		--winx-disabled: light-dark(#b0b0b0, #6e6e6e);
		--winx-bg: light-dark(#f3f3f3, #202020);
		--winx-bar-bg: light-dark(#fafafa, #2b2b2b);
		--winx-field-bg: light-dark(#ffffff, #1f1f1f);
		--winx-nav-bg: light-dark(#fbfbfb, #1c1c1c);
		--winx-pane-bg: light-dark(#ffffff, #191919);
		--winx-hover: light-dark(#eaeaea, #333333);
		--winx-crumb-hover: light-dark(#eef5fd, #333333);
		--winx-action-hover-bg: light-dark(#eaf2fb, #2d2d2d);
		--winx-action-hover-border: light-dark(#cfe3f7, #454545);
		--winx-danger-hover-bg: light-dark(#fdeaea, #3d2526);
		--winx-danger-hover-border: light-dark(#f3caca, #6a3335);
		--winx-col-rule: light-dark(#eeeeee, #2e2e2e);
		--winx-col-hover: light-dark(#f5f5f5, #262626);
		--winx-row-hover: light-dark(#f2f7fd, #262626);
		--winx-sel-bg: light-dark(#cfe5fb, #1d3a55);
		--winx-sel-ring: light-dark(#a8cef0, #2f6390);
		--winx-sel-hover: light-dark(#c3ddf8, #234563);
		--winx-cols: minmax(180px, 2fr) 1.2fr 1.2fr 0.8fr; /* header + row grid tracks */
		container: winx / inline-size;
		font-family: 'Segoe UI', system-ui, sans-serif;
		font-size: 13px;
		color: var(--winx-text);
		background: var(--winx-bg);
		border: 1px solid var(--winx-frame-border);
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 12px 40px light-dark(rgba(0, 0, 0, 0.22), rgba(0, 0, 0, 0.6));
		display: flex;
		flex-direction: column;
		height: 620px;
		user-select: none;
	}

	/* Skin buttons are sized by the skin, not by the kit's control height / button fill. */
	.winx button {
		min-height: 0;
		line-height: normal;
	}

	/* Title bar */
	.winx__titlebar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 32px;
		flex-shrink: 0;
		padding: 0 0 0 12px;
		background: linear-gradient(180deg, #d23b3b 0%, #c42d2d 100%);
		color: #fff;
	}
	.winx__title {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 12.5px;
		font-weight: 500;
	}
	.winx__winbtns { display: flex; height: 100%; flex-shrink: 0; }
	.winx__winbtn {
		display: flex; align-items: center; justify-content: center;
		width: 46px; height: 100%; font-size: 12px;
	}
	.winx__winbtn--close { background: rgba(255, 255, 255, 0.08); }

	/* Command bar */
	.winx__commandbar {
		display: flex; align-items: center; gap: 4px;
		padding: 6px 8px; background: var(--winx-bar-bg); border-bottom: 1px solid var(--winx-border);
	}
	.winx__navbtn {
		width: 30px; height: 28px; padding: 0; border: none; background: transparent; border-radius: 4px;
		font-size: 15px; color: var(--winx-text-2); flex-shrink: 0;
	}
	.winx__navbtn:hover { background: transparent; }
	.winx__navbtn:hover:not(:disabled) { background: var(--winx-hover); }
	.winx__navbtn:disabled { color: var(--winx-disabled); cursor: default; opacity: 1; }

	.winx__address {
		flex: 1; display: flex; align-items: center; gap: 1px; min-width: 0;
		height: 28px; padding: 0 8px; margin: 0 4px;
		background: var(--winx-field-bg); border: 1px solid var(--winx-border); border-radius: 4px;
		overflow: hidden; white-space: nowrap;
	}
	.winx__crumb {
		border: none; background: transparent; padding: 3px 6px;
		border-radius: 3px; font-size: 13px; color: var(--winx-text); flex-shrink: 0;
	}
	.winx__crumb:hover { background: var(--winx-crumb-hover); }
	.winx__crumb-sep { color: var(--winx-text-3); font-size: 12px; }

	.winx__search {
		display: flex; align-items: center; gap: 4px; width: 200px; height: 28px; flex-shrink: 0;
		padding: 0 8px; background: var(--winx-field-bg); border: 1px solid var(--winx-border); border-radius: 4px;
	}
	.winx__search-icon { font-size: 11px; opacity: 0.6; }
	.winx__search input {
		flex: 1; min-width: 0; height: auto; padding: 0;
		border: none; outline: none; box-shadow: none; font: inherit; color: var(--winx-text); background: transparent;
	}
	.winx__search input::placeholder { color: var(--winx-text-3); }

	/* Action bar */
	.winx__actionbar {
		display: flex; flex-wrap: wrap; align-items: center; gap: 2px;
		padding: 4px 8px; background: var(--winx-bg); border-bottom: 1px solid var(--winx-border);
	}
	.winx__action {
		display: inline-flex; align-items: center; gap: 6px;
		border: 1px solid transparent; background: transparent; border-radius: 4px;
		padding: 4px 10px; font: inherit; color: var(--winx-text);
	}
	.winx__action:hover { background: transparent; }
	.winx__action:hover:not(:disabled) { background: var(--winx-action-hover-bg); border-color: var(--winx-action-hover-border); }
	.winx__action:disabled { color: var(--winx-disabled); cursor: default; opacity: 1; }
	.winx__action--danger:hover:not(:disabled) { background: var(--winx-danger-hover-bg); border-color: var(--winx-danger-hover-border); }
	.winx__sep { width: 1px; height: 20px; background: var(--winx-border); margin: 0 6px; }

	/* Body */
	.winx__body { flex: 1; display: flex; min-height: 0; }
	.winx__nav {
		width: 250px; flex-shrink: 0; overflow: auto;
		background: var(--winx-nav-bg); border-right: 1px solid var(--winx-border); padding: 6px 4px;
	}
	/* The library declares its --stv-* on .stv__container, so the skin sets them there:
	   Explorer density, the pane colours, Windows-blue selection. */
	.winx__nav :global(.stv__container) {
		--stv-node-padding: 2px 6px;
		--stv-font-size: 13px;
		--stv-node-border-radius: 4px;
		--stv-main-bg: var(--winx-nav-bg);
		--stv-text-color-1: var(--winx-text);
		--stv-accent-color: var(--winx-accent);
	}
	.winx__navrow { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
	.winx__navicon { font-size: 13px; }

	/* Right pane: header + the details <Tree> share ONE sticky-header scroll area,
	   so the column tracks line up regardless of the scrollbar. */
	.winx__contents { flex: 1; min-width: 0; overflow: auto; background: var(--winx-pane-bg); }

	/* Column header (sticky, same track template as each row) */
	.winx__cols {
		position: sticky; top: 0; z-index: 2;
		display: grid; grid-template-columns: var(--winx-cols);
		border-bottom: 1px solid var(--winx-border); background: var(--winx-pane-bg);
	}
	.winx__col {
		text-align: left; border: none; border-radius: 0; background: transparent;
		padding: 6px 10px; font: inherit; font-weight: 500; color: var(--winx-text-2);
		border-right: 1px solid var(--winx-col-rule); white-space: nowrap; overflow: hidden;
	}
	.winx__col:hover { background: var(--winx-col-hover); }
	.winx__col--size { text-align: right; }

	/* The right <Tree>: flatten the row chrome and turn each row's content into the
	   same grid as the header so columns align. */
	.winx-right :global(.stv__container) {
		--stv-indent-size: 0; /* flat list — no indentation */
		--stv-main-bg: var(--winx-pane-bg);
		--stv-text-color-1: var(--winx-text);
		--stv-accent-color: var(--winx-accent);
	}
	.winx-right :global(.stv__toggle-icon) { display: none; }       /* no chevrons in a flat list */
	.winx-right :global(.stv__node) { margin-left: 0 !important; }
	.winx-right :global(.stv__node-row) { display: block; }
	.winx-right :global(.stv__node-content) {
		display: grid;
		grid-template-columns: var(--winx-cols);
		align-items: center;
		width: 100%;
		padding: 0;
		border: 0;
		border-radius: 0;
	}
	.winx-right :global(.stv__node-content:hover) { background: var(--winx-row-hover); }
	/* library highlight = our selection look (background-only so the grid never shifts) */
	.winx-right :global(.stv__node-content--selected) { background: var(--winx-sel-bg); box-shadow: inset 0 0 0 1px var(--winx-sel-ring); }
	.winx-right :global(.stv__node-content--selected:hover) { background: var(--winx-sel-hover); }

	.winx__cell { padding: 3px 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--winx-text); min-width: 0; }
	.winx__cell--name { display: flex; align-items: center; gap: 8px; }
	.winx__cell--date, .winx__cell--type { color: var(--winx-text-2); }
	.winx__cell--size { text-align: right; color: var(--winx-text-2); }
	.winx__rowicon { font-size: 14px; }
	.winx__namebox { display: flex; flex-direction: column; min-width: 0; line-height: 1.25; }
	.winx__rowname { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.winx__rowloc { font-size: 11px; color: var(--winx-text-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.winx__empty { padding: 24px; text-align: center; color: var(--winx-text-3); }

	/* Status bar */
	.winx__status {
		display: flex; align-items: center; gap: 16px; height: 26px; flex-shrink: 0;
		padding: 0 12px; background: var(--winx-bg); border-top: 1px solid var(--winx-border);
		font-size: 12px; color: var(--winx-text-2); white-space: nowrap; overflow: hidden;
	}
	.winx__status-sel { color: var(--winx-text); }
	.winx__status-info { color: var(--winx-accent); margin-left: auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; }

	/* A narrow window (a phone): the search drops under the address bar, the nav pane
	   stacks above the details list, and the details keep only Name + Size. */
	@container winx (max-width: 640px) {
		.winx__commandbar { flex-wrap: wrap; }
		.winx__search { order: 1; width: 100%; }
		.winx__body { flex-direction: column; }
		.winx__nav {
			width: auto; max-height: 38%;
			border-right: none; border-bottom: 1px solid var(--winx-border);
		}
		.winx__contents { --winx-cols: minmax(0, 1fr) 5.5rem; }
		.winx__col--date,
		.winx__col--type,
		.winx__cell--date,
		.winx__cell--type { display: none; }
	}
</style>
