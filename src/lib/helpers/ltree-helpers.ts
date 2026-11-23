import { isEmptyString } from './string-helpers.js';

export function getParentPath(path: string, pathSeparator: string = '.'): string | null {
	if (!path || typeof path !== 'string') return null;

	const lastDotIndex = path.lastIndexOf(pathSeparator);
	return lastDotIndex === -1 ? '' : path.substring(0, lastDotIndex);
}

export function getRelativePath(path: string, parentPath: string, pathSeparator: string = '.'): string {
	if (isEmptyString(parentPath)) return path;

	return path.startsWith(parentPath + pathSeparator) ? path.substring(parentPath.length + pathSeparator.length) : path;
}

export function getPathSegments(path: string, start: number = 0, count: number = 1, pathSeparator: string = '.'): string {
	const segments = path.split(pathSeparator);
	const taken = segments.slice(start, start + count);
	return taken.join(pathSeparator);
}

export function getLevel(path: string, pathSeparator: string): number {
	return path.split(pathSeparator).length;
}

/** Every proper ancestor of `path`, nearest first: "1.2.3" → ["1.2", "1"]. */
export function getAncestorPaths(path: string, pathSeparator: string = '.'): string[] {
	const result: string[] = [];
	for (let i = path.lastIndexOf(pathSeparator); i > 0; i = path.lastIndexOf(pathSeparator, i - 1))
		result.push(path.substring(0, i));
	return result;
}

/** `path` and its ancestors, root-most first: "1.2.3" → ["1", "1.2", "1.2.3"] (the spine down to it). */
export function getPathChain(path: string, pathSeparator: string = '.'): string[] {
	return [...getAncestorPaths(path, pathSeparator).reverse(), path];
}

/** Whether `path` is `ancestorPath` itself or lies under it ("1.10" is not under "1.1"). */
export function isSelfOrDescendant(path: string, ancestorPath: string, pathSeparator: string = '.'): boolean {
	return path === ancestorPath || path.startsWith(ancestorPath + pathSeparator);
}

/**
 * The top-level paths of a set: a path with an ancestor also in the set is dropped
 * (an operation on the ancestor covers it). Input order is kept.
 */
export function getTopLevelPaths(paths: Iterable<string>, pathSeparator: string = '.'): string[] {
	const list = [...paths];
	const set = new Set(list);
	return list.filter((p) => !getAncestorPaths(p, pathSeparator).some((a) => set.has(a)));
}

type TreeNodeLike = { path: string; _rev?: number; children: Record<string, TreeNodeLike> };

/** Bump a node's render revision — its keyed row re-renders. */
export function bumpRev(node: { _rev?: number }): void {
	node._rev = (node._rev || 0) + 1;
}

/**
 * Depth-first (pre-order) walk of the descendants of `node`, not `node` itself.
 * `visit` returning `false` skips that node's children.
 */
export function forEachDescendant<N extends TreeNodeLike>(node: N, visit: (descendant: N) => void | boolean): void {
	for (const key in node.children) {
		const child = node.children[key] as N;
		if (visit(child) !== false) forEachDescendant(child, visit);
	}
}

/** Paths of every descendant of `node`, depth-first. */
export function getDescendantPaths(node: TreeNodeLike): string[] {
	const result: string[] = [];
	forEachDescendant(node, (n) => {
		result.push(n.path);
	});
	return result;
}
