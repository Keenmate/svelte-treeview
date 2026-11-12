<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Tree from '$lib/components/Tree.svelte';
	import type {
		TreeController,
		NodeTransformContext,
		NodeTransformCallbackContext,
		BeforePasteContext,
		BeforeDropContext,
		NodeDropContext
	} from '$lib/core/TreeController.svelte.js';
	import { uniqueName } from '$lib/core/clipboard.js';
	import type { LTreeNode, DropPosition } from '$lib/ltree/types.js';
	import type { NodeRef } from '$lib/index.js';
	import RenderModeSwitch from '../RenderModeSwitch.svelte';
	import LogPanel, { logLine, type LogEntry } from '../../LogPanel.svelte';
	import { getTreeProps } from '../render-mode.svelte.js';

	// One order-aware sort shared by every tree on this page (editor + scenarios).
	function sortByOrder<T extends { sortOrder?: number }>({ nodes: items }: { nodes: LTreeNode<T>[] }): LTreeNode<T>[] {
		return [...items].sort((a, b) => {
			if (a.parentPath !== b.parentPath) {
				return (a.parentPath || '').localeCompare(b.parentPath || '');
			}
			return (a.data?.sortOrder ?? 0) - (b.data?.sortOrder ?? 0);
		});
	}

	// ════════════════════════════════════════════════════════════════════
	// INTERACTIVE TREE EDITOR
	// ════════════════════════════════════════════════════════════════════

	interface EditorNode {
		id: number;
		path: string;
		name: string;
		type: string;
		icon: string;
		sortOrder: number;
		// An "internal" field that shouldn't travel on the clipboard — redacted by
		// nodeOutputTransformationCallback so a pasted copy never carries it.
		secret?: string;
	}

	// Sample editable tree data with sort order. A few files carry a `secret` to
	// demonstrate copy-time cleaning. Defined as a function so the tree and the
	// Reset button share one source.
	function initialTreeData(): EditorNode[] {
		return [
			{ id: 1, path: '1', name: 'Root Folder', type: 'folder', icon: '📁', sortOrder: 10 },
			{ id: 2, path: '1.1', name: 'Documents', type: 'folder', icon: '📂', sortOrder: 10 },
			{ id: 8, path: '1.1.1', name: 'Report.pdf', type: 'file', icon: '📄', sortOrder: 10, secret: 'sk-report-001' },
			{ id: 9, path: '1.1.2', name: 'Notes.txt', type: 'file', icon: '📄', sortOrder: 20 },
			{ id: 10, path: '1.1.3', name: 'Budget.xlsx', type: 'file', icon: '📄', sortOrder: 30, secret: 'sk-budget-002' },
			{ id: 3, path: '1.2', name: 'Images', type: 'folder', icon: '📂', sortOrder: 20 },
			{ id: 11, path: '1.2.1', name: 'Vacation.jpg', type: 'image', icon: '🖼️', sortOrder: 10 },
			{ id: 12, path: '1.2.2', name: 'Logo.png', type: 'image', icon: '🖼️', sortOrder: 20 },
			{ id: 13, path: '1.2.3', name: 'Screenshot.png', type: 'image', icon: '🖼️', sortOrder: 30 },
			{ id: 4, path: '1.3', name: 'Music', type: 'folder', icon: '📂', sortOrder: 30 },
			{ id: 14, path: '1.3.1', name: 'Chill Mix.mp3', type: 'audio', icon: '🎵', sortOrder: 10 },
			{ id: 15, path: '1.3.2', name: 'Focus.mp3', type: 'audio', icon: '🎵', sortOrder: 20 },
			{ id: 5, path: '2', name: 'Projects', type: 'folder', icon: '📁', sortOrder: 20 },
			{ id: 6, path: '2.1', name: 'Web App', type: 'folder', icon: '📂', sortOrder: 10 },
			{ id: 16, path: '2.1.1', name: 'index.html', type: 'file', icon: '📄', sortOrder: 10, secret: 'sk-index-003' },
			{ id: 17, path: '2.1.2', name: 'styles.css', type: 'file', icon: '📄', sortOrder: 20 },
			{ id: 18, path: '2.1.3', name: 'app.js', type: 'file', icon: '📄', sortOrder: 30 },
			{ id: 7, path: '2.2', name: 'Mobile App', type: 'folder', icon: '📂', sortOrder: 20 },
			{ id: 19, path: '2.2.1', name: 'Main.swift', type: 'file', icon: '📄', sortOrder: 10 },
			{ id: 20, path: '2.2.2', name: 'icon.png', type: 'image', icon: '🖼️', sortOrder: 20 }
		];
	}

	let treeData = $state<EditorNode[]>(initialTreeData());

	let treeRef: Tree<EditorNode>;
	let selectedNode = $state<LTreeNode<EditorNode> | null>(null);
	// Multi-select highlight set (Ctrl/Cmd+click, Shift+click, Shift+Arrow).
	let selectedPaths = $state<Set<string>>(new Set());
	// Paths currently dimmed because they were cut and await paste. The library
	// tracks an equivalent set on the controller (controller.cutPaths) but doesn't
	// render it, so we mirror it here and dim via the nodeTemplate.
	let cutPaths = $state<Set<string>>(new Set());
	// Paths captured at the last copy/cut. Used to detect a "duplicate in place"
	// gesture (Ctrl+V onto one of the copied nodes) so each node can be duplicated
	// in its OWN parent rather than all landing in the focused node's folder.
	let copiedPaths: string[] = [];
	// While fanning out an in-place duplicate we issue several copy/paste ops; mute
	// their per-op logs so the activity log shows one summary line instead.
	let suppressClipboardLog = false;
	let activityLog = $state<LogEntry[]>([]);
	let dropWarning = $state<string | null>(null);
	let nextId = 200;

	// ── Clipboard wiring (Ctrl/Cmd + C / X / V) ──────────────────────────────
	// The controller implements the clipboard operations (copyNodes / cutNodes /
	// pasteNodes / cancelCut) and a shared cross-tree clipboard; the key bindings
	// are left to the consumer because paste needs an app-specific transform
	// (fresh ids) and a target. We wire them through beforeKeydownCallback.

	// Copy/cut operate on the highlight set when present, else the focused node.
	function clipboardPaths(controller: TreeController<EditorNode>): string[] {
		if (controller.selectedPaths.size > 0) return [...controller.selectedPaths];
		return selectedNode ? [selectedNode.path] : [];
	}

	// nodeOutputTransformationCallback: per-node, at snapshot time (copy/cut). Clean data
	// before it lands on the shared (cross-tree) clipboard — here we redact the internal
	// `secret`. The original node keeps its secret; any pasted copy shows "🔒 redacted".
	function cleanOnCopy({ data }: NodeTransformCallbackContext<EditorNode>): EditorNode {
		return data.secret !== undefined ? { ...data, secret: '🔒 redacted' } : data;
	}

	// nodeInputTransformationCallback: the single per-node hook for all paste-time data
	// derivation. The library calls it (pure) for every node about to be inserted, with
	// the resolved destination + the names already taken there. We give each node a fresh
	// id and, for a root, a collision-free "Copy N" name (uniqueName, library helper) only
	// when the name already exists in the TARGET parent. Descendants keep their names.
	function pasteTransform({ data, ...ctx }: NodeTransformCallbackContext<EditorNode>): EditorNode {
		const landing =
			ctx.position === 'child' && ctx.target?.node
				? Object.values(ctx.target.node.children)
				: ctx.target?.siblings ?? [];
		const taken = landing.map((s) => s.data?.name ?? '');
		return {
			...data,
			id: nextId++,
			path: '', // assigned by addNode
			name: ctx.isRoot ? uniqueName(data.name, taken) : data.name
		};
	}

	// beforePasteCallback does policy only: when you paste onto the copied node itself
	// (Ctrl+C then Ctrl+V, no move), redirect into its parent so the copy lands as a
	// sibling — "duplicate in the same folder".
	function beforePaste(ctx: BeforePasteContext<EditorNode>): { targetPath?: string } | void {
		if (ctx.operation !== 'copy') return;
		if (ctx.target.path && ctx.entries.some((e) => e.sourcePath === ctx.target.path)) {
			return { targetPath: ctx.target.node?.parentPath ?? '' };
		}
	}

	function handleTreeKeydown({
		event,
		controller
	}: {
		event: KeyboardEvent;
		focusedNode: LTreeNode<EditorNode> | null;
		selectedNodes: LTreeNode<EditorNode>[];
		controller: TreeController<EditorNode>;
	}): false | void {
		// Ctrl on Windows/Linux, Cmd (metaKey) on macOS.
		const mod = event.ctrlKey || event.metaKey;
		const key = event.key.toLowerCase();

		if (mod && key === 'c') {
			const paths = clipboardPaths(controller);
			if (!paths.length) { addLog('copy', 'Nothing selected to copy', 'warning'); return false; }
			controller.copyNodes(paths);
			copiedPaths = paths;
			cutPaths = new Set(); // copying supersedes any pending cut
			return false;
		}

		if (mod && key === 'x') {
			const paths = clipboardPaths(controller);
			if (!paths.length) { addLog('cut', 'Nothing selected to cut', 'warning'); return false; }
			controller.cutNodes(paths);
			copiedPaths = paths;
			cutPaths = new Set(controller.cutPaths); // mirror dim set for the template
			return false;
		}

		if (mod && key === 'v') {
			if (!controller.hasClipboardContent()) { addLog('paste', 'Clipboard is empty', 'warning'); return false; }
			const target = selectedNode?.path ?? '';

			// Duplicate-in-place: Ctrl+V onto one of the copied nodes when several were
			// copied — paste each node next to its own original (into its own parent).
			if (
				controller.getClipboardOperation() === 'copy' &&
				copiedPaths.length > 1 &&
				copiedPaths.includes(target)
			) {
				suppressClipboardLog = true;
				let pasted = 0;
				for (const src of copiedPaths) {
					const parent = treeRef.getNodeByPath(src)?.parentPath ?? '';
					controller.copyNodes([src]);
					const result = controller.pasteNodes(parent, undefined, 'child');
					if (result.success) pasted += result.count;
				}
				controller.copyNodes(copiedPaths); // restore the full clipboard for repeats
				suppressClipboardLog = false;
				addLog('paste', `Duplicated ${pasted} node(s) in place`);
				cutPaths = new Set();
				return false;
			}

			// Pasting onto a file (a node that can't hold children) lands the copies
			// beside it — handled by the library, driven by getAllowedDropPositionsCallback.
			controller.pasteNodes(target, undefined, 'child');
			cutPaths = new Set();
			return false;
		}

		// Delete / Backspace remove the selection. Deletion is a data mutation the
		// library leaves to the consumer, so we wire it here just like copy/cut/paste.
		if (event.key === 'Delete') {
			const paths = clipboardPaths(controller);
			if (!paths.length) { addLog('delete', 'Nothing selected to delete', 'warning'); return false; }
			// Remove only top-level paths: removing a parent takes its descendants with it.
			const sep = '.';
			const topLevel = paths.filter((p) => !paths.some((o) => o !== p && p.startsWith(o + sep)));
			let removed = 0;
			let blocked = 0;
			for (const p of topLevel) {
				const node = treeRef.getNodeByPath(p);
				// Test guard: refuse to delete a node that still has subnodes.
				if (node && Object.keys(node.children).length > 0) {
					blocked++;
					continue;
				}
				if (treeRef.removeNode(p).success) removed++;
			}
			controller.clearSelection();
			selectedNode = null;
			cutPaths = new Set();
			if (blocked > 0) {
				const msg = `Cannot delete ${blocked} node(s) with subnodes — remove their contents first`;
				addLog('delete', `Deleted ${removed} node(s); skipped ${blocked} with subnodes`, 'warning');
				showWarning(msg);
			} else {
				addLog('delete', `Deleted ${removed} node(s)`);
			}
			return false;
		}

		// Clear our cut-dimming alongside the library's Escape→cancel-cut.
		if (event.key === 'Escape' && cutPaths.size > 0) {
			controller.cancelCut();
			cutPaths = new Set();
			addLog('cut', 'Cut cancelled');
			return false;
		}

		return; // let the tree handle everything else
	}

	// Form state for adding nodes
	let newNodeName = $state('');
	let newNodeIcon = $state('📄');

	const iconToType: Record<string, string> = {
		'📄': 'file', '📁': 'folder', '📂': 'folder', '🖼️': 'image',
		'🎵': 'audio', '📝': 'note', '🚀': 'project'
	};

	// Drop zone configuration (with localStorage persistence)
	let dropZoneMode = $state<'floating' | 'glow'>('floating');
	let dropZoneLayout = $state<'around' | 'before' | 'after' | 'wave' | 'wave2'>('wave');
	let dropZoneStart = $state<number | string>('50%');
	let dropZoneMaxWidth = $state(120);

	// Load settings from localStorage on mount
	onMount(() => {
		const saved = localStorage.getItem('dropZoneConfig');
		if (saved) {
			try {
				const config = JSON.parse(saved);
				if (config.mode) dropZoneMode = config.mode;
				if (config.layout) dropZoneLayout = config.layout === 'above' ? 'before' : config.layout === 'below' ? 'after' : config.layout; // map pre-5.0 saved values
				if (config.start !== undefined) dropZoneStart = config.start;
				if (config.maxWidth !== undefined) dropZoneMaxWidth = config.maxWidth;
			} catch (e) {
				// Ignore invalid JSON
			}
		}
	});

	// Save settings to localStorage when they change
	$effect(() => {
		const config = { mode: dropZoneMode, layout: dropZoneLayout, start: dropZoneStart, maxWidth: dropZoneMaxWidth };
		localStorage.setItem('dropZoneConfig', JSON.stringify(config));
	});

	type LogVariant = 'info' | 'success' | 'warning' | 'danger';

	// Timeline lines (time · operation · detail) for the kit's log panel; newest at the bottom.
	function addLog(name: string, detail: string, variant?: LogVariant) {
		activityLog = [...activityLog.slice(-49), logLine(name, detail, variant)];
	}

	// Show a transient warning in the same banner used for drop rejections.
	let warningTimer: ReturnType<typeof setTimeout> | undefined;
	function showWarning(message: string) {
		dropWarning = message;
		clearTimeout(warningTimer);
		warningTimer = setTimeout(() => (dropWarning = null), 4000);
	}

	function handleAddNode() {
		if (!newNodeName.trim()) {
			addLog('error', 'Node name is required', 'danger');
			return;
		}

		const parentPath = selectedNode?.path || '';
		const result = treeRef.addNode(parentPath, {
			id: nextId++,
			path: '', // Will be set by addNode
			name: newNodeName.trim(),
			type: iconToType[newNodeIcon] || 'file',
			icon: newNodeIcon,
			sortOrder: 100 // Will be placed at end
		});

		if (result.success) {
			addLog('add', `Added "${newNodeName}" ${parentPath ? `under "${selectedNode?.data?.name}"` : 'at root'}`);
			newNodeName = '';
		} else {
			addLog('error', String(result.error), 'danger');
		}
	}

	function handleRemoveNode() {
		if (!selectedNode) {
			addLog('error', 'Select a node to remove', 'danger');
			return;
		}

		const nodeName = selectedNode.data?.name;
		const result = treeRef.removeNode(selectedNode.path);

		if (result.success) {
			addLog('remove', `Removed "${nodeName}"`);
			selectedNode = null;
		} else {
			addLog('error', String(result.error), 'danger');
		}
	}

	function handleMoveUp() {
		if (!selectedNode) {
			addLog('error', 'Select a node to move', 'danger');
			return;
		}

		const siblings = treeRef.getSiblings(selectedNode.path);
		const currentIndex = siblings.findIndex((s) => s.path === selectedNode!.path);

		if (currentIndex <= 0) {
			addLog('move', 'Already at top', 'warning');
			return;
		}

		const targetNode = siblings[currentIndex - 1];
		const result = treeRef.moveNode(selectedNode.path, targetNode.path, 'before');

		if (result.success) {
			addLog('move', `Moved "${selectedNode.data?.name}" before "${targetNode.data?.name}"`);
		} else {
			addLog('error', String(result.error), 'danger');
		}
	}

	function handleMoveDown() {
		if (!selectedNode) {
			addLog('error', 'Select a node to move', 'danger');
			return;
		}

		const siblings = treeRef.getSiblings(selectedNode.path);
		const currentIndex = siblings.findIndex((s) => s.path === selectedNode!.path);

		if (currentIndex >= siblings.length - 1) {
			addLog('move', 'Already at bottom', 'warning');
			return;
		}

		const targetNode = siblings[currentIndex + 1];
		const result = treeRef.moveNode(selectedNode.path, targetNode.path, 'after');

		if (result.success) {
			addLog('move', `Moved "${selectedNode.data?.name}" after "${targetNode.data?.name}"`);
		} else {
			addLog('error', String(result.error), 'danger');
		}
	}

	// A node can hold children only if it's a folder. Shared by drag-drop and paste
	// so both honour the same "files can't contain children" rule.
	const canHaveChildren = (node: LTreeNode<EditorNode> | null) =>
		node?.data?.icon?.includes('📁') || node?.data?.icon?.includes('📂');

	async function beforeDrop(ctx: BeforeDropContext<EditorNode>): Promise<boolean | { position: DropPosition } | void> {
		const { target, position } = ctx;
		const dropNode = target?.node ?? null;
		const draggedNode = ctx.dragged[0]?.node ?? null;
		const isFolder = canHaveChildren;
		const isImage = (node: LTreeNode<EditorNode> | null) => node?.data?.icon?.includes('🖼️');
		const isDocumentsFolder = (node: LTreeNode<EditorNode> | null) => node?.data?.name === 'Documents';

		// Rule 1: Images cannot be dropped under Documents folder
		if (isImage(draggedNode) && position === 'child' && isDocumentsFolder(dropNode)) {
			addLog('drop', `Cannot drop images under Documents folder - cancelled`, 'warning');
			dropWarning = `Cannot drop images under Documents folder`;
			return false; // Cancel the drop
		}

		// Rule 2: Ask user when dropping as child of non-folder items
		if (position === 'child' && dropNode && !isFolder(dropNode)) {
			const choice = await showDropDialog(dropNode.data?.name || 'item');
			if (choice === 'cancel') {
				addLog('drop', `Drop cancelled by user`, 'warning');
				return false;
			}
			if (choice === 'sibling') {
				addLog('drop', `User chose to drop as sibling of "${dropNode.data?.name}"`);
				return { position: 'after' as DropPosition };
			}
		}

		// Return undefined to proceed normally
	}

	// Simple dialog using native confirm - replace with your own modal
	function showDropDialog(targetName: string): Promise<'cancel' | 'sibling'> {
		return new Promise((resolve) => {
			const result = confirm(
				`"${targetName}" is not a folder.\n\nClick OK to drop as sibling, or Cancel to abort.`
			);
			resolve(result ? 'sibling' : 'cancel');
		});
	}

	function handleDragStart() {
		dropWarning = null;
	}

	function handleDrop({ source, target, position }: NodeDropContext<EditorNode>) {
		const dropNode = target?.node ?? null;
		const draggedNode = source.node;
		if (!dropNode || !draggedNode) {
			addLog('drop', `Dropped "${draggedNode?.data?.name}" at root`);
			return;
		}

		const result = treeRef.moveNode(draggedNode.path, dropNode.path, position as 'before' | 'after' | 'child');

		if (result.success) {
			addLog('drop', `Dropped "${draggedNode.data?.name}" ${position} "${dropNode.data?.name}"`);
		} else {
			addLog('error', String(result.error), 'danger');
		}
	}

	function handleExport() {
		const children = treeRef.getChildren('');
		const exportData = collectNodes(children);
		console.log('Exported tree data:', exportData);
		addLog('export', `Exported ${exportData.length} nodes to console`);
	}

	function collectNodes(nodes: LTreeNode<EditorNode>[]): EditorNode[] {
		const result: EditorNode[] = [];
		for (const node of nodes) {
			if (node.data) {
				result.push({ ...node.data, path: node.path });
			}
			result.push(...collectNodes(Object.values(node.children)));
		}
		return result;
	}

	function resetTree() {
		treeData = initialTreeData();
		selectedNode = null;
		activityLog = [];
		addLog('reset', 'Tree reset to initial state');
	}

	// ════════════════════════════════════════════════════════════════════
	// BUSINESS SCENARIOS (DB-integration workflows)
	// ════════════════════════════════════════════════════════════════════

	type ScenarioNode = {
		id: number;
		path: string;
		name: string;
		icon: string;
		sortOrder: number;
	};

	type Scenario = 'A' | 'B' | 'C' | 'D' | 'E';

	// Active scenario tab
	let activeTab = $state<Scenario>('A');

	// Scenario descriptions
	const scenarioDescriptions: Record<Scenario, { title: string; description: string; keyFeature: string }> = {
		A: {
			title: 'Full Redraw + State Preservation',
			description: 'Drag-drop saves to DB, then reloads entire tree from DB. Expanded state is preserved through bind:expandedPaths.',
			keyFeature: 'bind:expandedPaths'
		},
		B: {
			title: 'Partial Redraw (Recommended)',
			description: 'Same-tree moves are auto-handled by the library using moveNode(). No full rebuild needed - maximum performance.',
			keyFeature: 'Auto-handled moveNode()'
		},
		C: {
			title: 'Individual CRUD Operations',
			description: 'Add, edit, and delete nodes with immediate saves to DB. Each operation is saved individually.',
			keyFeature: 'addNode() / updateNode() / removeNode()'
		},
		D: {
			title: 'Empty Tree + Build One by One',
			description: "Start with an empty tree, drag nodes from source or add manually. Each node is saved to DB as it's created.",
			keyFeature: 'dropPlaceholder + addNode()'
		},
		E: {
			title: 'Batch Create Then Save',
			description: 'Build entire tree structure in memory without saving. Use "Save All" to extract and save everything at once.',
			keyFeature: 'bind:nodes (current state)'
		}
	};

	// Source tree data (shared across all scenarios)
	const sourceData: ScenarioNode[] = [
		{ id: 1, path: '1', name: 'Documents', icon: '📁', sortOrder: 10 },
		{ id: 2, path: '1.1', name: 'Report.pdf', icon: '📄', sortOrder: 10 },
		{ id: 3, path: '1.2', name: 'Presentation.pptx', icon: '📊', sortOrder: 20 },
		{ id: 4, path: '1.3', name: 'Notes', icon: '📁', sortOrder: 30 },
		{ id: 5, path: '1.3.1', name: 'Meeting Notes.txt', icon: '📝', sortOrder: 10 },
		{ id: 6, path: '1.3.2', name: 'Ideas.txt', icon: '📝', sortOrder: 20 },
		{ id: 7, path: '2', name: 'Images', icon: '📁', sortOrder: 20 },
		{ id: 8, path: '2.1', name: 'Photo.jpg', icon: '🖼️', sortOrder: 10 },
		{ id: 9, path: '2.2', name: 'Screenshot.png', icon: '🖼️', sortOrder: 20 },
		{ id: 10, path: '3', name: 'Music', icon: '📁', sortOrder: 30 },
		{ id: 11, path: '3.1', name: 'Song.mp3', icon: '🎵', sortOrder: 10 }
	];

	// Initial target data for scenarios A, B, C (pre-populated)
	function createInitialTargetData(): ScenarioNode[] {
		return [
			{ id: 100, path: '1', name: 'Projects', icon: '📁', sortOrder: 10 },
			{ id: 101, path: '1.1', name: 'Project Alpha', icon: '📁', sortOrder: 10 },
			{ id: 102, path: '1.1.1', name: 'Specs.doc', icon: '📄', sortOrder: 10 },
			{ id: 103, path: '1.1.2', name: 'Design.fig', icon: '🎨', sortOrder: 20 },
			{ id: 104, path: '1.2', name: 'Project Beta', icon: '📁', sortOrder: 20 },
			{ id: 105, path: '1.2.1', name: 'README.md', icon: '📄', sortOrder: 10 },
			{ id: 106, path: '2', name: 'Archive', icon: '📁', sortOrder: 20 },
			{ id: 107, path: '2.1', name: 'Old Files', icon: '📁', sortOrder: 10 },
			{ id: 108, path: '2.1.1', name: 'Legacy.zip', icon: '📦', sortOrder: 10 }
		];
	}

	// Per-scenario state
	let nextIdA = $state(1000);
	let nextIdB = $state(2000);
	let nextIdC = $state(3000);
	let nextIdD = $state(4000);
	let nextIdE = $state(5000);

	let targetDataA = $state<ScenarioNode[]>(createInitialTargetData());
	let targetDataB = $state<ScenarioNode[]>(createInitialTargetData());
	let targetDataC = $state<ScenarioNode[]>(createInitialTargetData());
	let targetDataD = $state<ScenarioNode[]>([]); // Empty for scenario D
	let targetDataE = $state<ScenarioNode[]>([]); // Empty for scenario E

	let mockDatabaseA = $state<ScenarioNode[]>([...createInitialTargetData()]);
	let mockDatabaseB = $state<ScenarioNode[]>([...createInitialTargetData()]);
	let mockDatabaseC = $state<ScenarioNode[]>([...createInitialTargetData()]);
	let mockDatabaseD = $state<ScenarioNode[]>([]);
	let mockDatabaseE = $state<ScenarioNode[]>([]);

	let activityLogA = $state<LogEntry[]>([]);
	let activityLogB = $state<LogEntry[]>([]);
	let activityLogC = $state<LogEntry[]>([]);
	let activityLogD = $state<LogEntry[]>([]);
	let activityLogE = $state<LogEntry[]>([]);

	let selectedNodeC = $state<LTreeNode<ScenarioNode> | null>(null);
	let editNameC = $state('');
	let unsavedCountE = $state(0);

	// Loading state per scenario
	let isLoadingA = $state(false);
	let isLoadingB = $state(false);
	let isLoadingC = $state(false);
	let isLoadingD = $state(false);
	let isLoadingE = $state(false);

	// Tree refs
	let treeRefA = $state<Tree<ScenarioNode>>(undefined!);
	let expandedA = $state<Set<string>>(new Set());
	let treeRefB = $state<Tree<ScenarioNode>>(undefined!);
	let treeRefC = $state<Tree<ScenarioNode>>(undefined!);
	let treeRefD = $state<Tree<ScenarioNode>>(undefined!);
	let treeRefE = $state<Tree<ScenarioNode>>(undefined!);

	// Logging helpers
	function addLogA(name: string, detail: string, variant?: LogVariant) {
		activityLogA = [...activityLogA.slice(-49), logLine(name, detail, variant)];
	}
	function addLogB(name: string, detail: string, variant?: LogVariant) {
		activityLogB = [...activityLogB.slice(-49), logLine(name, detail, variant)];
	}
	function addLogC(name: string, detail: string, variant?: LogVariant) {
		activityLogC = [...activityLogC.slice(-49), logLine(name, detail, variant)];
	}
	function addLogD(name: string, detail: string, variant?: LogVariant) {
		activityLogD = [...activityLogD.slice(-49), logLine(name, detail, variant)];
	}
	function addLogE(name: string, detail: string, variant?: LogVariant) {
		activityLogE = [...activityLogE.slice(-49), logLine(name, detail, variant)];
	}

	// Simulated DB operations with random latency (50-450ms)
	async function simulateLatency(): Promise<number> {
		const delay = Math.floor(Math.random() * 400) + 50; // 50-450ms
		await new Promise((r) => setTimeout(r, delay));
		return delay;
	}

	// ── Scenario A: Full Redraw ──────────────────────────────────────────
	function getNextPathSegmentA(parentPath: string): string {
		const children = mockDatabaseA.filter((n) => {
			if (parentPath === '') {
				return !n.path.includes('.');
			}
			const prefix = parentPath + '.';
			return n.path.startsWith(prefix) && !n.path.slice(prefix.length).includes('.');
		});
		return String(children.length + 1);
	}

	async function handleDropA(ctx: NodeDropContext<ScenarioNode>) {
		const dropNode = ctx.target?.node ?? null;
		const draggedNode = ctx.source.node!;
		const { position, operation } = ctx;
		const isSameTree = draggedNode.treeId === 'tree-a';

		// Step 1: Save expanded state BEFORE any changes
		const expandedPaths = [...expandedA];
		addLogA('state', `Saved ${expandedPaths.length} expanded paths`);

		isLoadingA = true;

		if (isSameTree && operation === 'move') {
			addLogA('move', `Moving "${draggedNode.data?.name}" ${position} "${dropNode?.data?.name || 'root'}"`);
			const delay = await simulateLatency();
			const nodeData = mockDatabaseA.find((n) => n.id === draggedNode.data?.id);
			if (nodeData) {
				addLogA('db', `Saved move to DB (${delay}ms)`, 'success');
			}
		} else {
			const parentPath = dropNode === null ? '' : position === 'child' ? dropNode.path : dropNode.parentPath || '';
			const pathSegment = getNextPathSegmentA(parentPath);
			const rootPath = parentPath ? `${parentPath}.${pathSegment}` : pathSegment;

			let rootSortOrder = 10;
			if (dropNode && position === 'before') {
				rootSortOrder = (dropNode.data?.sortOrder ?? 10) - 5;
			} else if (dropNode && position === 'after') {
				rootSortOrder = (dropNode.data?.sortOrder ?? 10) + 5;
			} else if (position === 'child') {
				rootSortOrder = 10;
			}

			const nodesToAdd: ScenarioNode[] = [];
			let isRoot = true;

			function collectScenarioNodes(node: LTreeNode<ScenarioNode>, newPath: string) {
				nodesToAdd.push({
					...node.data!,
					id: nextIdA++,
					path: newPath,
					sortOrder: isRoot ? rootSortOrder : node.data?.sortOrder || 10
				});
				isRoot = false;

				const children = Object.values(node.children || {});
				children.forEach((child, index) => {
					const childPath = `${newPath}.${index + 1}`;
					collectScenarioNodes(child, childPath);
				});
			}

			collectScenarioNodes(draggedNode, rootPath);

			const delay = await simulateLatency();
			mockDatabaseA = [...mockDatabaseA, ...nodesToAdd];
			addLogA('add', `Added ${nodesToAdd.length} node(s) at "${rootPath}" with sortOrder=${rootSortOrder} (${position} ${dropNode?.data?.name || 'root'}) (${delay}ms)`);
		}

		// Step 2: Reload FULL tree from database (simulating server round-trip)
		addLogA('db', `Reloading tree from DB...`, 'info');
		const reloadDelay = await simulateLatency();
		targetDataA = [...mockDatabaseA];
		addLogA('db', `Loaded ${mockDatabaseA.length} records (${reloadDelay}ms)`);

		// Step 3: Restore expanded state
		await tick();
		expandedA = new Set(expandedPaths);
		addLogA('state', `Restored ${expandedPaths.length} expanded paths`);

		isLoadingA = false;
	}

	async function reloadFromDbA() {
		const expandedPaths = [...expandedA];
		addLogA('db', `Reloading from DB (saving ${expandedPaths.length} expanded paths)...`, 'info');

		isLoadingA = true;
		const delay = await simulateLatency();
		targetDataA = [...mockDatabaseA];

		await tick();
		expandedA = new Set(expandedPaths);
		addLogA('db', `Reload complete (${delay}ms), restored expanded state`);
		isLoadingA = false;
	}

	function resetA() {
		mockDatabaseA = [...createInitialTargetData()];
		targetDataA = [...mockDatabaseA];
		activityLogA = [];
		nextIdA = 1000;
		addLogA('reset', 'Reset to initial state');
	}

	// ── Scenario B: Partial Redraw ───────────────────────────────────────
	async function handleDropB(ctx: NodeDropContext<ScenarioNode>) {
		const dropNode = ctx.target?.node ?? null;
		const draggedNode = ctx.source.node!;
		const { position, operation } = ctx;
		const isSameTree = draggedNode.treeId === 'tree-b';

		isLoadingB = true;

		if (isSameTree && operation === 'move') {
			addLogB('move', `[AUTO-HANDLED] Moved "${draggedNode.data?.name}" ${position} "${dropNode?.data?.name || 'root'}"`);
			const delay = await simulateLatency();
			addLogB('db', `Saved to DB (${delay}ms) - no tree rebuild needed!`, 'success');
		} else {
			const parentPath = dropNode === null ? '' : position === 'child' ? dropNode.path : dropNode.parentPath || '';

			let rootSortOrder = 10;
			if (dropNode && position === 'before') {
				rootSortOrder = (dropNode.data?.sortOrder ?? 10) - 5;
			} else if (dropNode && position === 'after') {
				rootSortOrder = (dropNode.data?.sortOrder ?? 10) + 5;
			}

			let isFirst = true;
			const result = treeRefB.copyNodeWithDescendants(draggedNode, parentPath, ({ data }) => {
				const order = isFirst ? rootSortOrder : data.sortOrder || 10;
				isFirst = false;
				return { ...data, id: nextIdB++, path: '', sortOrder: order };
			});

			if (result.success) {
				addLogB('copy', `Copied ${result.count} node(s) with sortOrder=${rootSortOrder} (${position} ${dropNode?.data?.name || 'root'})`);
				const delay = await simulateLatency();
				addLogB('db', `Saved to DB (${delay}ms)`, 'success');
			}
		}

		isLoadingB = false;
	}

	function resetB() {
		targetDataB = [...createInitialTargetData()];
		mockDatabaseB = [...createInitialTargetData()];
		activityLogB = [];
		nextIdB = 2000;
		addLogB('reset', 'Reset to initial state');
	}

	// ── Scenario C: Individual CRUD ──────────────────────────────────────
	async function handleDropC(ctx: NodeDropContext<ScenarioNode>) {
		const dropNode = ctx.target?.node ?? null;
		const draggedNode = ctx.source.node!;
		const { position, operation } = ctx;
		const isSameTree = draggedNode.treeId === 'tree-c';

		isLoadingC = true;

		if (isSameTree && operation === 'move') {
			addLogC('move', `Moved "${draggedNode.data?.name}"`);
			const delay = await simulateLatency();
			addLogC('db', `Saved move to DB (${delay}ms)`, 'success');
		} else {
			const parentPath = dropNode === null ? '' : position === 'child' ? dropNode.path : dropNode.parentPath || '';

			let sortOrder = 10;
			if (dropNode && position === 'before') {
				sortOrder = (dropNode.data?.sortOrder ?? 10) - 5;
			} else if (dropNode && position === 'after') {
				sortOrder = (dropNode.data?.sortOrder ?? 10) + 5;
			}

			const newNode: ScenarioNode = { ...draggedNode.data!, id: nextIdC++, path: '', sortOrder };

			const result = treeRefC.addNode(parentPath, newNode);
			if (result.success) {
				const delay = await simulateLatency();
				mockDatabaseC = [...mockDatabaseC, result.node!.data!];
				addLogC('add', `Added "${newNode.name}" with sortOrder=${sortOrder} (${position} ${dropNode?.data?.name || 'root'}) (${delay}ms)`);
			}
		}

		isLoadingC = false;
	}

	async function handleAddC() {
		const parentPath = selectedNodeC?.path || '';
		const newNode: ScenarioNode = {
			id: nextIdC++,
			path: '',
			name: `New Item ${nextIdC}`,
			icon: '📄',
			sortOrder: 10
		};

		isLoadingC = true;
		const result = treeRefC.addNode(parentPath, newNode);
		if (result.success) {
			const delay = await simulateLatency();
			mockDatabaseC = [...mockDatabaseC, result.node!.data!];
			addLogC('add', `Added "${newNode.name}" under "${parentPath || 'root'}" - saved to DB (${delay}ms)`, 'success');
		}
		isLoadingC = false;
	}

	async function handleUpdateC() {
		if (!selectedNodeC || !editNameC.trim()) return;

		isLoadingC = true;
		const result = treeRefC.updateNode(selectedNodeC.path, { name: editNameC.trim() });
		if (result.success) {
			const delay = await simulateLatency();
			const dbNode = mockDatabaseC.find((n) => n.id === selectedNodeC!.data?.id);
			if (dbNode) dbNode.name = editNameC.trim();
			addLogC('update', `Updated "${selectedNodeC.path}" to "${editNameC}" - saved to DB (${delay}ms)`, 'success');
		}
		isLoadingC = false;
	}

	async function handleDeleteC() {
		if (!selectedNodeC) return;

		isLoadingC = true;
		const nodeName = selectedNodeC.data?.name;
		const result = treeRefC.removeNode(selectedNodeC.path);
		if (result.success) {
			const delay = await simulateLatency();
			mockDatabaseC = mockDatabaseC.filter((n) => n.id !== selectedNodeC!.data?.id);
			addLogC('delete', `Deleted "${nodeName}" - saved to DB (${delay}ms)`, 'success');
			selectedNodeC = null;
		}
		isLoadingC = false;
	}

	function onNodeClickC(ctx: NodeRef<ScenarioNode>) {
		selectedNodeC = ctx.node;
		editNameC = ctx.node?.data?.name || '';
	}

	function resetC() {
		targetDataC = [...createInitialTargetData()];
		mockDatabaseC = [...createInitialTargetData()];
		activityLogC = [];
		nextIdC = 3000;
		selectedNodeC = null;
		editNameC = '';
		addLogC('reset', 'Reset to initial state');
	}

	// ── Scenario D: Empty + One by One ───────────────────────────────────
	async function handleDropD(ctx: NodeDropContext<ScenarioNode>) {
		const dropNode = ctx.target?.node ?? null;
		const draggedNode = ctx.source.node!;
		const { position, operation } = ctx;
		const isSameTree = draggedNode.treeId === 'tree-d';

		isLoadingD = true;

		if (isSameTree && operation === 'move') {
			addLogD('move', `Moved "${draggedNode.data?.name}"`);
			const delay = await simulateLatency();
			addLogD('db', `Saved to DB (${delay}ms)`, 'success');
			isLoadingD = false;
			return;
		}

		const parentPath = dropNode === null ? '' : position === 'child' ? dropNode.path : dropNode.parentPath || '';

		let sortOrder = 10;
		if (dropNode && position === 'before') {
			sortOrder = (dropNode.data?.sortOrder ?? 10) - 5;
		} else if (dropNode && position === 'after') {
			sortOrder = (dropNode.data?.sortOrder ?? 10) + 5;
		}

		const newNode: ScenarioNode = { ...draggedNode.data!, id: nextIdD++, path: '', sortOrder };

		const result = treeRefD.addNode(parentPath, newNode);
		if (result.success) {
			const delay = await simulateLatency();
			mockDatabaseD = [...mockDatabaseD, result.node!.data!];
			addLogD('add', `Added "${newNode.name}" with sortOrder=${sortOrder} (${position} ${dropNode?.data?.name || 'root'}) (${delay}ms)`);
		}

		isLoadingD = false;
	}

	async function addRootNodeD() {
		const newNode: ScenarioNode = { id: nextIdD++, path: '', name: `Root ${nextIdD}`, icon: '📁', sortOrder: 10 };

		isLoadingD = true;
		const result = treeRefD.addNode('', newNode);
		if (result.success) {
			const delay = await simulateLatency();
			mockDatabaseD = [...mockDatabaseD, result.node!.data!];
			addLogD('add', `Added root node "${newNode.name}" - saved to DB (${delay}ms)`, 'success');
		}
		isLoadingD = false;
	}

	function clearD() {
		targetDataD = [];
		mockDatabaseD = [];
		activityLogD = [];
		nextIdD = 4000;
		addLogD('reset', 'Cleared tree and database');
	}

	// ── Scenario E: Batch Create Then Save ───────────────────────────────
	function handleDropE(ctx: NodeDropContext<ScenarioNode>) {
		const dropNode = ctx.target?.node ?? null;
		const draggedNode = ctx.source.node!;
		const { position, operation } = ctx;
		const isSameTree = draggedNode.treeId === 'tree-e';

		if (isSameTree && operation === 'move') {
			addLogE('move', `Moved "${draggedNode.data?.name}" (not saved yet)`, 'warning');
			unsavedCountE++;
			return;
		}

		const parentPath = dropNode === null ? '' : position === 'child' ? dropNode.path : dropNode.parentPath || '';

		let rootSortOrder = 10;
		if (dropNode && position === 'before') {
			rootSortOrder = (dropNode.data?.sortOrder ?? 10) - 5;
		} else if (dropNode && position === 'after') {
			rootSortOrder = (dropNode.data?.sortOrder ?? 10) + 5;
		}

		let isFirst = true;
		const result = treeRefE.copyNodeWithDescendants(draggedNode, parentPath, ({ data }) => {
			const order = isFirst ? rootSortOrder : data.sortOrder || 10;
			isFirst = false;
			return { ...data, id: nextIdE++, path: '', sortOrder: order };
		});

		if (result.success) {
			unsavedCountE += result.count;
			addLogE('add', `Added ${result.count} node(s) with sortOrder=${rootSortOrder} (${position} ${dropNode?.data?.name || 'root'}) - NOT saved`, 'warning');
		}
	}

	function addRootNodeE() {
		const newNode: ScenarioNode = { id: nextIdE++, path: '', name: `Item ${nextIdE}`, icon: '📄', sortOrder: 10 };

		const result = treeRefE.addNode('', newNode);
		if (result.success) {
			unsavedCountE++;
			addLogE('add', `Added "${newNode.name}" (NOT saved - ${unsavedCountE} unsaved total)`, 'warning');
		}
	}

	async function saveAllE() {
		isLoadingE = true;

		const allData = $state.snapshot(targetDataE) as ScenarioNode[];
		addLogE('save', `Extracting ${allData.length} nodes from bind:nodes...`, 'info');

		const delay1 = await simulateLatency();
		addLogE('save', `Preparing batch insert (${delay1}ms)...`, 'info');
		const delay2 = await simulateLatency();

		mockDatabaseE = [...allData];
		unsavedCountE = 0;
		addLogE('save', `Batch saved ${allData.length} nodes to DB! (total: ${delay1 + delay2}ms)`, 'success');

		isLoadingE = false;
	}

	function clearE() {
		targetDataE = [];
		mockDatabaseE = [];
		activityLogE = [];
		nextIdE = 5000;
		unsavedCountE = 0;
		addLogE('reset', 'Cleared tree (database was already empty)');
	}

	// Get current scenario's activity log
	function getCurrentLog(): LogEntry[] {
		switch (activeTab) {
			case 'A': return activityLogA;
			case 'B': return activityLogB;
			case 'C': return activityLogC;
			case 'D': return activityLogD;
			case 'E': return activityLogE;
		}
	}

	// Get current scenario's mock database
	function getCurrentDb(): ScenarioNode[] {
		switch (activeTab) {
			case 'A': return mockDatabaseA;
			case 'B': return mockDatabaseB;
			case 'C': return mockDatabaseC;
			case 'D': return mockDatabaseD;
			case 'E': return mockDatabaseE;
		}
	}
