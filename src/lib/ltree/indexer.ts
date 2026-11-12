import type { Index } from 'flexsearch';
import type { NodeContext } from './types.js';
import type { LTreeNode } from './ltree-node.svelte.js';
import { isNotEmptyString } from '../helpers/string-helpers.js';
import { indexLogger } from '../logger.js';

/** Default max items per idle slot. The per-slot TIME budget (below) is what keeps
 *  frames smooth; this cap only bounds a single slot, so it is generous — 25 left most
 *  of every idle slot unused (55k nodes took ~2 min vs ~6 s at 1000). */
export const DEFAULT_INDEXER_BATCH_SIZE = 1000;
/** Max ms of indexing per idle slot (one frame). */
const MAX_IDLE_BATCH_MS = 16;
/** Max ms per FORCED slot (requestIdleCallback timed out = page is busy) — kept short. */
const MAX_FORCED_BATCH_MS = 8;

export class Indexer<T> {
	private treeId: string;
	private processingQueue: { node: LTreeNode<T>; index: number }[] = [];
	// Read cursor into processingQueue — shift() on a large array is O(n) per call.
	private queueHead = 0;
	// Bumped by clearQueue() so an idle callback scheduled before the clear exits
	// instead of running a second processing loop alongside the new one.
	private generation = 0;
	private batchSize: number;
	private searchIndex: Index;
	private isProcessing: boolean = false;
	private shouldCalculateSearchValue: boolean;

	private searchValueMember?: string | null | undefined;
	private getSearchValueCallback?: (ctx: NodeContext<T>) => string;
	private onProgressCallback?: (processed: number, total: number) => void;
	private onCompleteCallback?: () => void;
	private totalItemsAdded: number = 0;
	private totalItemsProcessed: number = 0;

	constructor(
		treeId: string,
		searchIndex: Index,
		shouldCalculateSearchValue: boolean,
		searchValueMember?: string | null | undefined,
		getSearchValueCallback?: (ctx: NodeContext<T>) => string,
		batchSize: number = DEFAULT_INDEXER_BATCH_SIZE,
		private timeout: number = 50
	) {
		this.treeId = treeId;
		this.searchIndex = searchIndex;
		this.batchSize = batchSize;
		this.shouldCalculateSearchValue = shouldCalculateSearchValue;
		this.searchValueMember = searchValueMember;
		this.getSearchValueCallback = getSearchValueCallback;

		indexLogger.debug(`[${this.treeId}] Initialized with batch size: ${batchSize}`);
	}

	// Add items to the processing queue
	addToQueue(items: { node: LTreeNode<T>; index: number }[]): void {
		// Use concat instead of push(...items) to avoid stack overflow with large arrays.
		// Drop the already-consumed head first so the array doesn't grow unbounded.
		this.processingQueue = this.processingQueue.slice(this.queueHead).concat(items);
		this.queueHead = 0;
		this.totalItemsAdded += items.length;

		indexLogger.debug(`[${this.treeId}] Added ${items.length} items to queue. Queue size: ${this.pendingCount}`);

		// Start processing if not already running
		if (!this.isProcessing) {
			this.startProcessing();
		}
	}

	// Add a single item to queue
	addItem(item: { node: LTreeNode<T>; index: number }): void {
		this.processingQueue.push(item);
		this.totalItemsAdded++;

		if (!this.isProcessing) {
			this.startProcessing();
		}
	}

	// Set callbacks for progress tracking
	setCallbacks(
		onProgress?: (processed: number, total: number) => void,
		onComplete?: () => void
	): void {
		this.onProgressCallback = onProgress;
		this.onCompleteCallback = onComplete;
	}

	// Update batch size dynamically
	setBatchSize(newBatchSize: number): void {
		this.batchSize = newBatchSize;
		indexLogger.debug(`[${this.treeId}] Batch size updated to: ${this.batchSize}`);
	}

	private get pendingCount(): number {
		return this.processingQueue.length - this.queueHead;
	}

	// Start the processing loop
	private startProcessing(): void {
		if (this.isProcessing || this.pendingCount === 0) {
			return;
		}

		this.isProcessing = true;
		indexLogger.debug(`[${this.treeId}] Starting indexing. Queue size: ${this.pendingCount}`);

		this.processNextBatch();
	}

	// Process the next batch using requestIdleCallback
	private processNextBatch(): void {
		const generation = this.generation;
		requestIdleCallback((deadline) => this.processBatch(deadline, generation), { timeout: this.timeout });
	}

