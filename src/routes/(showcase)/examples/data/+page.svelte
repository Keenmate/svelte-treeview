<script lang="ts">
	import Tree from '$lib/components/Tree.svelte';
	import type { LTreeNode, InsertArrayResult } from '$lib/ltree/types.js';
	import type { TreeMenuContext, TreeMenuEntry } from '$lib/core/menu.js';
	import RenderModeSwitch from '../RenderModeSwitch.svelte';
	import LogPanel, { logLine, type LogEntry } from '../../LogPanel.svelte';
	import { getTreeProps } from '../render-mode.svelte.js';

	type FileItem = {
		id: number;
		path: string;
		name: string;
	};

	// Standard dot-separated paths
	const dotSeparatorData: FileItem[] = [
		{ id: 1, path: '1', name: 'Root' },
		{ id: 2, path: '1.1', name: 'Child 1' },
		{ id: 3, path: '1.2', name: 'Child 2' },
		{ id: 4, path: '1.1.1', name: 'Grandchild' }
	];

	// Slash-separated paths (like file paths)
	const slashSeparatorData = [
		{ id: 1, path: 'home', name: '/home' },
		{ id: 2, path: 'home/user', name: '/home/user' },
		{ id: 3, path: 'home/user/documents', name: '/home/user/documents' },
		{ id: 4, path: 'home/user/downloads', name: '/home/user/downloads' },
		{ id: 5, path: 'var', name: '/var' },
		{ id: 6, path: 'var/log', name: '/var/log' }
	];

	// Double-colon separated paths (like namespaces)
	const colonSeparatorData = [
		{ id: 1, path: 'App', name: 'App' },
		{ id: 2, path: 'App::Services', name: 'App::Services' },
		{ id: 3, path: 'App::Services::Auth', name: 'App::Services::Auth' },
		{ id: 4, path: 'App::Models', name: 'App::Models' },
		{ id: 5, path: 'App::Models::User', name: 'App::Models::User' }
	];

	// Data with potential issues (for insert result demo)
	const problematicData: FileItem[] = [
		{ id: 1, path: '1', name: 'Valid Root' },
		{ id: 2, path: '1.1', name: 'Valid Child' },
		{ id: 3, path: '2.1', name: 'Orphan (parent 2 missing)' },
		{ id: 4, path: '1.1', name: 'Duplicate Path' },
		{ id: 5, path: '', name: 'Empty Path' },
		{ id: 6, path: '1.2', name: 'Another Valid Child' }
	];

	let insertResult = $state<InsertArrayResult<FileItem> | null>(null);

	// Display-value fallback demo: a tree with no displayValueMember / getDisplayValueCallback
	// falls back to this text for every node label (also what the touch-drag ghost shows).
	let displayValueFallbackText = $state('(no name)');

	function sortByName({ nodes: items }: { nodes: LTreeNode<FileItem>[] }) {
		return [...items].sort((a, b) => (a.data?.name || '').localeCompare(b.data?.name || ''));
	}

	// ── Branch Operations demo ─────────────────────────────────────────
	// addBranch(parentPath, nodes) and removeBranch(path[, childrenOnly]) mutate a
	// whole subtree in one call, each emitting a single change. This org-chart demo
	// wires them to a context-menu cut/paste with a simulated server round-trip that
	// recalculates paths + IDs before the branch lands at its new home.
	type DemoNode = {
		id: number;
		path: string;
		name: string;
		icon: string;
		sortOrder: number;
	};

	function createInitialData(): DemoNode[] {
		return [
			{ id: 1, path: '1', name: 'Company', icon: '🏢', sortOrder: 10 },
			{ id: 2, path: '1.1', name: 'Engineering', icon: '⚙️', sortOrder: 10 },
			{ id: 3, path: '1.1.1', name: 'Frontend', icon: '🎨', sortOrder: 10 },
			{ id: 4, path: '1.1.1.1', name: 'Alice', icon: '👤', sortOrder: 10 },
			{ id: 5, path: '1.1.1.2', name: 'Bob', icon: '👤', sortOrder: 20 },
			{ id: 6, path: '1.1.2', name: 'Backend', icon: '🔧', sortOrder: 20 },
			{ id: 7, path: '1.1.2.1', name: 'Charlie', icon: '👤', sortOrder: 10 },
			{ id: 8, path: '1.1.2.2', name: 'Dave', icon: '👤', sortOrder: 20 },
			{ id: 9, path: '1.2', name: 'Design', icon: '🎯', sortOrder: 20 },
			{ id: 10, path: '1.2.1', name: 'UX', icon: '✏️', sortOrder: 10 },
			{ id: 11, path: '1.2.1.1', name: 'Diana', icon: '👤', sortOrder: 10 },
			{ id: 12, path: '1.2.1.2', name: 'Frank', icon: '👤', sortOrder: 20 },
			{ id: 13, path: '1.2.2', name: 'Visual', icon: '🖼️', sortOrder: 20 },
			{ id: 14, path: '1.2.2.1', name: 'Grace', icon: '👤', sortOrder: 10 },
			{ id: 15, path: '2', name: 'Operations', icon: '📋', sortOrder: 20 },
			{ id: 16, path: '2.1', name: 'HR', icon: '🤝', sortOrder: 10 },
			{ id: 17, path: '2.1.1', name: 'Recruiting', icon: '📣', sortOrder: 10 },
			{ id: 18, path: '2.1.1.1', name: 'Hank', icon: '👤', sortOrder: 10 },
			{ id: 19, path: '2.1.2', name: 'Culture', icon: '🎭', sortOrder: 20 },
			{ id: 20, path: '2.2', name: 'Finance', icon: '💰', sortOrder: 20 },
			{ id: 21, path: '2.2.1', name: 'Accounting', icon: '📊', sortOrder: 10 },
			{ id: 22, path: '2.2.2', name: 'Payroll', icon: '💳', sortOrder: 20 },
			{ id: 23, path: '3', name: 'Sales', icon: '📈', sortOrder: 30 },
			{ id: 24, path: '3.1', name: 'Enterprise', icon: '🏛️', sortOrder: 10 },
			{ id: 25, path: '3.1.1', name: 'EMEA', icon: '🌍', sortOrder: 10 },
			{ id: 26, path: '3.1.2', name: 'APAC', icon: '🌏', sortOrder: 20 },
			{ id: 27, path: '3.1.3', name: 'Americas', icon: '🌎', sortOrder: 30 },
			{ id: 28, path: '3.2', name: 'SMB', icon: '🏪', sortOrder: 20 },
			{ id: 29, path: '3.2.1', name: 'Inbound', icon: '📥', sortOrder: 10 },
			{ id: 30, path: '3.2.2', name: 'Outbound', icon: '📤', sortOrder: 20 }
		];
	}

	let treeData = $state<DemoNode[]>(createInitialData());
	let treeRef: Tree<DemoNode>;
	let selectedNode = $state<LTreeNode<DemoNode> | null>(null);
	let activityLog = $state<LogEntry[]>([]);
	let nextId = 200;

	// Server simulation
	let serverDelay = $state(1500);
	let isProcessing = $state(false);
	let processingMessage = $state('');

	// Cut clipboard — snapshot of branch data for server request
	interface CutClipboard {
		sourcePath: string;
		sourceName: string;
		nodes: DemoNode[];
	}
	let cutClipboard = $state<CutClipboard | null>(null);

	function sortByOrder({ nodes: items }: { nodes: LTreeNode<DemoNode>[] }) {
		return [...items].sort((a, b) => {
			if (a.parentPath !== b.parentPath) {
				return (a.parentPath || '').localeCompare(b.parentPath || '');
			}
			return (a.data?.sortOrder ?? 0) - (b.data?.sortOrder ?? 0);
		});
	}

	// Timeline lines (time · operation · detail) for the kit's log panel; newest at the bottom.
	function addLog(name: string, detail: string, variant?: 'info' | 'success' | 'warning' | 'danger') {
		activityLog = [...activityLog.slice(-49), logLine(name, detail, variant)];
	}

	function resetTree() {
		nextId = 200;
		treeData = createInitialData();
		selectedNode = null;
		cutClipboard = null;
		isProcessing = false;
		activityLog = [];
	}

	function collectBranchData(node: LTreeNode<DemoNode>): DemoNode[] {
		const result: DemoNode[] = [];
		if (!node.data) return result;
		result.push({ ...node.data });

		const walkChildren = (n: LTreeNode<DemoNode>) => {
			for (const child of Object.values(n.children)) {
				if (child.data) result.push({ ...child.data });
				walkChildren(child);
			}
		};
		walkChildren(node);
		return result;
	}

	// Simulated server: recalculate paths for moved branch
	function simulateServerMoveBranch(
		sourceNodes: DemoNode[],
		targetParentPath: string
	): Promise<DemoNode[]> {
		return new Promise((resolve) => {
			setTimeout(() => {
				const oldRootPath = sourceNodes[0].path;
				const newRootId = nextId++;
				const newRootPath = targetParentPath ? `${targetParentPath}.${newRootId}` : `${newRootId}`;

				const result: DemoNode[] = sourceNodes.map((n) => {
					let newPath: string;

					if (n.path === oldRootPath) {
						newPath = newRootPath;
					} else {
						const suffix = n.path.substring(oldRootPath.length);
						newPath = newRootPath + suffix;
					}

					return { ...n, id: nextId++, path: newPath, sortOrder: n.sortOrder };
				});

				resolve(result);
			}, serverDelay);
		});
	}

	function doCut(node: LTreeNode<DemoNode>, close: () => void) {
		const nodes = collectBranchData(node);
		cutClipboard = {
			sourcePath: node.path,
			sourceName: node.data?.name || node.path,
			nodes
		};
		addLog('cut', `"${node.data?.name}" (${nodes.length} node${nodes.length > 1 ? 's' : ''})`);
		close();
	}

	async function doPaste(targetNode: LTreeNode<DemoNode>, close: () => void) {
		if (!cutClipboard) return;

		const { sourcePath, sourceName, nodes: sourceNodes } = cutClipboard;
		const targetPath = targetNode.path;
		const targetName = targetNode.data?.name || targetPath;

		// Prevent pasting into self or descendants
		if (targetPath === sourcePath || targetPath.startsWith(sourcePath + '.')) {
			addLog('paste', `Cannot paste "${sourceName}" into itself or its own descendant`, 'warning');
			close();
			return;
		}

		cutClipboard = null;
		close();
		isProcessing = true;
		processingMessage = `Moving "${sourceName}" under "${targetName}"...`;
		addLog('server', `Sending move request: "${sourceName}" -> "${targetName}" (${sourceNodes.length} nodes)`, 'info');

		const startTime = performance.now();

		try {
			// 1. Simulate server call
			const serverResult = await simulateServerMoveBranch(sourceNodes, targetPath);
			const serverTime = (performance.now() - startTime).toFixed(0);

			processingMessage = `Server responded (${serverTime}ms). Applying changes...`;

			// 2. Delete old branch
			const deleteResult = treeRef.removeBranch(sourcePath);
			if (!deleteResult.success) {
				addLog('removeBranch', `Failed to remove source: ${deleteResult.error}`, 'danger');
				isProcessing = false;
				return;
			}

			// 3. Insert new branch at target with server-recalculated data
			const insertBranchResult = treeRef.addBranch(targetPath, serverResult);

			// 4. Expand the target so pasted branch is visible
			treeRef.expandNodes(targetPath);

			const totalTime = (performance.now() - startTime).toFixed(0);

			addLog(
				'move',
				`Moved "${sourceName}" under "${targetName}": ` +
					`deleted ${deleteResult.count}, inserted ${insertBranchResult.count} nodes. ` +
					`Server: ${serverTime}ms, total: ${totalTime}ms`,
				'success'
			);
		} catch (err) {
			addLog('server', `Server error: ${err}`, 'danger');
		} finally {
			isProcessing = false;
			processingMessage = '';
		}
	}

	function getContextMenu({ node, controller }: TreeMenuContext<DemoNode>): TreeMenuEntry<DemoNode>[] {
		const close = () => controller.closeContextMenu();
		const items: TreeMenuEntry<DemoNode>[] = [];

		// Cut
		items.push({
			icon: '✂️',
			text: 'Cut branch',
			isDisabled: isProcessing,
			onClick: () => doCut(node, close)
		});

		// Paste
		if (cutClipboard) {
			const canPaste =
				node.path !== cutClipboard.sourcePath && !node.path.startsWith(cutClipboard.sourcePath + '.');
			items.push({
				icon: '📌',
				text: `Paste "${cutClipboard.sourceName}" here`,
				isDisabled: !canPaste || isProcessing,
				onClick: () => doPaste(node, close)
			});
		}

		if (cutClipboard) {
			items.push({
				icon: '❌',
				text: 'Cancel cut',
				onClick: () => {
					cutClipboard = null;
					addLog('cut', 'Cut cancelled');
					close();
				}
			});
		}

		items.push({ divider: true, text: 'Branch Ops' });

		// Insert branch
		items.push({
			icon: '➕',
			text: 'Insert branch (6 nodes)',
			isDisabled: isProcessing,
			onClick: () => {
				const basePath = `${node.path}.${nextId}`;
				const newNodes: DemoNode[] = [
					{ id: nextId++, path: basePath, name: 'New Team', icon: '📁', sortOrder: 50 },
					{ id: nextId++, path: `${basePath}.1`, name: 'Member A', icon: '👤', sortOrder: 10 },
					{ id: nextId++, path: `${basePath}.2`, name: 'Member B', icon: '👤', sortOrder: 20 },
					{ id: nextId++, path: `${basePath}.3`, name: 'Sub-group', icon: '📂', sortOrder: 30 },
					{ id: nextId++, path: `${basePath}.3.1`, name: 'Member C', icon: '👤', sortOrder: 10 },
					{ id: nextId++, path: `${basePath}.3.2`, name: 'Member D', icon: '👤', sortOrder: 20 }
				];
				const result = treeRef.addBranch(node.path, newNodes);
				addLog('addBranch', `Added ${result.count} nodes under "${node.data?.name}"`);
				close();
			}
		});

		// Delete
		items.push({
			icon: '🗑️',
			text: 'Delete branch',
			isDanger: true,
			isDisabled: isProcessing,
			onClick: () => {
				const result = treeRef.removeBranch(node.path);
				addLog('removeBranch', `Removed "${node.data?.name}" (${result.count} nodes)`);
				selectedNode = null;
				close();
			}
		});

		if (node.hasChildren) {
			items.push({
				icon: '🧹',
				text: 'Clear children only',
				isDisabled: isProcessing,
				onClick: () => {
					const result = treeRef.removeBranch(node.path, true);
					addLog('removeBranch', `Cleared ${result.count} children from "${node.data?.name}"`);
					close();
				}
			});
		}

		return items;
	}
