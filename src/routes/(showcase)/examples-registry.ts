// The showcase page registry — ONE list feeding the landing cards, the landing page's
// cross-page chapter nav, and the spotlight's site-wide chapter index (vite.config.ts →
// virtual:kmwc-chapters). Plain data, no $lib imports: vite.config.ts imports it in Node.
// Shape = the devkit's renderExamplesIndex() `pages` entry.

export interface ExamplePage {
	href: string;
	icon: string;
	title: string;
	description: string;
	badge?: string;
}

export const EXAMPLE_PAGES: ExamplePage[] = [
	{
		href: '/examples/basic',
		icon: '🌲',
		title: 'Basic Usage',
		description: 'The essentials — render a tree, control initial expansion, scroll to a node, and drive expand/collapse programmatically (array + exclusive-focus variants).'
	},
	{
		href: '/examples/interaction',
		icon: '🖱️',
		title: 'Interaction',
		description: 'Click behavior modes, multi-select with range selection, keyboard navigation, cascade checkboxes, and silent state restore.'
	},
	{
		href: '/examples/drag-drop',
		icon: '🎯',
		title: 'Drag & Drop',
		description: 'Desktop and mobile drag and drop with touch-friendly long-press activation.'
	},
	{
		href: '/examples/context-menu',
		icon: '📋',
		title: 'Context Menu',
		description: 'Right-click context menus with icons, disabled states, dividers, and dynamic items.'
	},
	{
		href: '/examples/icons',
		icon: '🎭',
		title: 'Icons',
		badge: 'new',
		description: 'Per-node icons on every node (branch + leaf) — FontAwesome classes via iconMember, per-node color, emoji via getIconCallback, and inline SVG via the icon snippet.'
	},
	{
		href: '/examples/tooltips',
		icon: '💬',
		title: 'Tooltips',
		badge: 'new',
		description: 'Hover/focus node tooltips — a plain-text getNodeTooltipCallback or a rich tooltip snippet, with placement / delay / follow-cursor / sizing knobs, themed via the shared --base-tooltip-* tokens.'
	},
	{
		href: '/examples/search',
		icon: '🔍',
		title: 'Search & Filter',
		description: 'Internal search index for fast searching with searchNodes() and filterNodes().'
	},
	{
		href: '/examples/theming',
		icon: '🎨',
		title: 'Theming',
		description: 'Customize appearance with CSS variables for selection, drag-over, and icons.'
	},
	{
		href: '/examples/theme-comparison',
		icon: '🎭',
		title: 'Theme Comparison',
		badge: 'new',
		description: 'web-multiselect and svelte-treeview side by side under one shared --base-* theme (Cobalt2) — visual proof the KeenMate token contract renders both consistently.'
	},
	{
		href: '/examples/responsive',
		icon: '📐',
		title: 'Responsive',
		description: "React to the tree's own container box (and the device) via a bindable containerSize + onContainerResize callback — adapt settings to the available space."
	},
	{
		href: '/examples/data',
		icon: '📊',
		title: 'Data Structures',
		description: 'Path-based data structure, custom separators, insert-result validation, and bulk branch operations (addBranch / removeBranch).'
	},
	{
		href: '/examples/tree-editor',
		icon: '✏️',
		title: 'Tree Editor',
		description: 'Interactive add/move/remove + clipboard editing, plus real-world DB-integration workflows (full redraw, partial redraw, CRUD, build-one-by-one, batch save).'
	},
	{
		href: '/examples/performance',
		icon: '⚡',
		title: 'Performance Test',
		description: 'Compare flat vs virtual-scroll rendering with configurable node counts.'
	},
	{
		href: '/examples/custom-layout',
		icon: '🧩',
		title: 'Custom Layout',
		description: 'Build custom UIs (breadcrumbs, badge clouds) on the headless TreeController via TreeProvider.'
	},
	{
		href: '/dev/logging',
		icon: '📝',
		title: 'Logging',
		badge: 'debug',
		description: 'Test logging infrastructure with categorized loggers and configurable log levels.'
	}
];

/** Route source file of an /examples/* page (the spotlight index scans it); null otherwise. */
export function getPageSource(page: ExamplePage): string | null {
	const match = page.href.match(/^\/examples\/([a-z0-9-]+)$/);
	return match ? `(showcase)/examples/${match[1]}/+page.svelte` : null;
}