	// Process a batch of items from the queue. Bounded by TIME, not item count:
	// genuine idle time → up to MAX_IDLE_BATCH_MS (and the slot's remaining time);
	// a forced slot (timeout, page busy) → a short MAX_FORCED_BATCH_MS so indexing
	// still advances without hogging a busy main thread.
	private processBatch(deadline: IdleDeadline, generation: number): void {
		// Superseded by clearQueue() while this callback was pending.
		if (generation !== this.generation) return;

		const startTime = performance.now();
		let itemsProcessedInBatch = 0;
		const isTimeout = deadline.didTimeout;
		const maxBatchTime = isTimeout ? MAX_FORCED_BATCH_MS : MAX_IDLE_BATCH_MS;

		indexLogger.trace(`[${this.treeId}] Batch start: timeout=${isTimeout}, timeRemaining=${deadline.timeRemaining().toFixed(1)}ms, queueSize=${this.pendingCount}`);

		while (
			this.queueHead < this.processingQueue.length &&
			itemsProcessedInBatch < this.batchSize &&
			(isTimeout || deadline.timeRemaining() > 1)
		) {
			const elapsed = performance.now() - startTime;
			if (elapsed > maxBatchTime) {
				indexLogger.trace(`[${this.treeId}] Time limit hit after ${elapsed.toFixed(2)}ms, processed ${itemsProcessedInBatch} items`);
				break;
			}

			const item = this.processingQueue[this.queueHead++]!;
			this.indexItem(item);
			itemsProcessedInBatch++;
			this.totalItemsProcessed++;
		}

		const batchTime = performance.now() - startTime;
		indexLogger.trace(`[${this.treeId}] Batch end: ${itemsProcessedInBatch} items in ${batchTime.toFixed(2)}ms`);

		if (this.pendingCount > 0) {
			// Report progress, then schedule the next batch
			this.onProgressCallback?.(this.totalItemsProcessed, this.totalItemsAdded);
			this.processNextBatch();
		} else {
			// Queue drained — release it and finish (finishProcessing reports completion)
			this.processingQueue = [];
			this.queueHead = 0;
			this.finishProcessing();
		}
	}

	// Index a single item (customize this for your search index)
	private indexItem(item: { node: LTreeNode<T>; index: number }): void {
		// Type-safe indexing - customize based on your item structure
		const searchValue = !this.shouldCalculateSearchValue
			? this.searchValueMember && (item.node.data as any)?.[this.searchValueMember]?.toString()
			: this.getSearchValueCallback && this.getSearchValueCallback({ node: item.node });

		if (isNotEmptyString(searchValue)) {
			const addStart = performance.now();
			this.searchIndex!.add(item.index, searchValue);
			const addTime = performance.now() - addStart;
			if (addTime > 5) {
				indexLogger.warn(`[${this.treeId}] Slow FlexSearch.add(): ${addTime.toFixed(2)}ms for index ${item.index}`);
			}
		}
	}

	// Finish processing
	private finishProcessing(): void {
		this.isProcessing = false;
		indexLogger.info(`[${this.treeId}] Indexing complete. Processed ${this.totalItemsProcessed} items.`);

		if (this.onCompleteCallback) {
			this.onCompleteCallback();
		}
	}

	// Get current indexer status
	getStatus(): {
		queueSize: number;
		isProcessing: boolean;
		processed: number;
		total: number;
		batchSize: number;
	} {
		return {
			queueSize: this.pendingCount,
			isProcessing: this.isProcessing,
			processed: this.totalItemsProcessed,
			total: this.totalItemsAdded,
			batchSize: this.batchSize
		};
	}

	// Clear the queue and reset counters
	clearQueue(): void {
		this.processingQueue = [];
		this.queueHead = 0;
		this.generation++;
		this.isProcessing = false;
		this.totalItemsAdded = 0;
		this.totalItemsProcessed = 0;
		indexLogger.debug(`[${this.treeId}] Queue cleared`);
	}

	// Check if indexer is busy
	isBusy(): boolean {
		return this.isProcessing || this.pendingCount > 0;
	}

	// Wait for all current items to be processed
	async waitForCompletion(): Promise<void> {
		return new Promise<void>((resolve) => {
			if (!this.isBusy()) {
				resolve();
				return;
			}

			const originalCallback = this.onCompleteCallback;
			this.onCompleteCallback = () => {
				if (originalCallback) {
					originalCallback();
				}
				resolve();
			};
		});
	}
}