</script>

<svelte:head>
	<title>Data Structures - Svelte Treeview</title>
</svelte:head>

<header class="example-header">
	<a href="/" class="back-link">&larr; Back to Examples</a>
	<h1>Data Structures</h1>
	<p class="subtitle">Path-based hierarchy, custom separators, validation, and bulk branch operations</p>
	<RenderModeSwitch />
</header>

<!-- Path-Based Data Structure -->
<div class="card">
	<h2>DS01 · Path-Based Data Structure</h2>
	<p class="description">The tree uses path strings to define hierarchy. Each item needs a unique path that encodes its position in the tree.</p>

	<div class="grid-2">
		<div>
			<h3>Data Structure</h3>
			<div class="code-block">
				<pre>{`// Your data items
const data = [
  { id: 1, path: '1', name: 'Root' },
  { id: 2, path: '1.1', name: 'Child 1' },
  { id: 3, path: '1.2', name: 'Child 2' },
  { id: 4, path: '1.1.1', name: 'Grandchild' }
];

// Tree component
<Tree
  nodes={data}
  idMember="id"
  pathMember="path"
  sortCallback={sortByName}
/>`}</pre>
			</div>
		</div>

		<div>
			<h3>Result</h3>
			<div class="tree-container">
				<Tree
					nodes={dotSeparatorData}
					idMember="id"
					pathMember="path"
					sortCallback={sortByName}
					isSorted={true}
					expandLevel={3}
					{...getTreeProps()}
				>
					{#snippet nodeTemplate(node: any)}
						<span>{node.data?.name} <code>({node.path})</code></span>
					{/snippet}
				</Tree>
			</div>
		</div>
	</div>

	<div class="note">
		<p class="note-title">How Paths Work</p>
		<ul>
			<li><strong>Path "1"</strong> is a root node</li>
			<li><strong>Path "1.1"</strong> is a child of "1"</li>
			<li><strong>Path "1.1.1"</strong> is a child of "1.1" (grandchild of "1")</li>
			<li>The separator (default ".") splits path into segments</li>
		</ul>
	</div>
</div>

<!-- Display Value Fallback -->
<div class="card">
	<h2>DS02 · Display Value Fallback</h2>
	<p class="description">
		A node's label comes from <code>getNodeDisplayValue</code>, resolved in order:
		<code>displayValueMember</code> &rarr; <code>getDisplayValueCallback</code> &rarr;
		<code>labels.noDisplayValue</code>. When a tree configures neither a member nor a
		callback (or a node has no <code>data</code>), the fallback text is shown for every
		node — this is also what the touch-drag ghost displays. Default is <code>'[N/A]'</code>,
		and it's now configurable per-tree (and live-updatable).
	</p>

	<div class="controls">
		<label for="fallback-input">Fallback text:</label>
		<input
			id="fallback-input"
			class="w-lg"
			type="text"
			bind:value={displayValueFallbackText}
			placeholder="[N/A]"
		/>
		<span class="muted">Type here — the right-hand tree updates live.</span>
	</div>

	<div class="grid-2">
		<div>
			<h3>With <code>displayValueMember="name"</code></h3>
			<div class="tree-container">
				<Tree
					nodes={dotSeparatorData}
					idMember="id"
					pathMember="path"
					displayValueMember="name"
					sortCallback={sortByName}
					isSorted={true}
					expandLevel={3}
					{...getTreeProps()}
				/>
			</div>
		</div>

		<div>
			<h3>No member / no callback &rarr; fallback</h3>
			<div class="tree-container">
				<Tree
					nodes={dotSeparatorData}
					idMember="id"
					pathMember="path"
					labels={{ noDisplayValue: displayValueFallbackText }}
					sortCallback={sortByName}
					isSorted={true}
					expandLevel={3}
					{...getTreeProps()}
				/>
			</div>
		</div>
	</div>

	<div class="code-block">
		<pre>{`<Tree
  nodes={data}
  idMember="id"
  pathMember="path"
  labels={{ noDisplayValue: '${displayValueFallbackText}' }}
/>`}</pre>
	</div>

	<div class="note">
		<p class="note-title">Resolution order</p>
		<ul>
			<li><strong>displayValueMember</strong> — used when set and the node has data (wins over the callback)</li>
			<li><strong>getDisplayValueCallback</strong> — used when no member (or the node has no data)</li>
			<li><strong>labels.noDisplayValue</strong> — used only when neither resolves; set <code>""</code> to render nothing</li>
		</ul>
	</div>
</div>

<!-- Custom Path Separators -->
<div class="card">
	<h2>DS03 · Custom Path Separators</h2>
	<p class="description">Use <code>treePathSeparator</code> to change the path delimiter.</p>

	<div class="grid-2">
		<!-- Slash separator (file paths) -->
		<div>
			<h3>Slash Separator (File Paths)</h3>
			<div class="tree-container">
				<Tree
					nodes={slashSeparatorData}
					idMember="id"
					pathMember="path"
					sortCallback={sortByName}
					isSorted={true}
					expandLevel={3}
					treePathSeparator="/"
					{...getTreeProps()}
				>
					{#snippet nodeTemplate(node: any)}
						<span>{node.data?.name}</span>
					{/snippet}
				</Tree>
			</div>
			<div class="code-block">
				<pre>{`<Tree
  treePathSeparator="/"
  ...
/>`}</pre>
			</div>
		</div>

		<!-- Double-colon separator (namespaces) -->
		<div>
			<h3>Double-Colon Separator (Namespaces)</h3>
			<div class="tree-container">
				<Tree
					nodes={colonSeparatorData}
					idMember="id"
					pathMember="path"
					sortCallback={sortByName}
					isSorted={true}
					expandLevel={3}
					treePathSeparator="::"
					{...getTreeProps()}
				>
					{#snippet nodeTemplate(node: any)}
						<span>{node.data?.name}</span>
					{/snippet}
				</Tree>
			</div>
			<div class="code-block">
				<pre>{`<Tree
  treePathSeparator="::"
  ...
/>`}</pre>
			</div>
		</div>
	</div>
</div>

<!-- Insert Result and Validation -->
<div class="card">
	<h2>DS04 · Insert Result and Validation</h2>
	<p class="description">Use the <code>insertResult</code> bindable prop to get information about data insertion, including any failed items.</p>

	<div class="grid-2">
		<div>
			<h3>Problematic Data</h3>
			<div class="code-block">
				<pre>{`const data = [
  { id: 1, path: '1', name: 'Valid Root' },
  { id: 2, path: '1.1', name: 'Valid Child' },
  // Orphan - parent '2' doesn't exist
  { id: 3, path: '2.1', name: 'Orphan' },
  // Duplicate path
  { id: 4, path: '1.1', name: 'Duplicate' },
  // Empty path
  { id: 5, path: '', name: 'Empty Path' },
  { id: 6, path: '1.2', name: 'Valid Child 2' }
];`}</pre>
			</div>
		</div>

		<div>
			<h3>Tree (valid items only)</h3>
			<div class="tree-container">
				<Tree
					nodes={problematicData}
					idMember="id"
					pathMember="path"
					sortCallback={sortByName}
					isSorted={true}
					expandLevel={3}
					bind:insertResult
					{...getTreeProps()}
				>
					{#snippet nodeTemplate(node: any)}
						<span>{node.data?.name}</span>
					{/snippet}
				</Tree>
			</div>
		</div>
	</div>

	{#if insertResult}
		<div class="output">
			<p class="output-label">Insert Result:</p>
			<pre>{JSON.stringify({
				successful: insertResult.successful,
				failed: insertResult.failed.length,
				total: insertResult.total,
				failedDetails: insertResult.failed.map((f: any) => ({
					originalData: f.originalData,
					error: f.error
				}))
			}, null, 2)}</pre>
		</div>
	{/if}

	<div class="code-block">
		<pre>{`${"<"}script>
  let insertResult;
${"<"}/script>

<Tree
  nodes={data}
  bind:insertResult
  ...
/>

{#if insertResult?.failedNodesCount > 0}
  <p>Failed to insert {insertResult.failedNodesCount} items:</p>
  {#each insertResult.failedNodes as failed}
    <p>{failed.item.name}: {failed.reason}</p>
  {/each}
{/if}`}</pre>
	</div>
</div>

<!-- Branch Operations -->
<div class="card">
	<h2>DS05 · Branch Operations</h2>
	<p class="description">
		<code>addBranch</code> and <code>removeBranch</code> bulk-mutate a whole subtree in one
		call, each emitting a single change notification (<code>replaceBranch</code> swaps a subtree's
		contents in place). Ideal for server-driven moves: snapshot a branch, send it to the server for
		path/ID recalculation, then delete the old branch and insert the recalculated one.
	</p>

	<div class="workflow-steps">
		<div class="step">
			<span class="step-num">1</span>
			<div>
				<strong>Right-click a node</strong> and select <em>Cut branch</em>.
				The branch data is snapshot for the server request.
			</div>
		</div>
		<div class="step">
			<span class="step-num">2</span>
			<div>
				<strong>Right-click the target node</strong> and select <em>Paste "..." here</em>.
				This sends the move request to the simulated server.
			</div>
		</div>
		<div class="step">
			<span class="step-num">3</span>
			<div>
				<strong>Server processes</strong> the move ({serverDelay}ms): recalculates paths,
				assigns new IDs, validates the operation.
			</div>
		</div>
		<div class="step">
			<span class="step-num">4</span>
			<div>
				<strong>Tree updates</strong>: <code>removeBranch(sourcePath)</code> removes the old branch,
				<code>addBranch(targetPath, serverData)</code> inserts the recalculated result.
			</div>
		</div>
	</div>

	<div class="code-block">
		<pre>{`// addBranch(parentPath, nodes)  → { success, count }
// removeBranch(path, childrenOnly?) → { success, count }
// replaceBranch(path, nodes)        → swap a subtree's contents in place

// 1. User cuts a branch via context menu
const branchData = collectBranchData(node);

// 2. User pastes on target — send to server
const serverResult = await api.moveBranch(branchData, targetPath);

// 3. Apply server response to tree (two ops, two emits)
treeRef.removeBranch(sourcePath);
treeRef.addBranch(targetPath, serverResult);`}</pre>
	</div>
</div>

<!-- Branch Operations: Live Demo -->
<div class="card">
	<h2>DS06 · Branch Operations: Live Demo</h2>

	<div class="controls">
		<h3 class="org-chart-title">Org Chart</h3>
		{#if cutClipboard}
			<span class="pill pill--warn">Cut: {cutClipboard.sourceName} ({cutClipboard.nodes.length} nodes)</span>
		{/if}
		<button class="secondary push-end" onclick={resetTree} disabled={isProcessing}>Reset Tree</button>
	</div>

	<div class="tree-wrapper" class:tree-processing={isProcessing}>
		<div class="tree-container tree-container-tall">
			<Tree
				bind:this={treeRef}
				nodes={treeData}
				idMember="id"
				pathMember="path"
				sortCallback={sortByOrder}
				isSorted={true}
				expandLevel={3}
				selectedNodeClass="stv__node-content--selected-bold"
				getContextMenuItemsCallback={getContextMenu}
				bind:focusedNode={selectedNode}
				{...getTreeProps()}
			>
				{#snippet nodeTemplate(node: any)}
					<span class:cut-node={cutClipboard?.sourcePath === node.path || (cutClipboard && node.path.startsWith(cutClipboard.sourcePath + '.'))}>
						{node.data?.icon} {node.data?.name}
					</span>
				{/snippet}
			</Tree>
		</div>

		{#if isProcessing}
			<div class="processing-overlay">
				<div class="processing-spinner"></div>
				<p>{processingMessage}</p>
			</div>
		{/if}
	</div>

	<div class="grid mt-1">
		<div>
			<h3>Server Simulation</h3>
			<div class="display-sliders">
				<label for="server-delay">Response delay</label>
				<input id="server-delay" type="range" min="200" max="5000" step="100" bind:value={serverDelay} disabled={isProcessing} />
				<output for="server-delay">{serverDelay}ms</output>
			</div>
			<p class="form-text">
				Simulates the time a real server would take to validate the move,
				recalculate paths/IDs in the database, and return the result.
			</p>
		</div>

		<div>
			<h3>Activity Log</h3>
			<LogPanel
				entries={activityLog}
				empty="Right-click a node to start. Cut a branch, then paste it on another node."
				maxHeight="240px"
			/>
		</div>
	</div>
</div>

<!-- Required Props -->
<div class="card">
	<h2>DS07 · Required Props</h2>
	<p class="description">These props are required for the tree to work.</p>

	<table>
		<thead>
			<tr>
				<th>Prop</th>
				<th>Type</th>
				<th>Description</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td><code>data</code></td>
				<td><code>T[]</code></td>
				<td>Array of data items to display in the tree</td>
			</tr>
			<tr>
				<td><code>idMember</code></td>
				<td><code>string</code></td>
				<td>Property name for the unique identifier</td>
			</tr>
			<tr>
				<td><code>pathMember</code></td>
				<td><code>string</code></td>
				<td>Property name for the hierarchy path</td>
			</tr>
			<tr>
				<td><code>sortCallback</code></td>
				<td><code>(items: LTreeNode&lt;T&gt;[]) =&gt; LTreeNode&lt;T&gt;[]</code></td>
				<td>Function to sort sibling nodes</td>
			</tr>
		</tbody>
	</table>

	<div class="code-block">
		<pre>{`// Minimal required props
<Tree
  nodes={myData}
  idMember="id"
  pathMember="path"
  sortCallback={({ nodes: items }) => [...items].sort((a, b) =>
    (a.data?.name || '').localeCompare(b.data?.name || '')
  )}
/>`}</pre>
	</div>
</div>

<!-- LTreeNode Interface -->
<div class="card">
	<h2>DS08 · LTreeNode Interface</h2>
	<p class="description">Each node in the tree has these properties.</p>

	<table>
		<thead>
			<tr>
				<th>Property</th>
				<th>Type</th>
				<th>Description</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td><code>path</code></td>
				<td><code>string</code></td>
				<td>The full path of the node</td>
			</tr>
			<tr>
				<td><code>pathSegment</code></td>
				<td><code>string</code></td>
				<td>The last segment of the path</td>
			</tr>
			<tr>
				<td><code>parentPath</code></td>
				<td><code>string | null</code></td>
				<td>The parent's path (null for root nodes)</td>
			</tr>
			<tr>
				<td><code>level</code></td>
				<td><code>number | null</code></td>
				<td>Nesting depth (1 for root, 2 for children, etc.)</td>
			</tr>
			<tr>
				<td><code>data</code></td>
				<td><code>T | null</code></td>
				<td>Your original data item</td>
			</tr>
			<tr>
				<td><code>children</code></td>
				<td><code>Record&lt;string, LTreeNode&lt;T&gt;&gt;</code></td>
				<td>Child nodes (keyed by path segment)</td>
			</tr>
			<tr>
				<td><code>isExpanded</code></td>
				<td><code>boolean</code></td>
				<td>Whether children are visible</td>
			</tr>
			<tr>
				<td><code>isChecked</code></td>
				<td><code>boolean</code></td>
				<td>Whether this node is selected</td>
			</tr>
		</tbody>
	</table>

	<div class="code-block">
		<pre>{`// Accessing node properties in nodeContent snippet
{#snippet nodeTemplate(node: any)}
  <span>
    {node.data?.name}
    <small>Level: {node.level}, Path: {node.path}</small>
    {#if node.isChecked}
      <strong>(Selected)</strong>
    {/if}
  </span>
{/snippet}`}</pre>
	</div>
</div>

<!-- Best Practices -->
<div class="card">
	<h2>DS09 · Best Practices</h2>
	<p class="description">Tips for working with tree data.</p>

	<div class="note">
		<p class="note-title">Data Preparation</p>
		<ul>
			<li>Ensure all items have unique <code>id</code> values</li>
			<li>Ensure all items have unique <code>path</code> values</li>
			<li>Parent nodes should be included before children (or order doesn't matter for flat arrays)</li>
			<li>Avoid empty or null paths</li>
			<li>Choose a path separator that doesn't appear in your segment values</li>
		</ul>
	</div>

	<div class="note">
		<p class="note-title">Performance Tips</p>
		<ul>
			<li>For large datasets, consider pagination or lazy loading</li>
			<li>Use <code>expandLevel</code> to limit initial expansion</li>
			<li>Enable search indexing only when needed (<code>shouldUseInternalSearchIndex</code>)</li>
			<li>Avoid recreating the data array on every render</li>
		</ul>
	</div>
</div>

<style>
	/* DS05 — numbered workflow steps (no kit equivalent for a numbered step badge). */
	.workflow-steps {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(240px, 100%), 1fr));
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.step {
		display: flex;
		gap: 0.6rem;
		font-size: 0.85rem;
		line-height: 1.5;
		color: var(--kmwc-text-color-2);
	}

	.step-num {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		margin-top: 1px;
		border-radius: 50%;
		background: var(--kmwc-accent-color);
		color: var(--kmwc-text-color-on-accent);
		font-size: 0.75rem;
		font-weight: 700;
	}

	/* DS06 — the org-chart title shares a .controls row with the cut pill + reset button. */
	.org-chart-title {
		margin: 0;
	}

	/* DS06 — simulated server round-trip: the overlay dims the tree and spins while the move is in flight. */
	.tree-wrapper {
		position: relative;
	}

	.tree-processing .tree-container {
		border-color: var(--kmwc-accent-color);
	}

	.processing-overlay {
		position: absolute;
		inset: 0;
		z-index: 10;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 1rem;
		text-align: center;
		border-radius: var(--kmwc-radius-md);
		background: color-mix(in srgb, var(--kmwc-main-bg) 70%, transparent);
		backdrop-filter: blur(2px);
	}

	.processing-overlay p {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 500;
		color: var(--kmwc-text-color-1);
	}

	.processing-spinner {
		width: 40px;
		height: 40px;
		border: 3px solid color-mix(in srgb, var(--kmwc-accent-color) 25%, transparent);
		border-top-color: var(--kmwc-accent-color);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* A cut (pending-move) branch reads as "on the clipboard". */
	.cut-node {
		opacity: 0.4;
		text-decoration: line-through;
	}
</style>
