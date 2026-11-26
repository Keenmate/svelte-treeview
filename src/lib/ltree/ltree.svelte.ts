import FlexSearch, { type Index, type SearchOptions } from 'flexsearch';

import { type LTreeNode, createLTreeNode } from './ltree-node.svelte.js';

import { isEmptyString } from '../helpers/string-helpers.js';
import {
	getLevel,
	getParentPath,
	getPathSegments,
	getRelativePath,
	getAncestorPaths,
	getPathChain,
	isSelfOrDescendant,
	bumpRev,
	getDescendantPaths
} from '../helpers/ltree-helpers.js';

import type { Ltree, LTreeConfig, InsertArrayResult, InsertBranchResult, ReplaceBranchResult, RemoveBranchResult, RemoveBranchOptions, NodeContext, SortContext, ExpandOptions, InsertPosition, SortOptions, NodesSortContext, DropPosition } from './types.js';
import { createSearchIndex } from './flex.js';
import { Indexer, DEFAULT_INDEXER_BATCH_SIZE } from './indexer.js';

/** Default max matches a search/filter returns (FlexSearch's silent default is 100).
 *  Override with the `maxSearchResultCount` prop or a per-call `{ limit }`. */
export const DEFAULT_SEARCH_RESULT_LIMIT = 1000;
import { perfStart, perfEnd, perfSummary } from '../perf-logger.js';
import { dataLogger } from '../logger.js';

/** Helper to safely access a property on a generic data item using a string member name */
function getField(item: unknown, member: string): any {
	return (item as Record<string, unknown>)[member];
}

/**
 * Build an ltree from `initialConfig` (members, callbacks, sort, separator, expand level, search
 * index — `reconfigure(config)` swaps it later) plus `treeId`, which only names it in logs.
 * `opts` = initial values of other Ltree fields (e.g. `displayValueFallback`, `isSortingEnabled`).
 */