</script>

<svelte:head>
	<title>Tree Editor - Svelte Treeview</title>
</svelte:head>

<header class="example-header">
	<a href="/" class="back-link">&larr; Back to Examples</a>
	<h1>Tree Editor</h1>
	<p class="subtitle">
		Add, remove, move, and clipboard-edit nodes — plus real-world DB-integration workflows.
	</p>
	<RenderModeSwitch />
</header>

<!-- Main Editor -->
<div class="card">
	<h2>TE01 · Interactive Tree Editor</h2>
	<p class="description">
		Click to select a node (double-click to expand), then use the controls to add
		children, remove, or reorder. <strong>Ctrl/Cmd+click</strong> or
		<strong>Shift+click</strong> to multi-select, then <strong>Ctrl/Cmd+C / X / V</strong>
		to copy, cut, and paste — paste lands under the focused node (or at root), and a
		pasted copy whose name already exists there becomes <em>"Name Copy 1"</em>, <em>"Name Copy 2"</em>, …. Copying a
		node and pasting it without moving (<strong>Ctrl/Cmd+C</strong> then
		<strong>Ctrl/Cmd+V</strong>) drops the copy next to it in the same folder. Cut nodes
		dim until pasted; <strong>Esc</strong> cancels a pending cut. <strong>Delete</strong>
		removes the selected node(s). Drag and drop also moves nodes. Some files carry an
		internal <code>secret</code> token —
		<code>nodeOutputTransformationCallback</code> redacts it on copy, so a pasted copy shows
		<em>🔒 redacted</em> while the original keeps its value. Pasting onto a file (which
		can't hold children) drops the copy beside it instead of inside.
	</p>

	<div class="editor-layout">
		<div class="tree-section">
			<div class="tree-container" class:tree-container-tall={!getTreeProps().isVirtualScrollEnabled}>
				<Tree
					bind:this={treeRef}
					nodes={treeData}
					idMember="id"
					pathMember="path"
					orderMember="sortOrder"
					sortCallback={sortByOrder}
					isSorted={true}
					expandLevel={3}
					clickBehavior="select"
					selectionMode="multiple"
					dragDropMode="both"
					getIsDraggableCallback={() => true}
					getIsDropAllowedCallback={() => true}
					getAllowedDropPositionsCallback={({ node }): DropPosition[] | undefined =>
						canHaveChildren(node) ? undefined : ['before', 'after']}
					bind:focusedNode={selectedNode}
					bind:selectedPaths={selectedPaths}
					beforeKeydownCallback={handleTreeKeydown}
					onNodeCopy={({ paths }) => { if (!suppressClipboardLog) addLog('copy', `Copied ${paths.length} node(s) to clipboard`); }}
					onNodeCut={({ paths }) => addLog('cut', `Cut ${paths.length} node(s) — paste to move`)}
					onNodePaste={(result) => { if (!suppressClipboardLog) addLog('paste', result.success ? `Pasted ${result.count} node(s)` : `Paste failed: ${result.error}`, result.success ? undefined : 'danger'); }}
					beforePasteCallback={beforePaste}
					nodeOutputTransformationCallback={cleanOnCopy}
					nodeInputTransformationCallback={pasteTransform}
					beforeDropCallback={beforeDrop}
					onNodeDrop={handleDrop}
					onNodeDragStart={handleDragStart}
					{dropZoneMode}
					{dropZoneLayout}
					{dropZoneStart}
					{dropZoneMaxWidth}
					{...getTreeProps()}
				>
					{#snippet nodeTemplate(node: any)}
						<span
							class:selected-node={selectedNode?.path === node.path}
							class:cut-dimmed={cutPaths.has(node.path)}
						>
							{node.data?.icon} {node.data?.name}
							<span class="node-type">{node.data?.type}</span>
							{#if node.data?.secret}
								<span class="node-secret">{node.data.secret}</span>
							{/if}
						</span>
					{/snippet}
				</Tree>
			</div>
			{#if dropWarning}
				<div class="note warning">
					{dropWarning}
				</div>
			{/if}
		</div>

		<div class="controls-section">
			<div class="demo-card">
				<h3>Add Node</h3>
				<p>
					{selectedNode ? `Adding to: ${selectedNode.data?.name}` : 'Adding at root level'}
				</p>
				<div class="field-row">
					<input
						class="field-grow"
						type="text"
						placeholder="Node name"
						bind:value={newNodeName}
						onkeydown={(e) => e.key === 'Enter' && handleAddNode()}
					/>
					<select bind:value={newNodeIcon}>
						<option value="📄">📄 File</option>
						<option value="📁">📁 Folder</option>
						<option value="📂">📂 Open Folder</option>
						<option value="🖼️">🖼️ Image</option>
						<option value="🎵">🎵 Music</option>
						<option value="📝">📝 Note</option>
						<option value="🚀">🚀 Project</option>
					</select>
				</div>
				<button class="mt-1" onclick={handleAddNode}>Add Node</button>
			</div>

			<div class="demo-card">
				<h3>Move Node</h3>
				<p>
					{selectedNode ? `Moving: ${selectedNode.data?.name}` : 'Select a node first'}
				</p>
				<div class="field-row">
					<button class="secondary field-grow" onclick={handleMoveUp} disabled={!selectedNode}>
						Move Up
					</button>
					<button class="secondary field-grow" onclick={handleMoveDown} disabled={!selectedNode}>
						Move Down
					</button>
				</div>
			</div>

			<div class="demo-card">
				<h3>Remove Node</h3>
				<button class="btn-danger" onclick={handleRemoveNode} disabled={!selectedNode}>
					Remove Selected
				</button>
			</div>

			<div class="demo-card">
				<h3>Actions</h3>
				<div class="field-row">
					<button class="secondary field-grow" onclick={handleExport}>Export to Console</button>
					<button class="secondary field-grow" onclick={resetTree}>Reset Tree</button>
				</div>
			</div>

			<div class="demo-card">
				<h3>Drop Zones</h3>
				<div class="control-row">
					<div class="control-group">
						<label for="dz-mode">Mode</label>
						<select id="dz-mode" bind:value={dropZoneMode}>
							<option value="floating">Floating</option>
							<option value="glow">Glow</option>
						</select>
					</div>
					<div class="control-group">
						<label for="dz-start">Start</label>
						<input id="dz-start" class="w-sm" type="text" bind:value={dropZoneStart} placeholder="50% or 50px" />
					</div>
					{#if dropZoneMode === 'floating'}
						<div class="control-group">
							<label for="dz-layout">Layout</label>
							<select id="dz-layout" bind:value={dropZoneLayout}>
								<option value="around">Around</option>
								<option value="before">Before</option>
								<option value="after">After</option>
								<option value="wave">Wave</option>
								<option value="wave2">Wave2</option>
							</select>
						</div>
						<div class="control-group">
							<label for="dz-max-width">Max W</label>
							<input id="dz-max-width" class="w-sm" type="number" bind:value={dropZoneMaxWidth} min="50" max="300" />
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<div class="output">
		<p class="output-label">Activity Log</p>
		<LogPanel entries={activityLog} empty="No activity yet. Select a node and use the controls, or Ctrl/Cmd+C / X / V." />
	</div>
</div>

<!-- API Reference -->
<div class="card">
	<h2>TE02 · Tree Editor API</h2>
	<p class="description">Methods available for programmatic tree manipulation.</p>

	<table>
		<thead>
			<tr>
				<th>Method</th>
				<th>Description</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td><code>addNode(parentPath, data, pathSegment?)</code></td>
				<td>Add a new node under the specified parent</td>
			</tr>
			<tr>
				<td><code>moveNode(sourcePath, targetPath, position)</code></td>
				<td>Move a node to a new location ('before', 'after', 'child')</td>
			</tr>
			<tr>
				<td><code>removeNode(path, includeDescendants?)</code></td>
				<td>Remove a node (and optionally its descendants)</td>
			</tr>
			<tr>
				<td><code>updateNode(path, dataUpdates)</code></td>
				<td>Update data properties of a node in place</td>
			</tr>
			<tr>
				<td><code>copyNodeWithDescendants(node, parentPath, transformFn)</code></td>
				<td>Deep-copy a node and its subtree under a new parent</td>
			</tr>
			<tr>
				<td><code>getNodeByPath(path)</code></td>
				<td>Get a node by its path</td>
			</tr>
			<tr>
				<td><code>getChildren(parentPath)</code></td>
				<td>Get direct children of a node</td>
			</tr>
			<tr>
				<td><code>getSiblings(path)</code></td>
				<td>Get siblings of a node (including itself)</td>
			</tr>
			<tr>
				<td><code>refreshSiblings(parentPath)</code></td>
				<td>Re-sort siblings using orderMember</td>
			</tr>
			<tr>
				<td><code>refreshNode(path)</code></td>
				<td>Force re-render of a single node</td>
			</tr>
			<tr>
				<td><code>bind:expandedPaths</code></td>
				<td>The expanded set (<code>Set&lt;string&gt;</code>) — read it to save, assign it to restore</td>
			</tr>
			<tr>
				<td><code>bind:nodes</code></td>
				<td>Input AND current state — after a mutation the bound array holds the tree's data</td>
			</tr>
		</tbody>
	</table>

	<div class="note">
		<p class="note-title">orderMember Prop</p>
		<p>
			For proper before/after positioning, set the <code>orderMember</code> prop to specify
			which field in your data contains the sort order value. The tree will automatically
			calculate new order values when moving nodes.
		</p>
		<pre>{`<Tree
  nodes={data}
  orderMember="sortOrder"
  ...
/>`}</pre>
	</div>

	<h3 class="subsection">Clipboard API</h3>
	<p class="description">
		Controller methods (call via <code>beforeKeydownCallback</code>'s <code>controller</code> arg or
		<code>bind:this</code>) backed by a module-level, cross-tree clipboard.
	</p>
	<table>
		<thead>
			<tr><th>Method</th><th>Description</th></tr>
		</thead>
		<tbody>
			<tr>
				<td><code>copyNodes(paths?)</code></td>
				<td>Snapshot nodes onto the shared clipboard (defaults to the highlight set)</td>
			</tr>
			<tr>
				<td><code>cutNodes(paths?)</code></td>
				<td>Mark nodes for a move; they dim until pasted (tracked on <code>cutPaths</code>)</td>
			</tr>
			<tr>
				<td><code>pasteNodes(targetPath, transform?, position?)</code></td>
				<td>Insert clipboard content; returns <code>PasteResult</code> (<code>{`{ count, skipped }`}</code>)</td>
			</tr>
			<tr>
				<td><code>cancelCut()</code></td>
				<td>Clear a pending cut (also bound to <code>Esc</code>)</td>
			</tr>
			<tr>
				<td><code>hasClipboardContent()</code> / <code>getClipboardOperation()</code></td>
				<td>Query whether the clipboard has data, and whether it's a copy or cut</td>
			</tr>
		</tbody>
	</table>

	<table class="mt-1">
		<thead>
			<tr><th>Prop / helper</th><th>Description</th></tr>
		</thead>
		<tbody>
			<tr>
				<td><code>nodeInputTransformationCallback(data, ctx) =&gt; T | null</code></td>
				<td>Per-node paste derivation — fresh ids/values/names; return <code>null</code> to skip a node (skipping a root skips its subtree)</td>
			</tr>
			<tr>
				<td><code>nodeOutputTransformationCallback(data, ctx) =&gt; T</code></td>
				<td>Per-node clean at copy time — strip/redact fields before they hit the shared clipboard</td>
			</tr>
			<tr>
				<td><code>beforePasteCallback(targetPath, op, entries)</code></td>
				<td>Batch policy — redirect target/position or return <code>false</code> to block. Entries are <strong>readonly</strong></td>
			</tr>
			<tr>
				<td><code>uniqueName(base, taken, suffix?)</code></td>
				<td>Exported helper — collision-free name (default <code>"Name Copy N"</code>); use with names read off the roots' landing neighbours (<code>ctx.target.node.children</code> for a <code>'child'</code> paste, else <code>ctx.target.siblings</code>)</td>
			</tr>
		</tbody>
	</table>

	<div class="note">
		<p class="note-title">Two roles, two hooks</p>
		<p>
			<code>beforePasteCallback</code> is batch <strong>policy</strong> (redirect/block, readonly
			entries); <code>nodeInputTransformationCallback</code> is per-node <strong>derivation</strong>
			(ids, values, naming, skip). The clipboard snapshot is immutable — each paste runs on a
			fresh working copy, so naming never compounds.
		</p>
	</div>
</div>

<!-- Code Example -->
<div class="card">
	<h2>TE03 · Code Example</h2>
	<p class="description">Example of handling tree editing operations.</p>

	<div class="code-block">
		<pre>{`<script lang="ts">
  import { Tree } from '@keenmate/svelte-treeview';
  import type { LTreeNode, DropPosition, DropOperation } from '@keenmate/svelte-treeview';

  interface MyNode {
    id: number;
    path: string;
    name: string;
    sortOrder: number;
  }

  let treeRef: Tree<MyNode>;
  let selectedNode = $state<LTreeNode<MyNode> | null>(null);

  // Add a new node
  function addChild() {
    const result = treeRef.addNode(
      selectedNode?.path || '',
      { id: Date.now(), path: '', name: 'New Node', sortOrder: 100 }
    );
    if (result.success) {
      console.log('Added:', result.node);
    }
  }

  // Move node before sibling
  function moveUp() {
    if (!selectedNode) return;
    const siblings = treeRef.getSiblings(selectedNode.path);
    const index = siblings.findIndex(s => s.path === selectedNode!.path);
    if (index > 0) {
      treeRef.moveNode(selectedNode.path, siblings[index - 1].path, 'before');
    }
  }

  // Remove selected node
  function remove() {
    if (!selectedNode) return;
    treeRef.removeNode(selectedNode.path);
    selectedNode = null;
  }

  // Handle drag-drop
  // dragDropMode: 'none' | 'self' | 'cross' | 'both'
  //   none  — disabled (default)
  //   self  — reorder within same tree only
  //   cross — between different trees only
  //   both  — same-tree and cross-tree
  function handleDrop({ source, target, position }: NodeDropContext<MyNode>) {
    const draggedNode = source.node, dropNode = target?.node ?? null;
    if (dropNode) {
      treeRef.moveNode(draggedNode.path, dropNode.path, position);
    }
  }
<\/script>

<Tree
  bind:this={treeRef}
  nodes={data}
  orderMember="sortOrder"
  dragDropMode="both"
  onNodeDrop={handleDrop}
  bind:focusedNode={selectedNode}
>
  {#snippet nodeTemplate(node: any)}
    <span>{node.data?.name}</span>
  {/snippet}
</Tree>`}</pre>
	</div>
</div>

<!-- Multi-select + Clipboard -->
<div class="card">
	<h2>TE04 · Multi-select &amp; Clipboard (Ctrl/Cmd + C / X / V)</h2>
	<p class="description">
		The controller implements the clipboard operations and a shared cross-tree
		clipboard; the key bindings are left to you via <code>beforeKeydownCallback</code>.
		Per-node paste derivation (fresh ids, values, "Copy N" naming, per-entry skip)
		lives in <code>nodeInputTransformationCallback</code>; <code>beforePasteCallback</code>
		is policy only (redirect/block) and gets <strong>readonly</strong> entries.
		Enable multi-select with <code>selectionMode="multiple"</code>.
	</p>

	<div class="code-block">
		<pre>{`import { uniqueName } from '@keenmate/svelte-treeview';
import type { TreeController, NodeTransformContext } from '@keenmate/svelte-treeview';

let focusedNode = $state<LTreeNode<MyNode> | null>(null);
let selectedPaths = $state<Set<string>>(new Set());
let cutPaths = $state<Set<string>>(new Set());
let nextId = 1000;

// Copy/cut act on the highlight set when present, else the focused node.
function clipboardPaths(controller: TreeController<MyNode>) {
  if (controller.selectedPaths.size > 0) return [...controller.selectedPaths];
  return focusedNode ? [focusedNode.path] : [];
}

// THE place for all paste-time data derivation — pure, per node, called by the
// library with LIVE references. target mirrors source: { path, node, parent, siblings }.
// Return new data (fresh id/value/name) or null to SKIP this node.
function pasteTransform({ data, ...ctx }: NodeTransformCallbackContext<MyNode>): MyNode | null {
  const landing = ctx.position === 'child' && ctx.target?.node
    ? Object.values(ctx.target.node.children)
    : ctx.target?.siblings ?? [];
  const taken = landing.map(s => s.data?.name ?? '');
  return {
    ...data,
    id: nextId++,
    path: '',                                            // assigned by addNode
    name: ctx.isRoot ? uniqueName(data.name, taken) : data.name
  };
}

// beforePaste = policy only. Pasting onto the copied node itself (Ctrl+C then
// Ctrl+V, no move) → redirect into its parent so the copy lands as a sibling.
function beforePaste(ctx) {
  if (ctx.operation !== 'copy') return;
  if (ctx.target.path && ctx.entries.some(e => e.sourcePath === ctx.target.path))
    return { targetPath: ctx.target.node?.parentPath ?? '' };
}

function handleKeydown({ event, controller }) {
  const mod = event.ctrlKey || event.metaKey;  // Ctrl on Win/Linux, Cmd on macOS
  const key = event.key.toLowerCase();

  if (mod && key === 'c') {
    controller.copyNodes(clipboardPaths(controller));
    cutPaths = new Set();                         // copy supersedes a pending cut
    return false;
  }
  if (mod && key === 'x') {
    controller.cutNodes(clipboardPaths(controller));
    cutPaths = new Set(controller.cutPaths);      // mirror dim set for the template
    return false;
  }
  if (mod && key === 'v') {
    if (!controller.hasClipboardContent()) return false;
    controller.pasteNodes(focusedNode?.path ?? '');  // transform comes from the prop
    cutPaths = new Set();
    return false;
  }
  if (event.key === 'Escape' && cutPaths.size > 0) {
    controller.cancelCut();
    cutPaths = new Set();
    return false;
  }
  return;  // let the tree handle everything else
}`}</pre>
	</div>

	<div class="note">
		<p class="note-title">Two roles, two hooks</p>
		<p>
			<code>beforePasteCallback</code> is <strong>batch policy</strong> — redirect
			target/position or block; it sees <strong>readonly</strong> entries and never
			mutates data. <code>nodeInputTransformationCallback(data, ctx) =&gt; T | null</code>
			is <strong>per-node derivation</strong> — ids, values, <code>"Copy N"</code> naming,
			and per-entry skip (return <code>null</code>). The clipboard snapshot is immutable; each
			paste runs on a fresh working copy, and <code>nodeOutputTransformationCallback</code> can
			clean data before it ever lands on the shared clipboard.
		</p>
	</div>
</div>

<!-- Business Scenarios -->
<div class="card">
	<h2>TE05 · Business Scenarios</h2>
	<p class="description">
		Real-world tree-manipulation workflows with (mock) database integration. Switch tabs to
		compare five persistence strategies — each drags from the shared source tree into a target
		tree and logs the DB round-trip.
	</p>
	<div class="tabs">
		{#each ['A', 'B', 'C', 'D', 'E'] as tab}
			<button
				class="tab"
				class:active={activeTab === tab}
				onclick={() => (activeTab = tab as Scenario)}
			>
				Scenario {tab}
			</button>
		{/each}
	</div>

	<div class="demo-area">
		<h3>{scenarioDescriptions[activeTab].title}</h3>
		<p>{scenarioDescriptions[activeTab].description}</p>
		<p>Key feature: <code>{scenarioDescriptions[activeTab].keyFeature}</code></p>
	</div>
</div>

<!-- Trees Side by Side -->
<div class="card">
	<div class="trees-side-by-side">
		<!-- Source Tree (shared) -->
		<div>
			<h3>Source Tree (drag from here)</h3>
			<div class="tree-container">
				<Tree
					treeId="source-tree"
					nodes={sourceData}
					idMember="id"
					pathMember="path"
					orderMember="sortOrder"
					sortCallback={sortByOrder}
					isSorted={true}
					expandLevel={3}
					dragDropMode="cross"
					getIsDraggableCallback={() => true}
					getIsDropAllowedCallback={() => true}
					{...getTreeProps()}
				>
					{#snippet nodeTemplate(node: any)}
						<span><small class="muted mono">[{node.data?.id}]</small> {node.data?.icon} {node.data?.name}</span>
					{/snippet}
				</Tree>
			</div>
		</div>

		<!-- Target Tree (per scenario) -->
		<div>
			<h3>
				Target Tree
				{#if activeTab === 'E' && unsavedCountE > 0}
					<span class="unsaved-badge">{unsavedCountE} unsaved</span>
				{/if}
			</h3>
			<div class="tree-container">
				{#if activeTab === 'A'}
					<Tree
						bind:this={treeRefA}
						bind:expandedPaths={expandedA}
						treeId="tree-a"
						nodes={targetDataA}
						idMember="id"
						pathMember="path"
						orderMember="sortOrder"
						sortCallback={sortByOrder}
						expandLevel={3}
						dragDropMode="cross"
						getIsDraggableCallback={() => true}
						getIsDropAllowedCallback={() => true}
						onNodeDrop={handleDropA}
						isLoading={isLoadingA}
						{...getTreeProps()}
					>
						{#snippet nodeTemplate(node: any)}
							<span><small class="muted mono">[{node.data?.id}]</small> {node.data?.icon} {node.data?.name}</span>
						{/snippet}
					</Tree>
				{:else if activeTab === 'B'}
					<Tree
						bind:this={treeRefB}
						treeId="tree-b"
						nodes={targetDataB}
						idMember="id"
						pathMember="path"
						orderMember="sortOrder"
						sortCallback={sortByOrder}
						expandLevel={3}
						dragDropMode="cross"
						getIsDraggableCallback={() => true}
						getIsDropAllowedCallback={() => true}
						onNodeDrop={handleDropB}
						isLoading={isLoadingB}
						{...getTreeProps()}
					>
						{#snippet nodeTemplate(node: any)}
							<span><small class="muted mono">[{node.data?.id}]</small> {node.data?.icon} {node.data?.name}</span>
						{/snippet}
					</Tree>
				{:else if activeTab === 'C'}
					<Tree
						bind:this={treeRefC}
						treeId="tree-c"
						nodes={targetDataC}
						idMember="id"
						pathMember="path"
						orderMember="sortOrder"
						sortCallback={sortByOrder}
						expandLevel={3}
						dragDropMode="cross"
						getIsDraggableCallback={() => true}
						getIsDropAllowedCallback={() => true}
						onNodeDrop={handleDropC}
						onNodeClick={onNodeClickC}
						focusedNode={selectedNodeC}
						isLoading={isLoadingC}
						{...getTreeProps()}
					>
						{#snippet nodeTemplate(node: any)}
							<span><small class="muted mono">[{node.data?.id}]</small> {node.data?.icon} {node.data?.name}</span>
						{/snippet}
					</Tree>
				{:else if activeTab === 'D'}
					<Tree
						bind:this={treeRefD}
						treeId="tree-d"
						nodes={targetDataD}
						idMember="id"
						pathMember="path"
						orderMember="sortOrder"
						sortCallback={sortByOrder}
						expandLevel={3}
						dragDropMode="cross"
						getIsDraggableCallback={() => true}
						getIsDropAllowedCallback={() => true}
						onNodeDrop={handleDropD}
						isLoading={isLoadingD}
						{...getTreeProps()}
					>
						{#snippet nodeTemplate(node: any)}
							<span><small class="muted mono">[{node.data?.id}]</small> {node.data?.icon} {node.data?.name}</span>
						{/snippet}
						{#snippet noData()}
							<div class="drop-placeholder-content">
								<p class="placeholder-icon">📂</p>
								<p>Empty tree — drag items here or click "Add Root Node"</p>
							</div>
						{/snippet}
						{#snippet dropPlaceholder()}
							<div class="drop-placeholder-content">
								<p class="placeholder-icon">📥</p>
								<p>Drag items here or click "Add Root Node"</p>
							</div>
						{/snippet}
					</Tree>
				{:else if activeTab === 'E'}
					<Tree
						bind:this={treeRefE}
						treeId="tree-e"
						bind:nodes={targetDataE}
						idMember="id"
						pathMember="path"
						orderMember="sortOrder"
						sortCallback={sortByOrder}
						expandLevel={3}
						dragDropMode="cross"
						getIsDraggableCallback={() => true}
						getIsDropAllowedCallback={() => true}
						onNodeDrop={handleDropE}
						isLoading={isLoadingE}
						{...getTreeProps()}
					>
						{#snippet nodeTemplate(node: any)}
							<span><small class="muted mono">[{node.data?.id}]</small> {node.data?.icon} {node.data?.name}</span>
						{/snippet}
						{#snippet noData()}
							<div class="drop-placeholder-content">
								<p class="placeholder-icon">📂</p>
								<p>Empty tree — drag items here or add nodes</p>
							</div>
						{/snippet}
						{#snippet dropPlaceholder()}
							<div class="drop-placeholder-content">
								<p class="placeholder-icon">📥</p>
								<p>Build your tree structure, then "Save All"</p>
							</div>
						{/snippet}
					</Tree>
				{/if}
			</div>
		</div>
	</div>

	<!-- Scenario-specific Controls -->
	<div class="controls form-actions">
		{#if activeTab === 'A'}
			<button onclick={reloadFromDbA}>Reload from DB</button>
			<button class="secondary" onclick={resetA}>Reset</button>
		{:else if activeTab === 'B'}
			<button class="secondary" onclick={resetB}>Reset</button>
			<span class="muted">Same-tree moves are auto-handled by the library</span>
		{:else if activeTab === 'C'}
			<button onclick={handleAddC}>Add Child</button>
			<input class="w-md" type="text" bind:value={editNameC} placeholder="New name..." />
			<button onclick={handleUpdateC} disabled={!selectedNodeC}>Update Name</button>
			<button class="btn-danger" onclick={handleDeleteC} disabled={!selectedNodeC}>Delete</button>
			<button class="secondary" onclick={resetC}>Reset</button>
		{:else if activeTab === 'D'}
			<button onclick={addRootNodeD}>Add Root Node</button>
			<button class="secondary" onclick={clearD}>Clear All</button>
		{:else if activeTab === 'E'}
			<button onclick={addRootNodeE}>Add Node</button>
			<button onclick={saveAllE} disabled={unsavedCountE === 0}>
				Save All ({unsavedCountE} unsaved)
			</button>
			<button class="secondary" onclick={clearE}>Clear All</button>
		{/if}
	</div>
</div>

<!-- Activity Log -->
<div class="card">
	<h3>Activity Log</h3>
	<LogPanel entries={getCurrentLog()} empty="No activity yet. Try dragging nodes or using the controls above." />
</div>

<!-- Mock Database -->
<div class="card">
	<details>
		<summary>Mock Database ({getCurrentDb().length} records)</summary>
		<div class="output">
			<pre>{JSON.stringify(getCurrentDb(), null, 2)}</pre>
		</div>
	</details>
</div>

<!-- Code Example -->
<div class="card">
	<h3>Code Example — Scenario {activeTab}</h3>
	<div class="code-block">
		{#if activeTab === 'A'}
			<pre>{`// Scenario A: Full Redraw with State Preservation
async function handleDrop({ source, target, position }) {
  const draggedNode = source.node, dropNode = target?.node ?? null;
  // 1. Save expanded state BEFORE changes
  const saved = new Set(expandedPaths); // bind:expandedPaths={expandedPaths}

  // 2. Save to database
  await saveToDatabase(draggedNode);

  // 3. Reload FULL tree from database
  targetData = await loadFromDatabase();

  // 4. Restore expanded state
  await tick();
  expandedPaths = saved;
}`}</pre>
		{:else if activeTab === 'B'}
			<pre>{`// Scenario B: Partial Redraw (Recommended)
async function handleDrop({ source, target, position }) {
  const draggedNode = source.node, dropNode = target?.node ?? null;
  // Same-tree moves are AUTO-HANDLED by the library!
  // Library calls moveNode() internally - no rebuild needed.

  // Just save to DB for persistence
  await saveToDatabase({
    action: 'move',
    from: draggedNode.path,
    to: dropNode.path,
    position
  });

  // Tree is already updated - no reload needed!
}`}</pre>
		{:else if activeTab === 'C'}
			<pre>{`// Scenario C: Individual CRUD Operations
async function handleAdd() {
  const result = treeRef.addNode(parentPath, newData);
  if (result.success) {
    await saveToDatabase(result.node.data);
  }
}

async function handleUpdate() {
  const result = treeRef.updateNode(path, { name: newName });
  if (result.success) {
    await saveToDatabase(result.node.data);
  }
}

async function handleDelete() {
  const result = treeRef.removeNode(path);
  if (result.success) {
    await deleteFromDatabase(path);
  }
}`}</pre>
		{:else if activeTab === 'D'}
			<pre>{`// Scenario D: Empty Tree + One by One
// Use dropPlaceholder for empty state
<Tree onNodeDrop={handleDrop}>
  {#snippet dropPlaceholder()}
    <div>Drop items here to start building</div>
  {/snippet}
</Tree>

async function handleDrop({ source, target, position }) {
  const draggedNode = source.node, dropNode = target?.node ?? null;
  const newNode = { ...draggedNode.data, id: nextId++ };
  const result = treeRef.addNode(dropNode?.path || '', newNode);

  if (result.success) {
    // Save immediately
    await saveToDatabase(result.node.data);
  }
}`}</pre>
		{:else if activeTab === 'E'}
			<pre>{`// Scenario E: Batch Create Then Save
function handleDrop({ source, target, position }) {
  const draggedNode = source.node, dropNode = target?.node ?? null;
  // Add to tree WITHOUT saving
  treeRef.copyNodeWithDescendants(
    draggedNode,
    dropNode?.path || '',
    (data) => ({ ...data, id: nextId++ })
  );
  unsavedCount++;
}

async function saveAll() {
  // bind:nodes={data} holds the tree's current data (mutations included)
  const allData = $state.snapshot(data);

  // Batch save to database
  await saveBatchToDatabase(allData);
}`}</pre>
		{/if}
	</div>
</div>

<style>
	/* TE01 — tree beside a 300px controls column. minmax(0, 1fr) lets the tree column
	   shrink below its rows' min-content (otherwise the tree widens the page on a phone). */
	.editor-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 300px;
		gap: 1.5rem;
	}

	@media (max-width: 768px) {
		.editor-layout {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	.controls-section {
		display: grid;
		gap: 1rem;
		align-content: start;
	}

	/* TE01 node row: name + muted type + (copy-redacted) secret token. */
	.selected-node {
		font-weight: 600;
		color: var(--kmwc-accent-color);
	}

	.cut-dimmed {
		opacity: 0.45;
		font-style: italic;
	}

	.node-type {
		margin-left: 0.35rem;
		font-size: 0.7rem;
		color: var(--kmwc-text-color-3);
	}

	.node-secret {
		margin-left: 0.35rem;
		padding: 0 0.3rem;
		border-radius: var(--kmwc-radius-sm);
		font-family: var(--kmwc-mono-font-family);
		font-size: 0.65rem;
		color: var(--kmwc-warning-color);
		background: color-mix(in srgb, var(--kmwc-warning-color) 14%, transparent);
	}

	/* TE05 — the library's empty-tree / drop-placeholder snippets (scenarios D + E). */
	.drop-placeholder-content {
		padding: 2rem;
		text-align: center;
		color: var(--kmwc-accent-color);
	}

	.placeholder-icon {
		margin: 0;
		font-size: 2rem;
	}

	summary {
		cursor: pointer;
		font-weight: 500;
	}
</style>