export function createLTree<T>(
	initialConfig: LTreeConfig<T> & { treeId?: string },
	opts?: Partial<Ltree<T>>
): Ltree<T> {
	const { treeId: _treeId, ...firstConfig } = initialConfig;
	let config: LTreeConfig<T> = firstConfig;

	// Which node fields come from the data (a member is set) and which are calculated.
	// Re-derived by reconfigure().
	let shouldCalculateParentPath = false;
	let shouldCalculateLevel = false;
	let shouldCalculateHasChildren = false;
	let shouldCalculateIsExpanded = false;
	let shouldCalculateIsSelectable = false;
	let shouldCalculateIsChecked = false;
	let shouldCalculateIsDraggable = false;
	let shouldCalculateIsDropAllowed = false;
	let shouldCalculateAllowedDropPositions = false;
	let shouldCalculateIsCollapsible = false;
	let shouldCalculateDisplayValue = false;
	let shouldCalculateSearchValue = false;
	function deriveCalculatedFields() {
		shouldCalculateParentPath = isEmptyString(config.parentPathMember);
		shouldCalculateLevel = isEmptyString(config.levelMember);
		shouldCalculateHasChildren = isEmptyString(config.hasChildrenMember);
		shouldCalculateIsExpanded = isEmptyString(config.isExpandedMember);
		shouldCalculateIsSelectable = isEmptyString(config.isSelectableMember);
		shouldCalculateIsChecked = isEmptyString(config.isCheckedMember);
		shouldCalculateIsDraggable = isEmptyString(config.isDraggableMember);
		shouldCalculateIsDropAllowed = isEmptyString(config.isDropAllowedMember);
		shouldCalculateAllowedDropPositions = isEmptyString(config.allowedDropPositionsMember);
		shouldCalculateIsCollapsible = isEmptyString(config.isCollapsibleMember);
		shouldCalculateDisplayValue = isEmptyString(config.displayValueMember);
		shouldCalculateSearchValue = isEmptyString(config.searchValueMember);
	}
	deriveCalculatedFields();

	// Reactive so a runtime change (Tree prop / update()) re-renders the fallback labels.
	let displayValueFallbackState = $state<string>(opts?.displayValueFallback ?? '[N/A]');
	// Spread last over the object below — WITHOUT displayValueFallback, which would replace the
	// reactive accessor with a plain value (rows then never re-rendered a changed fallback).
	const { displayValueFallback: _fallback, ...restOpts } = opts ?? {};

	// this is absolutely crucial to keep order of sorted items. Segments are just numbers and numbers as properties are always sorted
	// see https://stackoverflow.com/questions/33351816/how-to-prevent-automatic-sort-of-object-numeric-property/51497854#51497854
	const segmentPrefix = 'x';

	/**
	 * Follow `path` segment by segment down from `start`; `onStep` sees every node on the way
	 * (not `start`). Null when a segment is missing. `''` = `start`.
	 */
	function walkPath(
		start: LTreeNode<T>,
		path: string,
		separator: string,
		onStep?: (node: LTreeNode<T>) => void
	): LTreeNode<T> | null {
		let node = start;
		if (!path) return node;
		for (const part of path.split(separator)) {
			const segment = segmentPrefix + part;
			if (!Object.prototype.hasOwnProperty.call(node.children, segment)) return null;
			node = node.children[segment]!;
			onStep?.(node);
		}
		return node;
	}

	/** Bump `_rev` on every ancestor of `path` in the real tree (their rows re-render). */
	function bumpAncestors(path: string, separator: string): void {
		for (const a of getAncestorPaths(path, separator)) {
			const ancestor = walkPath(root, a, separator);
			if (ancestor) bumpRev(ancestor);
		}
	}

	/**
	 * Seed a node's per-node flags from its row — callback > member (isExpanded: > expandLevel).
	 * `node.data` must already be the row so callbacks reading `node.data?.x` see it.
	 */
	function seedNodeFlags(node: LTreeNode<T>, row: T): void {
		if (config.getIsExpandedCallback) node.isExpanded = config.getIsExpandedCallback({ node });
		else if (!shouldCalculateIsExpanded) node.isExpanded = getField(row, config.isExpandedMember!);
		else node.isExpanded = !!config.expandLevel && (node.level ?? 0) <= config.expandLevel;

		// isSelectable: stored on the node so renderers can read it directly
		if (config.getIsSelectableCallback) node.isSelectable = config.getIsSelectableCallback({ node });
		else if (!shouldCalculateIsSelectable) node.isSelectable = getField(row, config.isSelectableMember!);

		if (config.getIsCheckedCallback) node.isChecked = config.getIsCheckedCallback({ node });
		else if (!shouldCalculateIsChecked) node.isChecked = getField(row, config.isCheckedMember!);

		if (config.getIsDraggableCallback) node.isDraggable = config.getIsDraggableCallback({ node });
		else if (!shouldCalculateIsDraggable) node.isDraggable = getField(row, config.isDraggableMember!);

		if (!shouldCalculateIsCollapsible) node.isCollapsible = getField(row, config.isCollapsibleMember!);

		if (config.getIsDropAllowedCallback) node.isDropAllowed = config.getIsDropAllowedCallback({ node });
		else if (!shouldCalculateIsDropAllowed) node.isDropAllowed = getField(row, config.isDropAllowedMember!);

		if (!shouldCalculateAllowedDropPositions)
			node.allowedDropPositions = getField(row, config.allowedDropPositionsMember!);

		if (config.getIsDraggableCallback || !shouldCalculateIsDraggable) {
			dataLogger.debug(`[seedNodeFlags] isDraggable resolved for ${node.path}`, {
				path: node.path,
				isDraggable: node.isDraggable,
				hadCallback: !!config.getIsDraggableCallback,
				hadMember: !shouldCalculateIsDraggable,
				rowIsDraggable: config.isDraggableMember ? (row as any)?.[config.isDraggableMember] : '(no member)',
				nodeDataIsDraggable: (row as any)?.isDraggable
			});
		}
	}

	/**
	 * A data row → a detached node (path, parent path, segment, level, data, flags, hasChildren);
	 * `error` instead when the row has no usable path (`insertArray` / `addBranch`).
	 */
	function rowToNode(row: T, index: number, separator: string): { node: LTreeNode<T>; error?: string } {
		const node = createLTreeNode<T>();
		node.treeId = _treeId || '';
		node.id = config.idMember ? getField(row, config.idMember) : undefined;
		node.data = row;
		const rawPath = config.pathMember ? getField(row, config.pathMember) : undefined;

		// Validate path - must be a non-empty string
		if (rawPath == null || rawPath === '' || typeof rawPath !== 'string') {
			node.path = '';
			const pathDesc =
				rawPath === '' ? 'empty string' : rawPath == null ? 'undefined/null' : `non-string (${typeof rawPath})`;
			return {
				node,
				error: `Item at index ${index} has invalid path (${pathDesc}). Check that pathMember="${config.pathMember}" matches your data. First item keys: ${index === 0 ? JSON.stringify(Object.keys(row as any)) : '(see index 0)'}`
			};
		}
		node.path = rawPath;
		node.parentPath = shouldCalculateParentPath
			? getParentPath(node.path, separator)
			: getField(row, config.parentPathMember!);
		node.pathSegment = getPathSegments(getRelativePath(node.path, node.parentPath ?? '', separator), 0, 1, separator);
		node.level = shouldCalculateLevel ? getLevel(node.path, separator) : getField(row, config.levelMember!);

		seedNodeFlags(node, row);
		if (!shouldCalculateHasChildren) node.hasChildren = getField(row, config.hasChildrenMember!);
		return { node };
	}

	/** The search text of a node: member (when set and present) → `getSearchValueCallback`; else none. */
	function resolveSearchValue(node: LTreeNode<T>): string | null | undefined {
		if (!shouldCalculateSearchValue && node.data) {
			const value = getField(node.data, config.searchValueMember!);
			if (value != null) return String(value);
		}
		return config.getSearchValueCallback?.({ node });
	}

	/** Set `hasChildren` on `node` from its children (and the data's `hasChildrenMember`). */
	function reconcileHasChildren(node: LTreeNode<T>): void {
		node.hasChildren = Object.keys(node.children).length > 0;
		if (config.hasChildrenMember && node.data) (node.data as any)[config.hasChildrenMember] = node.hasChildren;
	}

	/** Remove every descendant of `node` (search index, count); returns how many left. */
	function clearChildren(node: LTreeNode<T>): number {
		const removed = new Set(getDescendantPaths(node));
		dropFromSearch(removed);
		node.children = {};
		reconcileHasChildren(node);
		nodeCount -= removed.size;
		return removed.size;
	}

	/** Remove `node` with its subtree from `parent` (search index, count, parent's hasChildren). */
	function detachNode(node: LTreeNode<T>, parent: LTreeNode<T>): number {
		const removed = new Set([node.path, ...getDescendantPaths(node)]);
		dropFromSearch(removed);
		delete parent.children[segmentPrefix + node.pathSegment];
		if (Object.keys(parent.children).length === 0) reconcileHasChildren(parent);
		nodeCount -= removed.size;
		return removed.size;
	}

	// Display-value comparison of the default sibling rule (numeric-aware: 'Item 2' < 'Item 10').
	const displayCollator = new Intl.Collator(undefined, { numeric: true });

	// Private state variables
	let root = createLTreeNode<T>();
	let filteredRoot = createLTreeNode<T>();
	let searchIndex: Index | null | undefined = null;

	let changeTracker = $state(Symbol());
	let nodeCount = 0;
	let maxLevel = 0;

	// Positional store behind the search index: a node's slot number IS its FlexSearch id.
	// Removal leaves a tombstone (null) instead of compacting, so every other id stays valid.
	let flatTreeNodes: (LTreeNode<T> | null)[] = [];

	/** Drop removed nodes from search: tombstone their slots + remove their index entries. */
	function dropFromSearch(paths: Set<string>) {
		if (paths.size === 0) return;
		for (let i = 0; i < flatTreeNodes.length; i++) {
			const n = flatTreeNodes[i];
			if (n && paths.has(n.path)) {
				flatTreeNodes[i] = null;
				try {
					searchIndex?.remove(i);
				} catch {
					/* not indexed yet — the null slot already hides it */
				}
			}
		}
	}
	let filteredTree: LTreeNode<T>[] | null = null;

	// Cache for visibleFlatNodes - only recompute when tree changes
	let cachedVisibleFlatNodes: LTreeNode<T>[] = [];
	let cachedVisibleFlatNodesTracker: Symbol | null = null;

	// Async search indexing infrastructure
	let indexer: Indexer<T> | null = null;

	// Last search text passed to filterNodes. The FlexSearch index is built
	// asynchronously via the Indexer, so a filter applied while the index is
	// still warming up returns 0 matches and hides the entire tree. We track
	// the active query here and re-apply it from the indexer's onComplete
	// callback so the visible filter eventually reflects the final index.
	let _lastFilterSearchText: string | null | undefined = null;
	let _isRefilterScheduled = false;
	let _lastFilterSearchOptions: SearchOptions | undefined = undefined;

	/** (Re)create the search index + its async indexer from the current options. */
	function setUpSearch() {
		indexer?.clearQueue();
		indexer = null;
		searchIndex = null;
		if (!config.isInternalSearchIndexEnabled) return;
		searchIndex = config.initializeIndexCallback ? config.initializeIndexCallback() : createSearchIndex();
		if (!searchIndex) return;
		indexer = new Indexer<T>(
			_treeId || 'unknown',
			searchIndex,
			resolveSearchValue,
			config.indexerBatchSize || DEFAULT_INDEXER_BATCH_SIZE, // batch size with fallback
			config.indexerTimeout || 50 // timeout with fallback
		);
	}
	setUpSearch();

	return {
		// Properties
		treePathSeparator: config.treePathSeparator || '.',
		root,
		filteredRoot,
		get changeTracker() {
			return changeTracker;
		},
		idMember: config.idMember ?? '',
		pathMember: config.pathMember ?? '',
		parentPathMember: config.parentPathMember,
		levelMember: config.levelMember,
		isExpandedMember: config.isExpandedMember,
		getIsExpandedCallback: config.getIsExpandedCallback,
		isSelectableMember: config.isSelectableMember,
		getIsSelectableCallback: config.getIsSelectableCallback,
		isCheckedMember: config.isCheckedMember,
		getIsCheckedCallback: config.getIsCheckedCallback,
		isDraggableMember: config.isDraggableMember,
		getIsDraggableCallback: config.getIsDraggableCallback,
		isDropAllowedMember: config.isDropAllowedMember,
		getIsDropAllowedCallback: config.getIsDropAllowedCallback,
		allowedDropPositionsMember: config.allowedDropPositionsMember,
		hasChildrenMember: config.hasChildrenMember,
		displayValueMember: config.displayValueMember,
		getDisplayValueCallback: config.getDisplayValueCallback,
		get displayValueFallback(): string {
			return displayValueFallbackState;
		},
		set displayValueFallback(v: string) {
			displayValueFallbackState = v ?? '[N/A]';
		},

		searchValueMember: config.searchValueMember,
		getSearchValueCallback: config.getSearchValueCallback,
		getAllowedDropPositionsCallback: config.getAllowedDropPositionsCallback,
		isCollapsibleMember: config.isCollapsibleMember,
		getIsCollapsibleCallback: config.getIsCollapsibleCallback,
		orderMember: config.orderMember,
		isSorted: config.isSorted ?? false,
		sortCallback: config.sortCallback,
		isSortingEnabled: true,

		reconfigure(newConfig: LTreeConfig<T>) {
			config = newConfig;
			deriveCalculatedFields();

			// The same settings the methods read off the object.
			this.treePathSeparator = config.treePathSeparator || '.';
			this.idMember = config.idMember ?? '';
			this.pathMember = config.pathMember ?? '';
			this.parentPathMember = config.parentPathMember;
			this.levelMember = config.levelMember;
			this.hasChildrenMember = config.hasChildrenMember;
			this.isExpandedMember = config.isExpandedMember;
			this.getIsExpandedCallback = config.getIsExpandedCallback;
			this.isSelectableMember = config.isSelectableMember;
			this.getIsSelectableCallback = config.getIsSelectableCallback;
			this.isCheckedMember = config.isCheckedMember;
			this.getIsCheckedCallback = config.getIsCheckedCallback;
			this.isDraggableMember = config.isDraggableMember;
			this.getIsDraggableCallback = config.getIsDraggableCallback;
			this.isDropAllowedMember = config.isDropAllowedMember;
			this.getIsDropAllowedCallback = config.getIsDropAllowedCallback;
			this.allowedDropPositionsMember = config.allowedDropPositionsMember;
			this.getAllowedDropPositionsCallback = config.getAllowedDropPositionsCallback;
			this.isCollapsibleMember = config.isCollapsibleMember;
			this.getIsCollapsibleCallback = config.getIsCollapsibleCallback;
			this.displayValueMember = config.displayValueMember;
			this.getDisplayValueCallback = config.getDisplayValueCallback;
			this.searchValueMember = config.searchValueMember;
			this.getSearchValueCallback = config.getSearchValueCallback;
			this.orderMember = config.orderMember;
			this.isSorted = config.isSorted ?? false;
			this.sortCallback = config.sortCallback;
			setUpSearch();
			dataLogger.debug(`[${_treeId}] ltree reconfigured`, {
				idMember: config.idMember,
				pathMember: config.pathMember,
				treePathSeparator: this.treePathSeparator,
				expandLevel: config.expandLevel,
				hasSearchIndex: !!searchIndex
			});
		},

		// Properties for filtering
		filteredTree,
		isFiltered: false,

		// Methods (will be bound later)
		get tree(): LTreeNode<T>[] {
			if (this.isFiltered) {
				return Object.values(filteredRoot?.children) || [];
			}
			if (!root?.children || !changeTracker) {
				return [];
			}

			return Object.values(root.children);
		},

		/**
		 * Returns a flat array of all visible nodes in render order (depth-first).
		 * A node is visible if all its ancestors are expanded.
		 * This is optimized for flat/centralized rendering without recursion.
		 *
		 * Note: This getter depends on changeTracker to ensure reactivity when
		 * nodes are expanded/collapsed or the tree structure changes.
		 * Results are cached to avoid recomputation on repeated access.
		 */
		get visibleFlatNodes(): LTreeNode<T>[] {
			// Explicitly read changeTracker to create reactive dependency
			const _tracker = changeTracker;

			// Return cached result if changeTracker hasn't changed
			if (_tracker === cachedVisibleFlatNodesTracker && cachedVisibleFlatNodes.length > 0) {
				return cachedVisibleFlatNodes;
			}

			const computeStart = performance.now();

			const startRoot = this.isFiltered ? filteredRoot : root;
			if (!startRoot?.children || !_tracker) {
				cachedVisibleFlatNodes = [];
				cachedVisibleFlatNodesTracker = _tracker;
				return cachedVisibleFlatNodes;
			}

			const result: LTreeNode<T>[] = [];
			const self = this;

			function traverse(node: LTreeNode<T>) {
				// Get children in natural tree key order (same as recursive mode).
				// Sorting was already applied at insertion time in insertArray().
				const children = Object.values(node.children);

				for (const child of children) {
					result.push(child);
					// Only traverse into children if this node is expanded
					if (child.isExpanded && child.hasChildren) {
						traverse(child);
					}
				}
			}

			traverse(startRoot);

			// Cache the result
			cachedVisibleFlatNodes = result;
			cachedVisibleFlatNodesTracker = _tracker;
			return result;
		},

		get statistics() {
			// Count the filtered view's nodes (the old closure `isFiltered` was never written → always 0).
			let filteredNodeCount = 0;
			if (this.isFiltered) {
				const count = (n: LTreeNode<T>) => {
					for (const key in n.children) {
						filteredNodeCount++;
						count(n.children[key]!);
					}
				};
				count(filteredRoot);
			}
			const indexerStatus = indexer?.getStatus() || { isProcessing: false, queueSize: 0 };

			return (
				changeTracker && {
					nodeCount,
					maxLevel,
					filteredNodeCount,
					isIndexing: indexerStatus.isProcessing,
					pendingIndexCount: indexerStatus.queueSize
				}
			);
		},

		insertArray: function (data: T[], noEmitChanges: boolean = false): InsertArrayResult<T> {
			data = data || [];

			// Clear any pending indexing from previous calls
			indexer?.clearQueue();
			flatTreeNodes = [];

			// Clear existing tree data - reset root children
			root.children = {};
			// Drop the filtered view's copies of the PREVIOUS data; an active filter is
			// re-applied against the new data when indexing completes (see setCallbacks below).
			filteredRoot.children = {};
			nodeCount = 0;
			maxLevel = 0;

			perfStart(`[${_treeId}] insertArray:conversion`);

			const conversionFailures: Array<{ node: LTreeNode<T>; originalData: T; error: string }> = [];

			let mappedData: LTreeNode<T>[] = [];
			data.forEach((row, index) => {
				const { node, error } = rowToNode(row, index, this.treePathSeparator);
				if (error) conversionFailures.push({ node, originalData: row, error });
				else mappedData.push(node);
			});
			const conversionTime = perfEnd(`[${_treeId}] insertArray:conversion`, data.length);

			perfStart(`[${_treeId}] insertArray:sort`);
			mappedData = this._sortForInsert(mappedData);

			const sortTime = perfEnd(`[${_treeId}] insertArray:sort`, data.length);

			perfStart(`[${_treeId}] insertArray:insert`);

			const failedNodes: Array<{ node: LTreeNode<T>; originalData: T; error: string }> = [
				...conversionFailures
			];

			// Warn early about data mapping issues (most common user error)
			if (conversionFailures.length > 0) {
				dataLogger.warn(
					`[Tree ${_treeId}] ${conversionFailures.length} of ${data.length} items have invalid paths (pathMember="${config.pathMember}"). These items will be skipped.\n` +
						`First failure: ${conversionFailures[0].error}`
				);
			}
			const itemsToIndex: { node: LTreeNode<T>; index: number }[] = [];

			let realIndex: number = 0; // this is used to avoid scenario, when node cannot found a parent
			let successfulCount: number = 0;
			let hasRenderedExpandLevel = false;

			// Pre-compute the last index at expandLevel to avoid O(n²) lookup
			let lastExpandLevelIndex = -1;
			if (config.expandLevel && !noEmitChanges) {
				for (let i = mappedData.length - 1; i >= 0; i--) {
					const nodeLevel =
						mappedData[i].level || getLevel(mappedData[i].path, this.treePathSeparator);
					if (nodeLevel <= config.expandLevel) {
						lastExpandLevelIndex = i;
						break;
					}
				}
			}

			mappedData.forEach((node, index) => {
				const result = this.insertTreeNode(node.parentPath ?? '', node, true);
				if (result) {
					failedNodes.push({
						node: node,
						// node.data, not data[index] — `index` counts the SORTED / mapped rows, so
						// data[index] reported some other row as the failed one.
						originalData: node.data as T,
						error: result
					});
				} else {
					successfulCount++;
					// Collect items for batch indexing
					if (config.isInternalSearchIndexEnabled && indexer) {
						flatTreeNodes.push(node);
						itemsToIndex.push({ node, index: realIndex });
						realIndex++;
					}

					// Progressive rendering: emit changes when we complete expandLevel
					if (
						!noEmitChanges &&
						!hasRenderedExpandLevel &&
						config.expandLevel &&
						index === lastExpandLevelIndex
					) {
						// We've processed all nodes up to expandLevel - render now!
						hasRenderedExpandLevel = true;
						this.refresh();
					}
				}
			});

			// Log errors for backward compatibility and debugging
			if (failedNodes.length > 0) {
				const errorMessages = failedNodes.map((f) => f.error);
				dataLogger.warn(
					`[Tree ${_treeId}] ${failedNodes.length} nodes failed to insert:`,
					errorMessages
				);
			}

			// Batch add items to indexer
			if (itemsToIndex.length > 0 && indexer) {
				indexer.setCallbacks(
					(processed, total) => this.onIndexProgress?.({ processed, total, isComplete: false }),
					() => {
						// Completion callback. Re-apply any active filter before
						// emitting — a filterNodes() call that landed while indexing
						// was still in flight saw an incomplete index, so the visible
						// tree may be missing matching paths until we refresh.
						if (!isEmptyString(_lastFilterSearchText)) {
							// isEmptyString guarantees non-empty string here.
							this.filterNodes(_lastFilterSearchText as string, _lastFilterSearchOptions);
						}
						if (!noEmitChanges) {
							this.refresh();
						}
						const { total } = indexer!.getStatus();
						this.onIndexProgress?.({ processed: total, total, isComplete: true });
					}
				);
				indexer.addToQueue(itemsToIndex);
			}

			// Final render (only if we haven't already rendered progressively)
			if (!noEmitChanges) {
				this.refresh();
			}

			const insertTime = perfEnd(`[${_treeId}] insertArray:insert`, data.length);

			// Log performance summary
			perfSummary(
				_treeId || 'unknown',
				{
					Conversion: conversionTime,
					Sort: sortTime,
					Insert: insertTime
				},
				data.length
			);

			return {
				successful: successfulCount,
				failed: failedNodes,
				total: data.length
			};
		},

		insertTreeNode: function (
			parentPath: string,
			newNode: LTreeNode<T>,
			noEmitChanges?: boolean
		): string | null {
			// Always resolve against the REAL root: while a filter is active the default
			// lookup returns the filtered COPY, and inserting there loses the data (a tree
			// that started with a searchTerm got its whole dataset inserted into the view).
			const parentNode = this.getNodeByPath(parentPath, root);

			if (!parentNode) {
				return `Node: ${newNode.path} - Could not find parent node: ${parentPath}`;
			}
			if (shouldCalculateLevel) {
				newNode.level = (parentNode.level || 0) + 1;
			}

			const newSegment =
				segmentPrefix +
				getPathSegments(
					getRelativePath(newNode?.path, parentPath, this.treePathSeparator),
					0,
					1,
					this.treePathSeparator
				);

			// A duplicate path is a failure, not a silent success: it used to be dropped here yet
			// counted as inserted (and pushed to the search list as an orphan the search could return).
			if (parentNode.children.hasOwnProperty(newSegment)) {
				return `Duplicate path: ${newNode.path}`;
			}
			parentNode.children[newSegment] = newNode;
			if (shouldCalculateHasChildren && !parentNode.hasChildren) {
				parentNode.hasChildren = true;
			}

			// Update statistics
			nodeCount++;
			maxLevel = Math.max(maxLevel, newNode.level || 0);

			if (!noEmitChanges) {
				this.refresh();
			}

			return null;
		},

		filterNodes(_searchTerm: string | null | undefined, _searchOptions?: SearchOptions): void {
			// Remember the active query so the indexer's onComplete callback can
			// re-apply it once the FlexSearch index has finished warming up —
			// otherwise a filter typed while indexing is still in flight hides
			// the entire tree and never recovers.
			_lastFilterSearchText = _searchTerm;
			_lastFilterSearchOptions = _searchOptions;

			if (isEmptyString(_searchTerm)) {
				// Clear filter when search is empty
				filteredRoot.children = {};
				this.isFiltered = false;
				this.refresh();
				this.onSearchStatus?.({
					searchTerm: '',
					matchCount: 0,
					isLimited: false,
					limit: this._resolveSearchLimit(_searchOptions),
					isIndexing: indexer?.isBusy() ?? false
				});
				return;
			}

			if (!config.isInternalSearchIndexEnabled) {
				return;
			}

			perfStart(`[${_treeId}] filterNodes:search`);
			const { nodes, isLimited, limit } = this._searchWithLimit(_searchTerm!, _searchOptions);
			const foundPaths = nodes.map((n) => n.path);
			perfEnd(`[${_treeId}] filterNodes:search`, nodes.length);

			this.createFilteredTree(foundPaths);
			this.onSearchStatus?.({
				searchTerm: _searchTerm!,
				matchCount: nodes.length,
				isLimited,
				limit,
				isIndexing: indexer?.isBusy() ?? false
			});
		},

		_resolveSearchLimit(_searchOptions?: SearchOptions): number {
			const explicit = (_searchOptions as { limit?: number } | undefined)?.limit;
			return explicit ?? this.maxSearchResultCount ?? DEFAULT_SEARCH_RESULT_LIMIT;
		},

		_searchWithLimit(
			_searchTerm: string,
			_searchOptions?: SearchOptions
		): { nodes: LTreeNode<T>[]; isLimited: boolean; limit: number } {
			// Ask for ONE more than the limit so we can tell "exactly N" from "N+, cut off".
			// (FlexSearch's own default limit is 100 and silent — this replaces it.)
			const limit = this._resolveSearchLimit(_searchOptions);
			const resultIndices = searchIndex!.search(_searchTerm, {
				...(_searchOptions as object),
				limit: limit + 1
			} as SearchOptions);
			const isLimited = resultIndices.length > limit;
			const nodes = (isLimited ? resultIndices.slice(0, limit) : resultIndices)
				.map((row) => flatTreeNodes[row as number])
				.filter((n): n is LTreeNode<T> => n != null);
			return { nodes, isLimited, limit };
		},

		searchNodes(
			_searchTerm: string | null | undefined,
			_searchOptions?: SearchOptions
		): LTreeNode<T>[] {
			if (isEmptyString(_searchTerm)) {
				return [];
			}

			if (!config.isInternalSearchIndexEnabled) {
				return [];
			}

			return this._searchWithLimit(_searchTerm!, _searchOptions).nodes;
		},

		createFilteredTree(targetPaths: string[]): void {
			perfStart(`[${_treeId}] createFilteredTree`);
			filteredRoot.children = {};
			filteredTree = null;

			// 1. Expand all target paths to include their parents
			const allRequiredPaths = new Set<string>();
			targetPaths.forEach((path) => {
				for (const p of getPathChain(path, this.treePathSeparator)) allRequiredPaths.add(p);
			});

			// 1b. filterScope — pull in (some of) each match's descendants.
			// Matches + ancestors are the "context" rows and always expand; the added
			// descendants expand only when shouldExpandFilterDescendants (default true).
			const contextPaths = new Set(allRequiredPaths);
			this._addFilterScopeDescendants(targetPaths, allRequiredPaths);
			const expandAdded = this.shouldExpandFilterDescendants ?? true;

			// 2. Build filtered tree with only required paths
			const pathToNode = new Map<string, LTreeNode<T>>();

			// First pass: create copies of all required nodes
			allRequiredPaths.forEach((path) => {
				const originalNode = this.getNodeByPath(path, root);

				if (originalNode) {
					// Deep copy the node but reset children
					const copiedNode: LTreeNode<T> = {
						...originalNode,
						children: {},
						hasChildren: false,
						isExpanded: expandAdded || contextPaths.has(path)
					};
					pathToNode.set(path, copiedNode);
				}
			});

			// Second pass: rebuild parent-child relationships
			allRequiredPaths.forEach((path) => {
				const node = pathToNode.get(path);
				if (!node) return;

				const segments = path.split(this.treePathSeparator);
				if (segments.length > 1) {
					// This node has a parent
					const parentPath = segments.slice(0, -1).join(this.treePathSeparator);
					const parentNode = pathToNode.get(parentPath);
					const segment = segmentPrefix + segments[segments.length - 1];

					if (parentNode) {
						parentNode.children[segment] = node;
						parentNode.hasChildren = true;
					}
				}
			});

			// 2b. Siblings in the REAL tree's order. The required set arrives in search-relevance
			// order (FlexSearch ranks an exact match first) and the 'x'-prefixed child keys keep
			// insertion order, so without this a better-ranked match jumped ahead of its siblings.
			const inTreeOrder = (
				realChildren: Record<string, LTreeNode<T>>,
				copies: Record<string, LTreeNode<T>>
			): Record<string, LTreeNode<T>> => {
				const ordered: Record<string, LTreeNode<T>> = {};
				for (const key of Object.keys(realChildren)) if (key in copies) ordered[key] = copies[key];
				return ordered;
			};
			pathToNode.forEach((copy, path) => {
				if (!copy.hasChildren) return;
				const real = this.getNodeByPath(path, root);
				if (real) copy.children = inTreeOrder(real.children, copy.children);
			});

			// 3. Extract root level nodes for filteredTree
			const rootNodes: LTreeNode<T>[] = [];

			allRequiredPaths.forEach((path) => {
				if (!path.includes(this.treePathSeparator)) {
					// This is a root level node
					const node = pathToNode.get(path);
					if (node) {
						rootNodes.push(node);
					}
				}
			});

			rootNodes.forEach((node) => {
				filteredRoot.children[segmentPrefix + node.path] = node;
			});
			filteredRoot.children = inTreeOrder(root.children, filteredRoot.children);

			filteredTree = Object.values(filteredRoot.children);
			this.isFiltered = true;
			this.refresh();

			perfEnd(`[${_treeId}] createFilteredTree`, rootNodes.length);
		},

		_addFilterScopeDescendants(targetPaths: string[], required: Set<string>): void {
			const scope = this.filterScope ?? 'matches';
			if (scope === 'matches') return;
			const x = Math.max(0, this.filterDescendantDepth ?? 1);

			const heights = new Map<LTreeNode<T>, number>();
			const heightOf = (n: LTreeNode<T>): number => {
				let h = heights.get(n);
				if (h !== undefined) return h;
				h = 0;
				for (const key in n.children) h = Math.max(h, heightOf(n.children[key]!) + 1);
				heights.set(n, h);
				return h;
			};
			const addSubtree = (n: LTreeNode<T>, levelsLeft: number) => {
				if (levelsLeft <= 0) return;
				for (const key in n.children) {
					const child = n.children[key]!;
					required.add(child.path);
					addSubtree(child, levelsLeft - 1);
				}
			};
			// Root sits at level 0, so its height = the deepest node's level.
			const treeDepth = scope === 'tree-depth' ? heightOf(root) : 0;

			for (const path of targetPaths) {
				const node = this.getNodeByPath(path, root);
				if (!node) continue;
				if (scope === 'descendants') addSubtree(node, Infinity);
				else if (scope === 'levels-below') addSubtree(node, x);
				else if (scope === 'subtree-height') {
					if (heightOf(node) <= x) addSubtree(node, Infinity);
				} else if (scope === 'tree-depth') {
					if ((node.level ?? 0) >= treeDepth - x) addSubtree(node, Infinity);
				}
			}
		},

		clearFilter(): void {
			filteredRoot.children = {};
			filteredTree = null;
			this.isFiltered = false;
			this.refresh();
		},

		expandAll(
			nodePath?: string | string[] | null | undefined,
			options?: ExpandOptions
		): void {
			perfStart(`[${_treeId}] expandAll`);
			const self = this;
			const exclusive = options?.isExclusive ?? false;

			function setExpandedRecursive(node: LTreeNode<T>, value: boolean) {
				if (node.isExpanded !== value) {
					node.isExpanded = value;
					bumpRev(node);
				}
				for (const key in node.children) {
					setExpandedRecursive(node.children[key], value);
				}
			}

			const paths: string[] = Array.isArray(nodePath)
				? nodePath.filter((p): p is string => !isEmptyString(p))
				: isEmptyString(nodePath)
					? []
					: [nodePath!];

			if (paths.length === 0) {
				// Whole-tree expand. exclusive has no meaning (nothing to exclude from).
				setExpandedRecursive(root, true);
			} else {
				if (exclusive) {
					// Build spine: every ancestor path of every target must stay expanded
					// so the target subtree is reachable.
					const spineSet = new Set<string>();
					for (const p of paths) {
						for (const s of getPathChain(p, this.treePathSeparator)) spineSet.add(s);
					}
					const isUnderTarget = (path: string) => {
						return paths.some((tp) => isSelfOrDescendant(path, tp, this.treePathSeparator));
					};
					// Walk currently-expanded subtree; collapse anything not on a spine
					// and not under a target. Only descends into expanded branches.
					const trim = (node: LTreeNode<T>) => {
						for (const key in node.children) {
							const child = node.children[key];
							if (!child.isExpanded) continue;
							if (spineSet.has(child.path) || isUnderTarget(child.path)) {
								trim(child);
							} else if (self.getNodeIsCollapsible(child)) {
								child.isExpanded = false;
								bumpRev(child);
								trim(child);
							}
						}
					};
					trim(root);
				}

				// Expand spine + entire subtree under each target.
				for (const p of paths) {
					const node = walkPath(root, p, this.treePathSeparator, (n) => {
						if (!n.isExpanded) {
							n.isExpanded = true;
							bumpRev(n);
						}
					});
					if (node) setExpandedRecursive(node, true);
				}
			}

			this.refresh();
			perfEnd(`[${_treeId}] expandAll`);
		},

		collapseAll(
			nodePath?: string | string[] | null | undefined,
			options?: ExpandOptions
		): void {
			perfStart(`[${_treeId}] collapseAll`);
			const self = this;

			function collapseRecursive(node: LTreeNode<T>) {
				if (node.isExpanded && self.getNodeIsCollapsible(node)) {
					node.isExpanded = false;
					bumpRev(node);
				}
				for (const key in node.children) {
					collapseRecursive(node.children[key]);
				}
			}

			const paths: string[] = Array.isArray(nodePath)
				? nodePath.filter((p): p is string => !isEmptyString(p))
				: isEmptyString(nodePath)
					? []
					: [nodePath!];

			if (paths.length === 0) {
				collapseRecursive(root);
			} else {
				for (const p of paths) {
					const target = this.getNodeByPath(p);
					if (target) collapseRecursive(target);
				}
			}

			this.refresh();
			perfEnd(`[${_treeId}] collapseAll`);
		},

		insert: function (path: string, data: T, noEmitChanges: boolean = false): void {
			let node = this.root;

			const segments = path.split(this.treePathSeparator);
			for (let i = 0; i < segments.length; i++) {
				const segment = segmentPrefix + segments[i];

				if (!node.children.hasOwnProperty(segment)) {
					node.children[segment] = createLTreeNode<T>();
				}
				node = node.children[segment]!;
			}

			node.hasChildren = true;
			node.data = data;

			if (!noEmitChanges) {
				this.refresh();
			}
		},

		expandNodes: function (
			path: string | string[],
			options?: ExpandOptions
		) {
			perfStart(`[${_treeId}] expandNodes`);
			const self = this;
			const exclusive = options?.isExclusive ?? false;
			const rootNode = this.isFiltered ? filteredRoot : root;
			const paths = Array.isArray(path) ? path : [path];
			let hasChanges = false;

			if (exclusive) {
				// Build spine set: union of every ancestor path across all inputs.
				const spineSet = new Set<string>();
				for (const p of paths) {
					for (const s of getPathChain(p, this.treePathSeparator)) spineSet.add(s);
				}
				// Walk currently-expanded subtree, collapse anything off-spine.
				// Bumping _rev on each mutation forces the flat-mode keyed {#each} to
				// re-mount the affected Node component so its toggle-icon class
				// reflects the new isExpanded value. Without the bump the row is
				// reused, and the toggle's `--expanded` modifier ends up stale.
				const trim = (node: LTreeNode<T>) => {
					for (const key in node.children) {
						const child = node.children[key];
						if (!child.isExpanded) continue;
						if (spineSet.has(child.path)) {
							trim(child);
						} else if (self.getNodeIsCollapsible(child)) {
							child.isExpanded = false;
							bumpRev(child);
							hasChanges = true;
							trim(child);
						}
					}
				};
				trim(rootNode);
			}

			for (const p of paths) {
				walkPath(rootNode, p, this.treePathSeparator, (n) => {
					if (!n.isExpanded) {
						n.isExpanded = true;
						bumpRev(n);
						hasChanges = true;
					}
				});
			}

			if (hasChanges) {
				this.refresh();
			}

			perfEnd(`[${_treeId}] expandNodes`);
			return this;
		},

		collapseNodes: function (path: string | string[], options?: ExpandOptions) {
			const rootNode = this.isFiltered ? filteredRoot : this.root;
			const paths = Array.isArray(path) ? path : [path];
			let hasChanges = false;

			for (const p of paths) {
				const node = walkPath(rootNode, p, this.treePathSeparator);
				// A non-collapsible node stays open (as with the toggle and collapseAll).
				if (node && node.isExpanded && this.getNodeIsCollapsible(node)) {
					node.isExpanded = false;
					// Bump _rev for the same reason as expandNodes — without it the
					// keyed {#each} reuses the row and the toggle's `--expanded` modifier stays stale.
					bumpRev(node);
					hasChanges = true;
				}
			}

			if (hasChanges) {
				this.refresh();
			}

			return this;
		},

		// Private helper methods
		getNodeByPath: function (
			path: string,
			_root?: LTreeNode<T> | null | undefined
		): LTreeNode<T> | null {
			return walkPath(_root || (this.isFiltered ? filteredRoot : root), path, this.treePathSeparator);
		},

		getNodeDisplayValue(node: LTreeNode<T>): string {
			// Resolution order: member → callback → fallback. A configured member absent on this
			// node (undefined / null) falls through, so labels.noDisplayValue shows (as in web-treeview).
			if (!shouldCalculateDisplayValue && node.data) {
				const value = getField(node.data, config.displayValueMember!);
				if (value != null) return value as string;
			}

			if (this.getDisplayValueCallback) return this.getDisplayValueCallback({ node });

			return this.displayValueFallback ?? '[N/A]';
		},

		getNodeSearchValue(node: LTreeNode<T>): string {
			// The indexer uses the same resolver (member → callback); '[N/A]' only here.
			return resolveSearchValue(node) ?? '[N/A]';
		},

		getNodeAllowedDropPositions(
			node: LTreeNode<T>
		): import('./types.js').DropPosition[] | null | undefined {
			// Priority: callback > member > node property
			if (this.getAllowedDropPositionsCallback) {
				return this.getAllowedDropPositionsCallback({ node });
			}

			if (!shouldCalculateAllowedDropPositions && node.data) {
				return getField(node.data, config.allowedDropPositionsMember!);
			}

			return node.allowedDropPositions;
		},

		isDropPositionAllowed(node: LTreeNode<T>, position: DropPosition): boolean {
			const allowed = this.getNodeAllowedDropPositions(node);
			return !allowed || allowed.length === 0 || allowed.includes(position);
		},

		getNodeIsDraggable(node: LTreeNode<T>): boolean {
			if (this.getIsDraggableCallback) return this.getIsDraggableCallback({ node });
			if (!shouldCalculateIsDraggable && node.data) return getField(node.data, config.isDraggableMember!);
			return node.isDraggable;
		},

		getNodeIsDropAllowed(node: LTreeNode<T>): boolean {
			if (this.getIsDropAllowedCallback) return this.getIsDropAllowedCallback({ node });
			if (!shouldCalculateIsDropAllowed && node.data)
				return getField(node.data, config.isDropAllowedMember!);
			return node.isDropAllowed;
		},

		getNodeIsCollapsible(node: LTreeNode<T>): boolean {
			if (this.getIsCollapsibleCallback) return this.getIsCollapsibleCallback({ node });
			if (!shouldCalculateIsCollapsible && node.data)
				return getField(node.data, config.isCollapsibleMember!);
			return node.isCollapsible;
		},

		refresh(): void {
			changeTracker = Symbol();
		},

		/**
		 * Get direct children of a node at the given path
		 * @param parentPath - Path to parent node (empty string for root)
		 * @returns Array of child nodes
		 */
		getChildren(parentPath: string): LTreeNode<T>[] {
			// Read changeTracker to create a reactive dependency (custom renderers / layouts read this)
			const _tracker = changeTracker;
			const parent = this.getNodeByPath(parentPath);
			if (!parent || !_tracker) return [];
			return Object.values(parent.children);
		},

		/**
		 * Get siblings of a node (including the node itself)
		 * @param path - Path to the node
		 * @returns Array of sibling nodes (nodes with same parent)
		 */
		getSiblings(path: string): LTreeNode<T>[] {
			// Read changeTracker to create a reactive dependency (custom renderers / layouts read this)
			const _tracker = changeTracker;
			const node = this.getNodeByPath(path);
			if (!node || !_tracker) return [];

			// Get parent and return all its children
			const parentPath = node.parentPath || '';
			return this.getChildren(parentPath);
		},

		/**
		 * Re-sort siblings under a parent path by the tree's sibling rule (`_sortSiblings`).
		 * Explicit — runs even with `isSortingEnabled = false` (the automatic re-sorts skip it).
		 * This reorders the children object to reflect updated order values
		 * @param parentPath - Path to parent node (empty string for root)
		 */
		refreshSiblings(parentPath: string): void {
			const parent = parentPath ? this.getNodeByPath(parentPath, root) : root;
			if (!parent) return;

			// Get current children as array
			const children = Object.values(parent.children) as LTreeNode<T>[];
			if (children.length === 0) return;

			const sorted = this._sortSiblings(children);

			// Rebuild children object in sorted order
			const newChildren: Record<string, LTreeNode<T>> = {};
			sorted.forEach((child) => {
				const segment = segmentPrefix + child.pathSegment;
				newChildren[segment] = child;
			});
			parent.children = newChildren;

			this.refresh();
		},

		/**
		 * Refresh a single node and optionally its descendants
		 * Useful after modifying node data externally
		 * @param path - Path to the node to refresh
		 */
		refreshNode(path: string): void {
			// For now, just trigger a tree change
			// Future optimization: only re-render the specific subtree
			this.refresh();
		},

		/**
		 * Move a node to a new location in the tree
		 * @param sourcePath - Path of the node to move
		 * @param targetPath - Path of the target node
		 * @param position - Where to place relative to target: 'before', 'after', or 'child'
		 * @returns Object with success status and optional error message
		 */
		moveNode(
			sourcePath: string,
			targetPath: string,
			position: 'before' | 'after' | 'child'
		): { success: boolean; error?: string } {
			this._scheduleRefilter();
			// Find source node
			const sourceNode = this.getNodeByPath(sourcePath, root);
			if (!sourceNode) {
				return { success: false, error: `Source node not found: ${sourcePath}` };
			}

			// Find target node
			const targetNode = this.getNodeByPath(targetPath, root);
			if (!targetNode) {
				return { success: false, error: `Target node not found: ${targetPath}` };
			}

			// Prevent moving a node into itself or its descendants
			if (targetPath.startsWith(sourcePath + this.treePathSeparator) || targetPath === sourcePath) {
				return { success: false, error: 'Cannot move a node into itself or its descendants' };
			}

			// Get source's current parent
			const sourceParentPath = sourceNode.parentPath || '';
			const sourceParent = sourceParentPath ? this.getNodeByPath(sourceParentPath, root) : root;
			if (!sourceParent) {
				return { success: false, error: `Source parent not found: ${sourceParentPath}` };
			}

			// Remove source from current parent
			const sourceSegment = segmentPrefix + sourceNode.pathSegment;
			delete sourceParent.children[sourceSegment];

			// Update source parent's hasChildren
			if (Object.keys(sourceParent.children).length === 0) {
				sourceParent.hasChildren = false;
				if (config.hasChildrenMember && sourceParent.data) {
					(sourceParent.data as any)[config.hasChildrenMember] = false;
				}
			}

			// Calculate new parent and path
			let newParentPath: string;
			let newParent: LTreeNode<T>;

			if (position === 'child') {
				// Insert as child of target
				newParentPath = targetPath;
				newParent = targetNode;
			} else {
				// Insert as sibling (before or after)
				newParentPath = targetNode.parentPath || '';
				newParent = newParentPath ? this.getNodeByPath(newParentPath, root)! : root;
			}

			// Generate new path segment (use source's original segment if unique)
			let newSegment = sourceNode.pathSegment;

			// Check if a node with this segment already exists in the new parent (excluding source node itself)
			const existingChild = newParent.children[segmentPrefix + newSegment];
			if (existingChild && existingChild !== sourceNode) {
				// Segment collision - generate a unique segment
				// Try using the source's ID first, then fall back to timestamp
				const sourceId = sourceNode.id?.toString();
				if (sourceId && !newParent.children[segmentPrefix + sourceId]) {
					newSegment = sourceId;
				} else {
					// Generate a unique segment with a timestamp — checked again, so two moves in the
					// same millisecond (a batch) don't land on the same key and overwrite each other.
					const base = `${newSegment}_${Date.now()}`;
					let candidate = base;
					for (let n = 2; newParent.children[segmentPrefix + candidate]; n++) candidate = `${base}_${n}`;
					newSegment = candidate;
				}
			}

			const newPath = newParentPath
				? `${newParentPath}${this.treePathSeparator}${newSegment}`
				: newSegment;
			const oldPath = sourceNode.path;

			// Update source node's path and parentPath
			sourceNode.path = newPath;
			sourceNode.pathSegment = newSegment;
			// Keep '' for root nodes (matching insertArray's getParentPath convention)
			sourceNode.parentPath = newParentPath;
			sourceNode.level = getLevel(newPath, this.treePathSeparator);

			// Sync data object fields to match new tree position
			if (sourceNode.data) {
				if (config.pathMember) (sourceNode.data as any)[config.pathMember] = newPath;
				if (config.parentPathMember) (sourceNode.data as any)[config.parentPathMember] = newParentPath;
				if (config.levelMember) (sourceNode.data as any)[config.levelMember] = sourceNode.level;
			}

			// Update all descendants' paths recursively
			this._updateDescendantPaths(sourceNode, oldPath, newPath);

			// Insert into new parent
			newParent.children[segmentPrefix + newSegment] = sourceNode;
			newParent.hasChildren = true;
			if (config.hasChildrenMember && newParent.data) {
				(newParent.data as any)[config.hasChildrenMember] = true;
			}

			// Sorting disabled: keep the exact position (order values still computed for persistence).
			if (!this.isSortingEnabled && position !== 'child') {
				this._placeNextTo([sourceNode], targetNode, position);
				this.refresh();
				return { success: true };
			}

			// orderMember + before/after: an order value between the target and its neighbour
			if (this.orderMember && position !== 'child' && sourceNode.data)
				this._assignOrderValues([sourceNode], targetNode, newParent, position);

			// Re-sort siblings if needed (sorting disabled: a 'child' move appends at the end)
			if (this.isSortingEnabled) this.refreshSiblings(newParentPath);
			else this.refresh();

			return { success: true };
		},

		/**
		 * Helper to recursively update descendant paths after a move
		 */
		_updateDescendantPaths(node: LTreeNode<T>, oldBasePath: string, newBasePath: string): void {
			for (const child of Object.values(node.children) as LTreeNode<T>[]) {
				// Save the old path BEFORE updating, for correct recursive calculation
				const oldChildPath = child.path;

				// Calculate new path by replacing the old base with new base
				const relativePath = oldChildPath.substring(oldBasePath.length);
				const newChildPath = newBasePath + relativePath;

				child.path = newChildPath;
				child.parentPath = node.path;
				child.level = getLevel(newChildPath, this.treePathSeparator);

				// Sync data object fields
				if (child.data) {
					if (config.pathMember) (child.data as any)[config.pathMember] = newChildPath;
					if (config.parentPathMember) (child.data as any)[config.parentPathMember] = node.path;
					if (config.levelMember) (child.data as any)[config.levelMember] = child.level;
				}

				// Recurse into children using the OLD child path as base
				this._updateDescendantPaths(child, oldChildPath, newChildPath);
			}
		},

		/**
		 * Remove a node and its whole subtree from the tree
		 * @param path - Path of the node to remove
		 * @returns Object with success status and the removed node
		 */
		removeNode(path: string): { success: boolean; node?: LTreeNode<T>; error?: string } {
			this._scheduleRefilter();
			const node = this.getNodeByPath(path, root);
			if (!node) {
				return { success: false, error: `Node not found: ${path}` };
			}

			// Get parent
			const parentPath = node.parentPath || '';
			const parent = parentPath ? this.getNodeByPath(parentPath, root) : root;
			if (!parent) {
				return { success: false, error: `Parent not found: ${parentPath}` };
			}

			// The whole subtree leaves (search index + count too — the node keeps its children)
			detachNode(node, parent);

			this.refresh();
			return { success: true, node };
		},

		/**
		 * Add a new node to the tree
		 * @param parentPath - Path of the parent (empty string for root)
		 * @param data - The data object for the new node
		 * @param pathSegment - Optional path segment (auto-generated if not provided)
		 * @returns Object with success status and the created node
		 */
		addNode(
			parentPath: string,
			data: T,
			pathSegment?: string
		): { success: boolean; node?: LTreeNode<T>; error?: string } {
			this._scheduleRefilter();
			const parent = parentPath ? this.getNodeByPath(parentPath, root) : root;
			if (!parent && parentPath) {
				return { success: false, error: `Parent not found: ${parentPath}` };
			}

			// Generate path segment if not provided
			if (!pathSegment) {
				// Use ID from data if available, otherwise generate a unique one
				const id = config.idMember && data ? (data as any)[config.idMember] : undefined;
				pathSegment =
					id?.toString() || `new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
			}

			// At this point pathSegment is guaranteed to be a string
			const segment: string = pathSegment!;

			// Calculate full path
			const newPath: string = parentPath
				? `${parentPath}${this.treePathSeparator}${segment}`
				: segment;

			// Check if path already exists
			if (this.getNodeByPath(newPath, root)) {
				return { success: false, error: `Node already exists at path: ${newPath}` };
			}

			// Create the node
			const newNode = createLTreeNode<T>();
			newNode.treeId = _treeId || '';
			newNode.id = config.idMember && data ? (data as any)[config.idMember] : undefined;
			newNode.path = newPath;
			newNode.pathSegment = segment;
			// Keep '' for root nodes (matching insertArray's getParentPath convention)
			newNode.parentPath = parentPath;
			newNode.level = getLevel(newPath, this.treePathSeparator);
			newNode.data = data;
			newNode.hasChildren = false;

			// Seed the resolved per-node flags exactly as insertArray does (rowToNode). Nodes added
			// here (addNode, and therefore duplicateNode and processChanges 'add') otherwise keep
			// createLTreeNode's defaults — notably isDraggable=false and isDropAllowed=false —
			// which the DOM `draggable` attribute and the drag-over / drop gates read directly.
			if (data) seedNodeFlags(newNode, data);
			else newNode.isExpanded = !!config.expandLevel && newNode.level! <= config.expandLevel;

			// Sync data object fields to match new tree position
			if (data) {
				if (config.pathMember) (data as any)[config.pathMember] = newPath;
				if (config.parentPathMember) (data as any)[config.parentPathMember] = parentPath;
				if (config.levelMember) (data as any)[config.levelMember] = newNode.level;
				if (config.hasChildrenMember) (data as any)[config.hasChildrenMember] = false;
			}

			// Add to parent
			const targetParent = parent || root;
			targetParent.children[segmentPrefix + pathSegment] = newNode;
			targetParent.hasChildren = true;
			// Sync data object's hasChildren field
			if (config.hasChildrenMember && targetParent.data) {
				(targetParent.data as any)[config.hasChildrenMember] = true;
			}

			// Update statistics
			nodeCount++;
			maxLevel = Math.max(maxLevel, newNode.level || 0);

			// Add to flat tree for search indexing (slot number = index id)
			flatTreeNodes.push(newNode);
			if (indexer && config.isInternalSearchIndexEnabled) {
				indexer.addItem({ node: newNode, index: flatTreeNodes.length - 1 });
			}

			// Re-sort siblings to place new node in correct position (sorting disabled: appended)
			if (this.isSortingEnabled) this.refreshSiblings(parentPath);

			this.refresh();
			return { success: true, node: newNode };
		},

		/**
		 * Update an existing node's data
		 * @param path - Path of the node to update
		 * @param dataUpdates - Partial data to merge into existing node data
		 * @returns Object with success status and the updated node
		 */
		updateNode(
			path: string,
			dataUpdates: Partial<T>
		): { success: boolean; node?: LTreeNode<T>; error?: string } {
			this._scheduleRefilter();
			const node = this.getNodeByPath(path, root);
			if (!node) {
				return { success: false, error: `Node not found: ${path}` };
			}
			if (!node.data) {
				return { success: false, error: `Node has no data: ${path}` };
			}

			// Check if orderMember is being updated (will need re-sort)
			const orderMemberUpdated = this.orderMember && this.orderMember in dataUpdates;

			// Merge updates into existing data
			node.data = { ...node.data, ...dataUpdates };
			bumpRev(node);

			// Re-index for search if needed
			if (indexer && config.isInternalSearchIndexEnabled) {
				const flatIndex = flatTreeNodes.indexOf(node);
				if (flatIndex !== -1) {
					indexer.addItem({ node, index: flatIndex });
				}
			}

			// Re-sort siblings if order was updated
			if (orderMemberUpdated && this.isSortingEnabled) {
				this.refreshSiblings(node.parentPath || '');
			}

			this.refresh();
			return { success: true, node };
		},

		/**
		 * Apply multiple changes to the tree in a single batch
		 * @param changes - Array of create/update/delete operations
		 * @returns Object with count of successful operations and array of failures
		 */
		processChanges(
			changes: import('./types.js').TreeChange<T>[]
		): import('./types.js').ProcessChangesResult {
			const failures: Array<{ changeIndex: number; operation: string; path: string; error: string }> = [];
			let successCount = 0;

			for (let i = 0; i < changes.length; i++) {
				const change = changes[i];
				let result: { success: boolean; error?: string };

				switch (change.operation) {
					case 'add':
						result = this.addNode(change.parentPath, change.data, change.pathSegment);
						if (result.success) {
							successCount++;
						} else {
							failures.push({
								changeIndex: i,
								operation: change.operation,
								path: change.parentPath,
								error: result.error || 'Unknown error'
							});
						}
						break;
					case 'update':
						result = this.updateNode(change.path, change.data);
						if (result.success) {
							successCount++;
						} else {
							failures.push({
								changeIndex: i,
								operation: change.operation,
								path: change.path,
								error: result.error || 'Unknown error'
							});
						}
						break;
					case 'insert':
						result = this.insertNode(change.targetPath, change.data, change.position);
						if (result.success) {
							successCount++;
						} else {
							failures.push({
								changeIndex: i,
								operation: change.operation,
								path: change.targetPath,
								error: result.error || 'Unknown error'
							});
						}
						break;
					case 'remove':
						result = this.removeNode(change.path);
						if (result.success) {
							successCount++;
						} else {
							failures.push({
								changeIndex: i,
								operation: change.operation,
								path: change.path,
								error: result.error || 'Unknown error'
							});
						}
						break;
				}
			}

			// Single emission after all changes
			if (successCount > 0) {
				this.refresh();
			}

			return { successful: successCount, failed: failures };
		},

		/**
		 * Copy a node and all its descendants to a new location
		 * Useful for cross-tree drag-drop operations
		 * @param sourceNode - The node to copy (including its children)
		 * @param targetParentPath - Path where to insert the copy (empty string for root)
		 * @param transformData - Function to transform each node's data (e.g., assign new IDs)
		 * @param siblingPath - Optional path of sibling to position relative to
		 * @param position - Optional position relative to sibling ('before' or 'after')
		 * @returns Object with success status, the created root node, and count of nodes created
		 */
		duplicateNode(
			sourceNode: LTreeNode<T>,
			targetParentPath: string,
			transformData: (ctx: { data: T; node: LTreeNode<T>; targetParentPath: string }) => T | null,
			siblingPath?: string,
			position?: 'before' | 'after'
		): { success: boolean; rootNode?: LTreeNode<T>; count: number; error?: string } {
			if (!sourceNode.data) {
				return { success: false, count: 0, error: 'Source node has no data' };
			}

			let totalCount = 0;

			// Recursive helper function
			const copyRecursive = (node: LTreeNode<T>, parentPath: string): LTreeNode<T> | null => {
				if (!node.data) return null;

				// Transform the data (user assigns new IDs, etc.). The live SOURCE node is passed
				// as the 2nd arg so batch callers (copyNodes) can gate on a manifest and build a
				// per-node NodeTransformContext. A null/undefined return SKIPS this node AND its
				// whole subtree (mirrors the input transform) — the way to "leave a descendant
				// behind" when copying a subtree from a pruned manifest. `targetParentPath` = where
				// this node lands.
				const transformedData = transformData({ data: node.data, node, targetParentPath: parentPath });
				if (transformedData === null || transformedData === undefined) return null;

				// Add the node
				const result = this.addNode(parentPath, transformedData);
				if (!result.success || !result.node) {
					dataLogger.warn(
						`[Tree ${_treeId}] duplicateNode: Failed to add node`,
						result.error
					);
					return null;
				}

				totalCount++;
				const newNode = result.node;

				// Recursively copy children
				if (node.children && Object.keys(node.children).length > 0) {
					for (const child of Object.values(node.children)) {
						copyRecursive(child, newNode.path);
					}
				}

				return newNode;
			};

			// Start the recursive copy
			const rootNode = copyRecursive(sourceNode, targetParentPath);

			if (!rootNode) {
				return { success: false, count: 0, error: 'Failed to copy root node' };
			}

			// Handle positioning relative to sibling if specified
			if (siblingPath && position && rootNode.data) {
				const siblingNode = this.getNodeByPath(siblingPath, root);
				// orderMember: order value between the neighbours; sorting disabled: exact position.
				if (
					siblingNode &&
					(siblingNode.parentPath || '') === targetParentPath &&
					(this.orderMember || !this.isSortingEnabled)
				) {
					this._placeNextTo([rootNode], siblingNode, position);
					this.refresh();
				}
			}

			return { success: true, rootNode, count: totalCount };
		},

		/**
		 * Get paths of all expanded nodes
		 * Useful for saving expanded state before a full redraw
		 * @returns Array of paths that are currently expanded
		 */
		getExpandedPaths(): string[] {
			const paths: string[] = [];
			const traverse = (node: LTreeNode<T>) => {
				if (node.isExpanded && node.path) {
					paths.push(node.path);
				}
				for (const child of Object.values(node.children)) {
					traverse(child);
				}
			};
			traverse(root);
			return paths;
		},

		/**
		 * Set expanded state for given paths
		 * Useful for restoring expanded state after a full redraw
		 * @param paths - Array of paths to expand (all others will be collapsed)
		 */
		setExpandedPaths(paths: string[]): void {
			const pathSet = new Set(paths);
			const traverse = (node: LTreeNode<T>) => {
				// Bump _rev on change: rows are keyed on it, so a visible row would otherwise keep
				// its old expanded arrow (the toggle's `--expanded` modifier) after an `expandedPaths` assignment.
				if (node.path && node.isExpanded !== pathSet.has(node.path)) {
					node.isExpanded = pathSet.has(node.path);
					bumpRev(node);
				}
				for (const child of Object.values(node.children)) {
					traverse(child);
				}
			};
			traverse(root);
			this.refresh();
		},

		/**
		 * @internal Collect every node's data as a flat array — backs the controller's `nodes`.
		 * @returns Array of all node data objects
		 */
		_collectData(): T[] {
			const result: T[] = [];
			const traverse = (node: LTreeNode<T>) => {
				if (node.data) {
					result.push(node.data);
				}
				for (const child of Object.values(node.children)) {
					traverse(child);
				}
			};
			traverse(root);
			return result;
		},

		// ── Bulk subtree operations (single emission) ─────────────────────────

		/**
		 * Insert one node before / after `targetPath`, or as its child. With `orderMember` the new
		 * node gets an order value between its neighbours (like `moveNode`); without it the node is
		 * placed directly next to the target.
		 */
		insertNode(
			targetPath: string,
			data: T,
			position: InsertPosition
		): { success: boolean; node?: LTreeNode<T>; error?: string } {
			this._scheduleRefilter();
			const target = this.getNodeByPath(targetPath, root);
			if (!target) return { success: false, error: `Target node not found: ${targetPath}` };
			if (position === 'child') return this.addNode(targetPath, data);
			const result = this.addNode(target.parentPath || '', data);
			if (result.success && result.node) {
				this._placeNextTo([result.node], target, position);
				this.refresh();
			}
			return result;
		},

		/**
		 * Insert a branch (flat rows with ltree paths, like `addBranch`) before / after
		 * `targetPath`, or under it (`'child'` = `addBranch(targetPath, data)`). The block's
		 * top-level rows keep their order; with `orderMember` they get order values spread
		 * between the target and its neighbour.
		 */
		insertBranch(targetPath: string, data: T[], position: InsertPosition): InsertBranchResult<T> {
			this._scheduleRefilter();
			const target = this.getNodeByPath(targetPath, root);
			if (!target) return { success: false, count: 0, failed: [], parentNode: null, error: 'Target not found: ' + targetPath };
			if (position === 'child') return this.addBranch(targetPath, data);
			const parentPath = target.parentPath || '';
			const result = this.addBranch(parentPath, data);
			const blockRoots: LTreeNode<T>[] = [];
			for (const row of data) {
				const p = config.pathMember ? getField(row, config.pathMember) : undefined;
				const node = typeof p === 'string' ? this.getNodeByPath(p, root) : null;
				if (node && node.data === row && (node.parentPath || '') === parentPath) blockRoots.push(node);
			}
			if (blockRoots.length > 0) {
				this._placeNextTo(blockRoots, target, position);
				this.refresh();
			}
			return result;
		},

		/**
		 * Give `nodes` (in order) `orderMember` values between `target` and its neighbour on the
		 * `position` side among `parent`'s children — whole numbers while the gap allows, else
		 * fractions (no two siblings end up with the same value). moveNode + _placeNextTo.
		 */
		_assignOrderValues(
			nodes: LTreeNode<T>[],
			target: LTreeNode<T>,
			parent: LTreeNode<T>,
			position: 'before' | 'after'
		): void {
			const om = this.orderMember;
			if (!om) return;
			const block = new Set(nodes);
			const targetOrder = (target.data ? (getField(target.data, om) as number) : 0) ?? 0;
			const others = (Object.values(parent.children) as LTreeNode<T>[])
				.filter((s) => !block.has(s) && s !== target && s.data && getField(s.data, om) !== undefined)
				.map((s) => getField(s.data!, om) as number);
			const n = nodes.length;
			let lo: number;
			let hi: number;
			if (position === 'before') {
				hi = targetOrder;
				const prev = others.filter((o) => o < targetOrder).sort((a, b) => b - a)[0];
				lo = prev ?? targetOrder - 20 * n;
			} else {
				lo = targetOrder;
				const next = others.filter((o) => o > targetOrder).sort((a, b) => a - b)[0];
				hi = next ?? targetOrder + 20 * n;
			}
			const isWholeStep = Number.isInteger(lo) && Number.isInteger(hi) && hi - lo > n;
			nodes.forEach((node, i) => {
				const v = lo + ((hi - lo) * (i + 1)) / (n + 1);
				(node.data as any)[om] = isWholeStep ? Math.floor(v) : v;
			});
		},

		/** Position `nodes` (already children of the target's parent) right before / after `target`. */
		_placeNextTo(nodes: LTreeNode<T>[], target: LTreeNode<T>, position: 'before' | 'after'): void {
			const parentPath = target.parentPath || '';
			const parent = parentPath ? this.getNodeByPath(parentPath, root) : root;
			if (!parent || nodes.length === 0) return;
			const block = new Set(nodes);
			if (this.orderMember && nodes.every((n) => n.data)) {
				this._assignOrderValues(nodes, target, parent, position);
				if (this.isSortingEnabled) {
					this.refreshSiblings(parentPath);
					return;
				}
			}
			// No orderMember / sorting disabled: place directly next to the target.
			const reordered: Record<string, LTreeNode<T>> = {};
			const putBlock = () => {
				for (const b of nodes) reordered[segmentPrefix + b.pathSegment] = b;
			};
			for (const child of Object.values(parent.children) as LTreeNode<T>[]) {
				if (block.has(child)) continue;
				if (child === target && position === 'before') putBlock();
				reordered[segmentPrefix + child.pathSegment] = child;
				if (child === target && position === 'after') putBlock();
			}
			parent.children = reordered;
			bumpRev(parent);
		},

		addBranch(parentPath: string, data: T[]): InsertBranchResult<T> {
			this._scheduleRefilter();
			const targetParent = parentPath ? this.getNodeByPath(parentPath, root) : root;
			if (!targetParent && parentPath) {
				return { success: false, count: 0, failed: [], parentNode: null, error: 'Parent not found: ' + parentPath };
			}
			const parentNode = targetParent || root;

			if (data.length === 0) {
				return { success: true, count: 0, failed: [], parentNode };
			}

			const failed: Array<{ data: T; error: string }> = [];

			// Convert raw data → LTreeNode (the same rowToNode as insertArray)
			let mappedData: LTreeNode<T>[] = [];
			data.forEach((row, index) => {
				const { node, error } = rowToNode(row, index, this.treePathSeparator);
				if (error) failed.push({ data: row, error });
				else mappedData.push(node);
			});

			// Sort to ensure parents come before children
			mappedData = this._sortForInsert(mappedData);

			// Insert all nodes silently (no emission per node)
			const affectedParents = new Set<string>();
			let insertedCount = 0;

			for (const node of mappedData) {
				const result = this.insertTreeNode(node.parentPath ?? '', node, true);
				if (result) {
					failed.push({ data: node.data!, error: result });
				} else {
					insertedCount++;
					affectedParents.add(node.parentPath ?? '');

					// Add to flat tree for search indexing
					if (config.isInternalSearchIndexEnabled) {
						flatTreeNodes.push(node);
					}
				}
			}

			// Re-sort each affected parent's children (without emitting; sorting disabled: appended)
			for (const pp of this.isSortingEnabled ? affectedParents : []) {
				const parent = pp ? this.getNodeByPath(pp, root) : root;
				if (!parent) continue;
				const children = Object.values(parent.children) as LTreeNode<T>[];
				if (children.length === 0) continue;

				const sorted = this._sortSiblings(children);
				const newChildren: Record<string, LTreeNode<T>> = {};
				sorted.forEach((child) => {
					newChildren[segmentPrefix + child.pathSegment] = child;
				});
				parent.children = newChildren;
			}

			// ── Pipeline: directly update all affected parents ──────────
			// Update hasChildren + config.hasChildrenMember on EVERY parent that received children
			for (const pp of affectedParents) {
				const parent = pp ? this.getNodeByPath(pp, root) : root;
				if (parent) reconcileHasChildren(parent);
			}

			// Bump _rev on all affected parents AND their ancestors up to root
			const bumpedPaths = new Set<string>();
			for (const pp of affectedParents) {
				if (!pp) continue;
				for (const p of [pp, ...getAncestorPaths(pp, this.treePathSeparator)]) {
					if (bumpedPaths.has(p)) break;
					bumpedPaths.add(p);
					const ancestor = this.getNodeByPath(p, root);
					if (ancestor) bumpRev(ancestor);
				}
			}

			// Batch add to indexer
			if (config.isInternalSearchIndexEnabled && indexer) {
				const startIdx = flatTreeNodes.length - insertedCount;
				const itemsToIndex: { node: LTreeNode<T>; index: number }[] = [];
				for (let i = startIdx; i < flatTreeNodes.length; i++) {
					const n = flatTreeNodes[i];
					if (n) itemsToIndex.push({ node: n, index: i });
				}
				if (itemsToIndex.length > 0) {
					indexer.addToQueue(itemsToIndex);
				}
			}

			// Single emission
			this.refresh();

			return { success: true, count: insertedCount, failed, parentNode };
		},

		replaceBranch(parentPath: string, data: T[]): ReplaceBranchResult<T> {
			this._scheduleRefilter();
			const targetParent = parentPath ? this.getNodeByPath(parentPath, root) : root;
			if (!targetParent && parentPath) {
				return { success: false, count: 0, failed: [], parentNode: null, removed: 0, added: 0, error: 'Parent not found: ' + parentPath };
			}
			const parentNode = targetParent || root;

			const removedCount = clearChildren(parentNode);

			// Delegate to addBranch for the new data
			const result = this.addBranch(parentPath, data);
			return { ...result, removed: removedCount, added: result.count };
		},

		removeBranch(path: string, options?: RemoveBranchOptions): RemoveBranchResult<T> {
			// The pre-rc18 boolean `keepParent` still works — a JS caller passing `true` must not lose the node too.
			if (typeof options === 'boolean') {
				dataLogger.warn('removeBranch(path, boolean) is deprecated — use removeBranch(path, { shouldKeepParent })');
				options = { shouldKeepParent: options };
			}
			const shouldKeepParent = !!options?.shouldKeepParent;
			this._scheduleRefilter();
			if (shouldKeepParent) {
				// Keep the node, clear its children
				const node = path ? this.getNodeByPath(path, root) : root;
				if (!node) return { success: false, count: 0, error: `Node not found: ${path}` };
				if (Object.keys(node.children).length === 0) return { success: true, count: 0 };
				const removedCount = clearChildren(node);
				// Bump _rev on node itself + ancestors
				bumpRev(node);
				bumpAncestors(path, this.treePathSeparator);
				this.refresh();
				return { success: true, count: removedCount };
			}

			// Remove the node itself + all descendants
			if (path === '') return { success: false, count: 0, error: 'Cannot delete root node' };
			const node = this.getNodeByPath(path, root);
			if (!node) return { success: false, count: 0, error: `Node not found: ${path}` };
			const parentPath = node.parentPath || '';
			const parent = parentPath ? this.getNodeByPath(parentPath, root) : root;
			if (!parent) return { success: false, count: 0, error: `Parent not found: ${parentPath}` };
			const removedCount = detachNode(node, parent);
			// Bump _rev on ancestors
			bumpAncestors(node.path, this.treePathSeparator);
			this.refresh();
			return { success: true, count: removedCount };
		},

		/** Order freshly converted rows for insertion (parents before children): as given when the
		 *  input is pre-sorted (`isSorted`), by level only when sorting is disabled, else the sibling rule. */
		_sortForInsert(nodes: LTreeNode<T>[]): LTreeNode<T>[] {
			if (this.isSorted) return nodes;
			if (!this.isSortingEnabled) return this._sortByLevel(nodes);
			// The callback orders siblings; it gets the whole flat dataset here, so a sibling-only
			// comparator (by name) could put a child before its parent — which then fails to insert
			// as an orphan. A stable level pass after it keeps its sibling order, parents first.
			if (this.sortCallback) return this._sortByLevel(this.sortCallback({ nodes }));
			return this._defaultSort(this, nodes);
		},

		/** Stable sort by level only (parents before children, input order kept among siblings). */
		_sortByLevel(items: LTreeNode<T>[]): LTreeNode<T>[] {
			return items.sort((a, b) => (a.level || 0) - (b.level || 0));
		},

		/**
		 * The sibling rule: `compareCallback` (when given) → `sortCallback` → `orderMember`
		 * (display value breaks ties) → `Intl.Collator(numeric)` by display value. `direction: 'desc'`
		 * reverses whichever rule applied. Returns a new array.
		 */
		_sortSiblings(
			children: LTreeNode<T>[],
			options?: Pick<SortOptions<T>, 'compareCallback' | 'direction'>
		): LTreeNode<T>[] {
			const byDisplay = (a: LTreeNode<T>, b: LTreeNode<T>) =>
				displayCollator.compare(this.getNodeDisplayValue(a), this.getNodeDisplayValue(b));
			const om = this.orderMember;
			let sorted: LTreeNode<T>[];
			if (options?.compareCallback) {
				const cb = options.compareCallback;
				sorted = [...children].sort((a, b) => cb({ a, b }));
			} else if (this.sortCallback) {
				sorted = [...this.sortCallback({ nodes: [...children] })];
			} else if (om) {
				sorted = [...children].sort((a, b) => {
					if (a.data && b.data) {
						const aOrder = getField(a.data, om) ?? 0;
						const bOrder = getField(b.data, om) ?? 0;
						if (aOrder !== bOrder) return aOrder - bOrder;
					}
					return byDisplay(a, b);
				});
			} else {
				sorted = [...children].sort(byDisplay);
			}
			if (options?.direction === 'desc') sorted.reverse();
			return sorted;
		},

		/** Sort one parent's children; collects the orderMember rewrite (if any) into `out`. */
		_sortChildrenOf(
			parent: LTreeNode<T>,
			options: SortOptions<T> | undefined,
			out: NodesSortContext<T>[]
		): void {
			const children = Object.values(parent.children) as LTreeNode<T>[];
			if (children.length === 0) return;
			const sorted = this._sortSiblings(children, options);
			const newChildren: Record<string, LTreeNode<T>> = {};
			for (const child of sorted) newChildren[segmentPrefix + child.pathSegment] = child;
			parent.children = newChildren;
			// A custom compare / reversed order no longer matches the orderMember values —
			// rewrite them (10, 20, 30…) so the new order persists.
			const om = this.orderMember;
			if (!om || (!options?.compareCallback && options?.direction !== 'desc')) return;
			const changes: NodesSortContext<T>['changes'] = [];
			sorted.forEach((node, i) => {
				if (!node.data) return;
				const oldOrder = getField(node.data, om) as number | undefined;
				const newOrder = (i + 1) * 10;
				if (oldOrder === newOrder) return;
				(node.data as any)[om] = newOrder;
				changes.push({ path: node.path, oldOrder, newOrder });
			});
			if (changes.length > 0) out.push({ parentPath: parent.path || '', nodes: sorted, changes });
		},

		sortNodes(paths: string | string[], options?: SortOptions<T>): NodesSortContext<T>[] {
			this._scheduleRefilter();
			const out: NodesSortContext<T>[] = [];
			for (const p of Array.isArray(paths) ? paths : [paths]) {
				const node = isEmptyString(p) ? root : this.getNodeByPath(p, root);
				if (node) this._sortChildrenOf(node, options, out);
			}
			this.refresh();
			return out;
		},

		sortAll(paths?: string | string[] | null, options?: SortOptions<T>): NodesSortContext<T>[] {
			this._scheduleRefilter();
			const out: NodesSortContext<T>[] = [];
			const list =
				paths == null
					? []
					: (Array.isArray(paths) ? paths : [paths]).filter((p) => !isEmptyString(p));
			const targets = list.length === 0 ? [root] : list.map((p) => this.getNodeByPath(p, root));
			const walk = (node: LTreeNode<T>) => {
				this._sortChildrenOf(node, options, out);
				for (const child of Object.values(node.children) as LTreeNode<T>[]) walk(child);
			};
			for (const t of targets) if (t) walk(t);
			this.refresh();
			return out;
		},

		_defaultSort: function (self: Ltree<T>, items: LTreeNode<T>[]): LTreeNode<T>[] {
			return items.sort((a, b) => {
				// First, sort by level (shallower levels first)
				const aLevel = a.level || 0;
				const bLevel = b.level || 0;
				if (aLevel !== bLevel) {
					return aLevel - bLevel;
				}

				// Then sort by parent path
				if (a.parentPath !== b.parentPath) {
					if (!a.parentPath) return -1;
					if (!b.parentPath) return 1;
					return a.parentPath.localeCompare(b.parentPath!);
				}

				// If orderMember is provided, use it for sibling ordering
				if (self.orderMember && a.data && b.data) {
					const aOrder = (a.data as any)[self.orderMember] ?? 0;
					const bOrder = (b.data as any)[self.orderMember] ?? 0;
					if (aOrder !== bOrder) {
						return aOrder - bOrder;
					}
				}

				// Finally sort by display value
				return displayCollator.compare(self.getNodeDisplayValue(a), self.getNodeDisplayValue(b));
			});
		},

		/**
		 * While a filter is active, rebuild the filtered view after an edit (once per microtask,
		 * so a batch rebuilds once). Edits resolve against the REAL tree (`getNodeByPath(p, root)`
		 * in every mutator) — they used to hit the filtered COPY, so a node deleted / moved while
		 * searching came back when the filter cleared. An added node shows once it is indexed
		 * (the indexer re-applies the filter on completion).
		 */
		_scheduleRefilter(): void {
			if (!this.isFiltered || _isRefilterScheduled) return;
			_isRefilterScheduled = true;
			queueMicrotask(() => {
				_isRefilterScheduled = false;
				if (this.isFiltered && !isEmptyString(_lastFilterSearchText)) {
					this.filterNodes(_lastFilterSearchText as string, _lastFilterSearchOptions);
				}
			});
		},


		...restOpts
	};
}
