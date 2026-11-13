<script lang="ts">
	import Tree from '$lib/components/Tree.svelte';
	import type { LTreeNode, CheckboxMode, CascadeCheckPolicy, FilterScope, IndexProgress, SearchStatus } from '$lib/ltree/types.js';
	import { untrack } from 'svelte';
	import RenderModeSwitch from '../RenderModeSwitch.svelte';
	import { getTreeProps } from '../render-mode.svelte.js';

	type LocationItem = {
		id: number;
		path: string;
		name: string;
		population?: string;
	};

	// Countries with major cities
	const sampleData: LocationItem[] = [
		// USA
		{ id: 1, path: '1', name: 'United States', population: '331M' },
		{ id: 101, path: '1.1', name: 'New York', population: '8.3M' },
		{ id: 102, path: '1.2', name: 'Los Angeles', population: '3.9M' },
		{ id: 103, path: '1.3', name: 'Chicago', population: '2.7M' },
		{ id: 104, path: '1.4', name: 'Houston', population: '2.3M' },
		{ id: 105, path: '1.5', name: 'Phoenix', population: '1.6M' },
		{ id: 106, path: '1.6', name: 'Philadelphia', population: '1.6M' },
		{ id: 107, path: '1.7', name: 'San Antonio', population: '1.5M' },
		{ id: 108, path: '1.8', name: 'San Diego', population: '1.4M' },
		{ id: 109, path: '1.9', name: 'Dallas', population: '1.3M' },
		{ id: 110, path: '1.10', name: 'San Jose', population: '1.0M' },
		{ id: 111, path: '1.11', name: 'Austin', population: '978K' },
		{ id: 112, path: '1.12', name: 'Jacksonville', population: '911K' },
		{ id: 113, path: '1.13', name: 'Fort Worth', population: '909K' },
		{ id: 114, path: '1.14', name: 'Columbus', population: '905K' },
		{ id: 115, path: '1.15', name: 'Charlotte', population: '879K' },
		{ id: 116, path: '1.16', name: 'San Francisco', population: '874K' },
		{ id: 117, path: '1.17', name: 'Indianapolis', population: '867K' },
		{ id: 118, path: '1.18', name: 'Seattle', population: '753K' },
		{ id: 119, path: '1.19', name: 'Denver', population: '727K' },
		{ id: 120, path: '1.20', name: 'Washington DC', population: '689K' },

		// Germany
		{ id: 2, path: '2', name: 'Germany', population: '83M' },
		{ id: 201, path: '2.1', name: 'Berlin', population: '3.6M' },
		{ id: 202, path: '2.2', name: 'Hamburg', population: '1.9M' },
		{ id: 203, path: '2.3', name: 'Munich', population: '1.5M' },
		{ id: 204, path: '2.4', name: 'Cologne', population: '1.1M' },
		{ id: 205, path: '2.5', name: 'Frankfurt', population: '753K' },
		{ id: 206, path: '2.6', name: 'Stuttgart', population: '634K' },
		{ id: 207, path: '2.7', name: 'Dusseldorf', population: '619K' },
		{ id: 208, path: '2.8', name: 'Leipzig', population: '587K' },
		{ id: 209, path: '2.9', name: 'Dortmund', population: '586K' },
		{ id: 210, path: '2.10', name: 'Essen', population: '582K' },
		{ id: 211, path: '2.11', name: 'Bremen', population: '566K' },
		{ id: 212, path: '2.12', name: 'Dresden', population: '556K' },
		{ id: 213, path: '2.13', name: 'Hanover', population: '535K' },
		{ id: 214, path: '2.14', name: 'Nuremberg', population: '518K' },
		{ id: 215, path: '2.15', name: 'Duisburg', population: '498K' },
		{ id: 216, path: '2.16', name: 'Bochum', population: '364K' },
		{ id: 217, path: '2.17', name: 'Wuppertal', population: '354K' },
		{ id: 218, path: '2.18', name: 'Bielefeld', population: '333K' },
		{ id: 219, path: '2.19', name: 'Bonn', population: '329K' },
		{ id: 220, path: '2.20', name: 'Mannheim', population: '309K' },

		// Japan
		{ id: 3, path: '3', name: 'Japan', population: '126M' },
		{ id: 301, path: '3.1', name: 'Tokyo', population: '13.9M' },
		{ id: 302, path: '3.2', name: 'Yokohama', population: '3.7M' },
		{ id: 303, path: '3.3', name: 'Osaka', population: '2.7M' },
		{ id: 304, path: '3.4', name: 'Nagoya', population: '2.3M' },
		{ id: 305, path: '3.5', name: 'Sapporo', population: '2.0M' },
		{ id: 306, path: '3.6', name: 'Fukuoka', population: '1.6M' },
		{ id: 307, path: '3.7', name: 'Kobe', population: '1.5M' },
		{ id: 308, path: '3.8', name: 'Kawasaki', population: '1.5M' },
		{ id: 309, path: '3.9', name: 'Kyoto', population: '1.5M' },
		{ id: 310, path: '3.10', name: 'Saitama', population: '1.3M' },
		{ id: 311, path: '3.11', name: 'Hiroshima', population: '1.2M' },
		{ id: 312, path: '3.12', name: 'Sendai', population: '1.1M' },
		{ id: 313, path: '3.13', name: 'Chiba', population: '978K' },
		{ id: 314, path: '3.14', name: 'Kitakyushu', population: '940K' },
		{ id: 315, path: '3.15', name: 'Sakai', population: '826K' },
		{ id: 316, path: '3.16', name: 'Niigata', population: '789K' },
		{ id: 317, path: '3.17', name: 'Hamamatsu', population: '791K' },
		{ id: 318, path: '3.18', name: 'Shizuoka', population: '693K' },
		{ id: 319, path: '3.19', name: 'Okayama', population: '725K' },
		{ id: 320, path: '3.20', name: 'Kumamoto', population: '738K' },

		// Brazil
		{ id: 4, path: '4', name: 'Brazil', population: '212M' },
		{ id: 401, path: '4.1', name: 'Sao Paulo', population: '12.3M' },
		{ id: 402, path: '4.2', name: 'Rio de Janeiro', population: '6.7M' },
		{ id: 403, path: '4.3', name: 'Brasilia', population: '3.0M' },
		{ id: 404, path: '4.4', name: 'Salvador', population: '2.9M' },
		{ id: 405, path: '4.5', name: 'Fortaleza', population: '2.7M' },
		{ id: 406, path: '4.6', name: 'Belo Horizonte', population: '2.5M' },
		{ id: 407, path: '4.7', name: 'Manaus', population: '2.2M' },
		{ id: 408, path: '4.8', name: 'Curitiba', population: '1.9M' },
		{ id: 409, path: '4.9', name: 'Recife', population: '1.6M' },
		{ id: 410, path: '4.10', name: 'Porto Alegre', population: '1.5M' },
		{ id: 411, path: '4.11', name: 'Belem', population: '1.5M' },
		{ id: 412, path: '4.12', name: 'Goiania', population: '1.5M' },
		{ id: 413, path: '4.13', name: 'Guarulhos', population: '1.4M' },
		{ id: 414, path: '4.14', name: 'Campinas', population: '1.2M' },
		{ id: 415, path: '4.15', name: 'Sao Luis', population: '1.1M' },
		{ id: 416, path: '4.16', name: 'Maceio', population: '1.0M' },
		{ id: 417, path: '4.17', name: 'Duque de Caxias', population: '924K' },
		{ id: 418, path: '4.18', name: 'Natal', population: '890K' },
		{ id: 419, path: '4.19', name: 'Campo Grande', population: '895K' },
		{ id: 420, path: '4.20', name: 'Teresina', population: '868K' },

		// United Kingdom
		{ id: 5, path: '5', name: 'United Kingdom', population: '67M' },
		{ id: 501, path: '5.1', name: 'London', population: '8.9M' },
		{ id: 502, path: '5.2', name: 'Birmingham', population: '1.1M' },
		{ id: 503, path: '5.3', name: 'Manchester', population: '547K' },
		{ id: 504, path: '5.4', name: 'Leeds', population: '793K' },
		{ id: 505, path: '5.5', name: 'Glasgow', population: '633K' },
		{ id: 506, path: '5.6', name: 'Liverpool', population: '498K' },
		{ id: 507, path: '5.7', name: 'Bristol', population: '463K' },
		{ id: 508, path: '5.8', name: 'Sheffield', population: '584K' },
		{ id: 509, path: '5.9', name: 'Edinburgh', population: '527K' },
		{ id: 510, path: '5.10', name: 'Leicester', population: '354K' },
		{ id: 511, path: '5.11', name: 'Coventry', population: '371K' },
		{ id: 512, path: '5.12', name: 'Bradford', population: '537K' },
		{ id: 513, path: '5.13', name: 'Cardiff', population: '362K' },
		{ id: 514, path: '5.14', name: 'Belfast', population: '343K' },
		{ id: 515, path: '5.15', name: 'Nottingham', population: '332K' },
		{ id: 516, path: '5.16', name: 'Newcastle', population: '302K' },
		{ id: 517, path: '5.17', name: 'Southampton', population: '252K' },
		{ id: 518, path: '5.18', name: 'Portsmouth', population: '238K' },
		{ id: 519, path: '5.19', name: 'Brighton', population: '229K' },
		{ id: 520, path: '5.20', name: 'Plymouth', population: '263K' },

		// France
		{ id: 6, path: '6', name: 'France', population: '67M' },
		{ id: 601, path: '6.1', name: 'Paris', population: '2.2M' },
		{ id: 602, path: '6.2', name: 'Marseille', population: '870K' },
		{ id: 603, path: '6.3', name: 'Lyon', population: '516K' },
		{ id: 604, path: '6.4', name: 'Toulouse', population: '479K' },
		{ id: 605, path: '6.5', name: 'Nice', population: '342K' },
		{ id: 606, path: '6.6', name: 'Nantes', population: '314K' },
		{ id: 607, path: '6.7', name: 'Strasbourg', population: '284K' },
		{ id: 608, path: '6.8', name: 'Montpellier', population: '285K' },
		{ id: 609, path: '6.9', name: 'Bordeaux', population: '257K' },
		{ id: 610, path: '6.10', name: 'Lille', population: '233K' },
		{ id: 611, path: '6.11', name: 'Rennes', population: '216K' },
		{ id: 612, path: '6.12', name: 'Reims', population: '182K' },
		{ id: 613, path: '6.13', name: 'Saint-Etienne', population: '173K' },
		{ id: 614, path: '6.14', name: 'Toulon', population: '171K' },
		{ id: 615, path: '6.15', name: 'Le Havre', population: '170K' },
		{ id: 616, path: '6.16', name: 'Grenoble', population: '158K' },
		{ id: 617, path: '6.17', name: 'Dijon', population: '156K' },
		{ id: 618, path: '6.18', name: 'Angers', population: '152K' },
		{ id: 619, path: '6.19', name: 'Nimes', population: '151K' },
		{ id: 620, path: '6.20', name: 'Villeurbanne', population: '150K' },

		// Australia
		{ id: 7, path: '7', name: 'Australia', population: '26M' },
		{ id: 701, path: '7.1', name: 'Sydney', population: '5.3M' },
		{ id: 702, path: '7.2', name: 'Melbourne', population: '5.0M' },
		{ id: 703, path: '7.3', name: 'Brisbane', population: '2.5M' },
		{ id: 704, path: '7.4', name: 'Perth', population: '2.1M' },
		{ id: 705, path: '7.5', name: 'Adelaide', population: '1.4M' },
		{ id: 706, path: '7.6', name: 'Gold Coast', population: '699K' },
		{ id: 707, path: '7.7', name: 'Newcastle', population: '322K' },
		{ id: 708, path: '7.8', name: 'Canberra', population: '453K' },
		{ id: 709, path: '7.9', name: 'Sunshine Coast', population: '348K' },
		{ id: 710, path: '7.10', name: 'Wollongong', population: '306K' },
		{ id: 711, path: '7.11', name: 'Hobart', population: '238K' },
		{ id: 712, path: '7.12', name: 'Geelong', population: '264K' },
		{ id: 713, path: '7.13', name: 'Townsville', population: '180K' },
		{ id: 714, path: '7.14', name: 'Cairns', population: '153K' },
		{ id: 715, path: '7.15', name: 'Darwin', population: '139K' },
		{ id: 716, path: '7.16', name: 'Toowoomba', population: '136K' },
		{ id: 717, path: '7.17', name: 'Ballarat', population: '110K' },
		{ id: 718, path: '7.18', name: 'Bendigo', population: '100K' },
		{ id: 719, path: '7.19', name: 'Launceston', population: '87K' },
		{ id: 720, path: '7.20', name: 'Mackay', population: '80K' },

		// Canada
		{ id: 8, path: '8', name: 'Canada', population: '38M' },
		{ id: 801, path: '8.1', name: 'Toronto', population: '2.9M' },
		{ id: 802, path: '8.2', name: 'Montreal', population: '1.8M' },
		{ id: 803, path: '8.3', name: 'Calgary', population: '1.3M' },
		{ id: 804, path: '8.4', name: 'Ottawa', population: '1.0M' },
		{ id: 805, path: '8.5', name: 'Edmonton', population: '1.0M' },
		{ id: 806, path: '8.6', name: 'Mississauga', population: '721K' },
		{ id: 807, path: '8.7', name: 'Winnipeg', population: '749K' },
		{ id: 808, path: '8.8', name: 'Vancouver', population: '662K' },
		{ id: 809, path: '8.9', name: 'Brampton', population: '656K' },
		{ id: 810, path: '8.10', name: 'Hamilton', population: '569K' },
		{ id: 811, path: '8.11', name: 'Quebec City', population: '549K' },
		{ id: 812, path: '8.12', name: 'Surrey', population: '568K' },
		{ id: 813, path: '8.13', name: 'Laval', population: '438K' },
		{ id: 814, path: '8.14', name: 'Halifax', population: '403K' },
		{ id: 815, path: '8.15', name: 'London', population: '383K' },
		{ id: 816, path: '8.16', name: 'Markham', population: '338K' },
		{ id: 817, path: '8.17', name: 'Vaughan', population: '323K' },
		{ id: 818, path: '8.18', name: 'Gatineau', population: '291K' },
		{ id: 819, path: '8.19', name: 'Saskatoon', population: '273K' },
		{ id: 820, path: '8.20', name: 'Kitchener', population: '256K' },
	];

	// Search state
	type SearchMode = 'filter' | 'search';
	let searchMode = $state<SearchMode>('filter');
	let searchInputValue = $state('');
	let searchTerm = $state('');
	let treeRef: Tree<LocationItem>;
	let searchResults = $state<LTreeNode<LocationItem>[]>([]);
	let currentResultIndex = $state(-1);

	// Search status (onIndexProgress / onSearchStatusChange)
	let indexProgress = $state<IndexProgress | null>(null);
	let filterStatus = $state<SearchStatus | null>(null);

	// Checkbox state
	let checkboxMode = $state<CheckboxMode>('independent');
	let cascadeCheckPolicy = $state<CascadeCheckPolicy>('rolled-up');
	let checkedPaths = $state<Set<string>>(new Set());
	const itemsByPath = new Map(sampleData.map((item) => [item.path, item]));
	const checkedItems = $derived(
		[...checkedPaths]
			.map((path) => itemsByPath.get(path))
			.filter((item): item is LocationItem => !!item)
	);

	function sortByName({ nodes: items }: { nodes: LTreeNode<LocationItem>[] }) {
		return [...items].sort((a, b) => (a.data?.name || '').localeCompare(b.data?.name || ''));
	}

	function toggleSearchMode() {
		searchMode = searchMode === 'filter' ? 'search' : 'filter';
		// Keep the typed query when switching modes — just re-apply it in the new
		// mode. Search mode doesn't filter the tree, so drop any filter text first;
		// onSearchInput() then re-runs the query (and in filter mode re-sets searchTerm).
		if (searchMode === 'search') {
			searchTerm = '';
		}
		onSearchInput();
	}

	function navigateToResult(idx: number) {
		if (searchResults.length === 0) return;
		currentResultIndex = idx;
		const node = searchResults[idx];
		if (node?.path) {
			treeRef?.scrollToPath(node.path, {
				shouldExpandAncestors: true,
				shouldHighlight: true,
				behavior: 'smooth', block: 'center'
			});
		}
	}

	function onSearchInput() {
		if (searchMode === 'filter') {
			searchTerm = searchInputValue;
		}
		const results = treeRef?.searchNodes(searchInputValue.trim()) ?? [];
		searchResults = results;
		if (results.length > 0) {
			currentResultIndex = 0;
			navigateToResult(0);
		} else {
			currentResultIndex = -1;
		}
	}

	function searchNext() {
		if (searchResults.length === 0) return;
		const next = (currentResultIndex + 1) % searchResults.length;
		navigateToResult(next);
	}

	function searchPrev() {
		if (searchResults.length === 0) return;
		const prev = (currentResultIndex - 1 + searchResults.length) % searchResults.length;
		navigateToResult(prev);
	}

	function clearSearch() {
		searchInputValue = '';
		searchTerm = '';
		searchResults = [];
		currentResultIndex = -1;
	}

	function onSearchKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (e.shiftKey) {
				searchPrev();
			} else {
				searchNext();
			}
		} else if (e.key === 'Escape') {
			clearSearch();
		}
	}

	function scrollToResult(index: number) {
		navigateToResult(index);
	}

	// ── SF04 · Filter Scope (experimental) ──────────────────────────────
	// A deep, RAGGED org chart: Sales is 6 levels deep, Marketing 5, IT / Finance / Operations
	// 4, HR only 3.
	type OrgItem = { id: number; path: string; name: string };
	const orgData: OrgItem[] = [
		['1', 'Acme Corp'],
		['1.1', 'Sales Division'],
		['1.1.1', 'Sales Europe'],
		['1.1.1.1', 'Sales Germany'],
		['1.1.1.1.1', 'Team Berlin'],
		['1.1.1.1.1.1', 'Anna Weber'],
		['1.1.1.1.1.2', 'Lukas Schmidt'],
		['1.1.1.1.2', 'Team Munich'],
		['1.1.1.1.2.1', 'Mia Fischer'],
		['1.1.1.1.2.2', 'Jonas Wagner'],
		['1.1.1.2', 'Sales France'],
		['1.1.1.2.1', 'Team Paris'],
		['1.1.1.2.1.1', 'Chloe Martin'],
		['1.1.1.2.1.2', 'Hugo Bernard'],
		['1.1.2', 'Sales Americas'],
		['1.1.2.1', 'Sales USA'],
		['1.1.2.1.1', 'Team Boston'],
		['1.1.2.1.1.1', 'Emma Johnson'],
		['1.1.2.1.1.2', 'Noah Williams'],
		['1.1.2.1.2', 'Team Austin'],
		['1.1.2.1.2.1', 'Olivia Brown'],
		['1.2', 'IT Division'],
		['1.2.1', 'Platform Team'],
		['1.2.1.1', 'Petr Novak'],
		['1.2.1.2', 'Jana Svobodova'],
		['1.2.2', 'Support Team'],
		['1.2.2.1', 'Tomas Dvorak'],
		['1.2.2.2', 'Eva Cerna'],
		['1.3', 'Finance'],
		['1.3.1', 'Accounting Team'],
		['1.3.1.1', 'Karel Horak'],
		['1.3.2', 'Payroll Team'],
		['1.3.2.1', 'Lucie Kralova'],
		['1.4', 'Marketing Division'],
		['1.4.1', 'Marketing EMEA'],
		['1.4.1.1', 'Team Brand'],
		['1.4.1.1.1', 'Sofia Rossi'],
		['1.4.1.1.2', 'Marco Bianchi'],
		['1.4.1.2', 'Team Digital'],
		['1.4.1.2.1', 'Elena Conti'],
		['1.4.2', 'Marketing APAC'],
		['1.4.2.1', 'Team Events'],
		['1.4.2.1.1', 'Yuki Tanaka'],
		['1.5', 'Operations Division'],
		['1.5.1', 'Logistics Team'],
		['1.5.1.1', 'Martin Kovac'],
		['1.5.1.2', 'Zuzana Horvathova'],
		['1.5.2', 'Facilities Team'],
		['1.5.2.1', 'Pavel Benes'],
		['1.6', 'HR'],
		['1.6.1', 'Klara Novotna'],
		['1.6.2', 'David Pospisil']
	].map(([path, name], i) => ({ id: 1000 + i, path, name }));

	const scopeVariants: { scope: FilterScope; title: string; rule: string }[] = [
		{ scope: 'matches', title: 'matches (today)', rule: 'Matches + ancestors only.' },
		{ scope: 'descendants', title: 'descendants', rule: 'Every match shows its whole subtree.' },
		{ scope: 'tree-depth', title: 'tree-depth', rule: 'Match at level ≥ (max depth 6 − x) shows its whole subtree.' },
		{ scope: 'subtree-height', title: 'subtree-height', rule: "Match whose own subtree is ≤ x levels deep shows it." },
		{ scope: 'levels-below', title: 'levels-below', rule: 'Every match shows x levels beneath it.' }
	];
	let scopeTerm = $state('Sales Germany');
	let scopeDepth = $state(2);
	let scopeExpandAdded = $state(true);
	const scopePresets = ['Sales Germany', 'Sales', 'Team', 'Platform', 'Acme', 'Division'];

	function sortOrg({ nodes: items }: { nodes: LTreeNode<OrgItem>[] }) {
		return [...items].sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
	}
	function isScopeMatch(name: string | undefined): boolean {
		const t = scopeTerm.trim().toLowerCase();
		return !!t && !!name && name.toLowerCase().includes(t);
	}
</script>

<svelte:head>
	<title>Search & Filter - Svelte Treeview</title>
</svelte:head>

<header>
	<a href="/" class="back-link">&larr; Back to Examples</a>
	<h1>Search & Filter</h1>
	<p class="subtitle">Internal search index with result navigation</p>
	<RenderModeSwitch />
</header>

<!-- Unified Search Card -->
<div class="card">
	<h2>SF01 · Search & Navigate</h2>
	<p class="description">
		Type to search the tree. <strong>Filter</strong> mode hides non-matching nodes.
		<strong>Search</strong> mode keeps the tree visible and navigates to results.
		Use <kbd>Enter</kbd> for next, <kbd>Shift+Enter</kbd> for previous, <kbd>Esc</kbd> to clear.
	</p>

	<div class="search-bar">
		<button class="search-mode-btn" onclick={toggleSearchMode} title="Toggle filter/search mode">
			{#if searchMode === 'filter'}
				<!-- Funnel icon -->
				<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
					<path d="M1.5 1.5h13l-5 6v5l-3 2v-7z"/>
				</svg>
			{:else}
				<!-- Magnifying glass icon -->
				<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
					<circle cx="6.5" cy="6.5" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
					<line x1="10" y1="10" x2="15" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
				</svg>
			{/if}
		</button>
		<span class="search-mode-label">{searchMode === 'filter' ? 'Filter' : 'Search'}</span>

		<input
			type="text"
			bind:value={searchInputValue}
			oninput={onSearchInput}
			onkeydown={onSearchKeydown}
			placeholder="Search... (try 'london' or 'san')"
			class="search-input"
		/>

		{#if searchResults.length > 0}
			<span class="search-counter">{currentResultIndex + 1}/{searchResults.length}</span>
			<button class="search-nav-btn" title="Previous (Shift+Enter)" aria-label="Previous result" onclick={searchPrev}>
				<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M6 2L1 7h10z"/></svg>
			</button>
			<button class="search-nav-btn" title="Next (Enter)" aria-label="Next result" onclick={searchNext}>
				<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M6 10L1 5h10z"/></svg>
			</button>
		{:else if searchInputValue.trim()}
			<span class="search-counter no-results">0 results</span>
		{/if}

		{#if searchInputValue}
			<button class="search-nav-btn" title="Clear (Esc)" aria-label="Clear search" onclick={clearSearch}>
				<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>
			</button>
		{/if}

	</div>

	<p class="muted search-status" data-testid="sf01-status">
		{#if indexProgress && !indexProgress.isComplete}
			Indexing… {Math.round((indexProgress.processed / Math.max(indexProgress.total, 1)) * 100)}%
			({indexProgress.processed}/{indexProgress.total}) — results may be incomplete
		{:else if indexProgress}
			Index ready ({indexProgress.total} nodes)
		{/if}
		{#if filterStatus?.searchTerm}
			· Filter: {filterStatus.matchCount} matches
			{#if filterStatus.isLimited}
				<strong class="pill pill--warn">— limited to {filterStatus.limit}, refine the search</strong>
			{/if}
		{/if}
	</p>

	<div class="controls">
		<label for="sf01-checkbox-mode">
			Check mode:
			<select id="sf01-checkbox-mode" bind:value={checkboxMode}>
				<option value="independent">Individual (independent)</option>
				<option value="cascade">Cascade</option>
			</select>
		</label>
		<label for="sf01-cascade-policy">
			Cascade reports:
			<select id="sf01-cascade-policy" bind:value={cascadeCheckPolicy} disabled={checkboxMode !== 'cascade'}>
				<option value="rolled-up">Rolled-up (fully checked branch = its root)</option>
				<option value="leaves">Leaves only</option>
				<option value="all">All checked nodes</option>
			</select>
		</label>
	</div>

	<div class="grid-2">
		<div>
			<h3>Tree (filtered)</h3>
			<div class="tree-container tree-container-tall">
				<Tree
					bind:this={treeRef}
					nodes={sampleData}
					idMember="id"
					pathMember="path"
					sortCallback={sortByName}
					isSorted={true}
					expandLevel={3}
					isCheckboxesShown={true}
					{checkboxMode}
					{cascadeCheckPolicy}
					bind:checkedPaths
					shouldUseInternalSearchIndex={true}
					searchValueMember="name"
					bind:searchTerm={searchTerm}
					onIndexProgress={(ctx) => (indexProgress = { processed: ctx.processed, total: ctx.total, isComplete: ctx.isComplete })}
					onSearchStatusChange={(ctx) => (filterStatus = { searchTerm: ctx.searchTerm, matchCount: ctx.matchCount, isLimited: ctx.isLimited, limit: ctx.limit, isIndexing: ctx.isIndexing })}
					{...getTreeProps()}
				>
					{#snippet nodeTemplate(node: any)}
						<span class="location-node">
							<span class="location-name">{node.data?.name}</span>
							{#if node.data?.population}
								<span class="pill pill--muted">{node.data.population}</span>
							{/if}
						</span>
					{/snippet}
				</Tree>
			</div>
		</div>

		<div>
			<h3>Results ({searchResults.length})</h3>
			<div class="tree-container tree-container-tall results-list">
				{#if searchResults.length > 0}
					<ul>
						{#each searchResults as result, i}
							<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
							<li
								class:active={i === currentResultIndex}
								onclick={() => scrollToResult(i)}
								onkeydown={(e) => { if (e.key === "Enter") scrollToResult(i); }}
								role="option"
								aria-selected={i === currentResultIndex}
								tabindex="0"
							>
								<span class="result-name">{result.data?.name}</span>
								<small class="muted">{result.data?.population} - {result.level === 1 ? 'Country' : 'City'}</small>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="muted empty-state">
						{searchTerm.trim() ? 'No results found' : 'Type to search'}
					</p>
				{/if}
			</div>

			<h3>Checked ({checkedItems.length})</h3>
			<div class="tree-container results-list checked-list">
				{#if checkedItems.length > 0}
					<ul>
						{#each checkedItems as item (item.path)}
							<li>
								<span class="result-name">{item.name}</span>
								<small class="muted">{item.population} - {item.path.includes('.') ? 'City' : 'Country'}</small>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="muted empty-state">Nothing checked</p>
				{/if}
			</div>
		</div>
	</div>

	<div class="note">
		<p class="note-title">Note</p>
		<p>The search index is built asynchronously after page load. If no results appear immediately, wait a moment.</p>
	</div>

	<div class="code-block" data-language="svelte">
		<pre>{`${"<"}script>
  let searchInputValue = $state('');
  let searchTerm = $state('');
  let searchMode = $state('filter'); // 'filter' | 'search'
  let treeRef;
  let results = $state([]);
  let currentIndex = $state(-1);

  function onSearchInput() {
    if (searchMode === 'filter') searchTerm = searchInputValue;
    results = treeRef?.searchNodes(searchInputValue.trim()) ?? [];
    if (results.length > 0) {
      currentIndex = 0;
      treeRef.scrollToPath(results[0].path, {
        shouldExpandAncestors: true, shouldHighlight: true
      });
    }
  }

  function searchNext() {
    const next = (currentIndex + 1) % results.length;
    currentIndex = next;
    treeRef.scrollToPath(results[next].path, {
      shouldExpandAncestors: true, shouldHighlight: true
    });
  }
${"<"}/script>

<input bind:value={searchInputValue} oninput={onSearchInput} />
<span>{currentIndex + 1}/{results.length}</span>
<button onclick={searchNext}>Next</button>

<Tree
  bind:this={treeRef}
  bind:searchTerm
  shouldUseInternalSearchIndex={true}
  searchValueMember="name"
  ...
/>`}</pre>
	</div>
</div>

<!-- Search Configuration -->
<div class="card">
	<h2>SF02 · Search Configuration</h2>
	<p class="description">Configure how the search index is built and queried.</p>

	<table class="reference-table">
		<thead>
			<tr>
				<th>Prop</th>
				<th>Type</th>
				<th>Description</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td><code>shouldUseInternalSearchIndex</code></td>
				<td><code>boolean</code></td>
				<td>Enable the internal search index (required for search/filter)</td>
			</tr>
			<tr>
				<td><code>searchValueMember</code></td>
				<td><code>string</code></td>
				<td>Property name to index for searching (e.g., "name")</td>
			</tr>
			<tr>
				<td><code>getSearchValueCallback</code></td>
				<td><code>(node: LTreeNode&lt;T&gt;) =&gt; string</code></td>
				<td>Custom function to extract search value from node</td>
			</tr>
			<tr>
				<td><code>searchTerm</code></td>
				<td><code>string</code></td>
				<td>Bindable prop for filtering the tree visually</td>
			</tr>
		</tbody>
	</table>

	<h3 class="subsection">Methods</h3>
	<table class="reference-table">
		<thead>
			<tr>
				<th>Method</th>
				<th>Returns</th>
				<th>Description</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td><code>searchNodes(text)</code></td>
				<td><code>LTreeNode&lt;T&gt;[]</code></td>
				<td>Query the index without filtering - returns matching nodes</td>
			</tr>
			<tr>
				<td><code>scrollToPath(path, options)</code></td>
				<td><code>void</code></td>
				<td>Scroll tree to make a node visible (expands parents automatically)</td>
			</tr>
		</tbody>
	</table>

	<div class="code-block" data-language="svelte">
		<pre>{`<!-- Using searchValueMember (simple) -->
<Tree
  shouldUseInternalSearchIndex={true}
  searchValueMember="name"
  ...
/>

<!-- Using getSearchValueCallback (custom - search multiple fields) -->
<Tree
  shouldUseInternalSearchIndex={true}
  getSearchValueCallback={({ node }) => \`\${node.data?.name} \${node.data?.description}\`}
  ...
/>`}</pre>
	</div>
</div>

<!-- FlexSearch Integration -->
<div class="card">
	<h2>SF03 · FlexSearch Integration</h2>
	<p class="description">For advanced full-text search, integrate with FlexSearch (optional peer dependency).</p>

	<div class="note">
		<p class="note-title">Installation</p>
		<pre>npm install flexsearch</pre>
	</div>

	<div class="code-block" data-language="ts">
		<pre>{`// FlexSearch provides advanced features:
// - Fuzzy matching
// - Phonetic search
// - Language-specific tokenization
// - Scoring and relevance ranking

// The tree component can work with FlexSearch
// by providing a custom search callback`}</pre>
	</div>
</div>

<!-- Filter Scope (experimental) -->
<div class="card">
	<h2>SF04 · Filter Scope (experimental)</h2>
	<p class="description">
		Which <em>descendants</em> of a filter match stay visible. Ancestors always do.
		Same term + same <code>x</code> (<code>filterDescendantDepth</code>) across five
		<code>filterScope</code> values. The org chart is ragged: Sales is 6 levels deep,
		Marketing 5, IT / Finance / Operations 4, HR only 3. <strong>Bold</strong> = an actual match; the rest is context.
	</p>

	<div class="controls">
		<label for="sf04-term">
			Filter:
			<input id="sf04-term" type="text" bind:value={scopeTerm} placeholder="Type to filter…" />
		</label>
		{#each scopePresets as preset (preset)}
			<button class="btn-outline" onclick={() => (scopeTerm = preset)}>{preset}</button>
		{/each}
		<button class="secondary" onclick={() => (scopeTerm = '')} disabled={!scopeTerm}>Clear</button>
	</div>
	<div class="controls">
		<label for="sf04-depth">
			x (filterDescendantDepth):
			<input id="sf04-depth" type="number" min="0" max="6" bind:value={scopeDepth} class="w-xs" />
		</label>
		<span class="muted">tree-depth threshold = level ≥ {6 - scopeDepth}</span>
		<label>
			<input type="checkbox" bind:checked={scopeExpandAdded} />
			Expand added descendants (<code>shouldExpandFilterDescendants</code>)
		</label>
	</div>

	<div class="grid scope-grid" style="--grid-min: 260px; --grid-gap: 1rem">
		{#each scopeVariants as variant (variant.scope)}
			<div class="scope-cell">
				<h3><code>{variant.title}</code></h3>
				<p class="muted scope-rule">{variant.rule}</p>
				<div class="tree-container scope-tree">
					<Tree
						nodes={orgData}
						idMember="id"
						pathMember="path"
						sortCallback={sortOrg}
						isSorted={true}
						expandLevel={2}
						shouldUseInternalSearchIndex={true}
						searchValueMember="name"
						searchTerm={scopeTerm}
						filterScope={variant.scope}
						filterDescendantDepth={scopeDepth}
						shouldExpandFilterDescendants={scopeExpandAdded}
						{...getTreeProps()}
					>
						{#snippet nodeTemplate(node: any)}
							<span class:scope-match={isScopeMatch(node.data?.name)}>{node.data?.name}</span>
						{/snippet}
					</Tree>
				</div>
			</div>
		{/each}
	</div>

	<h3 class="subsection">Legend</h3>
	<p>
		Every mode shows the <strong>matches</strong> and all their <strong>ancestors</strong>; the mode
		only decides which <em>descendants</em> of a match are added. Levels count from the top:
		Acme Corp = 1, divisions = 2, … people in Sales = 6 (the tree's max depth).
	</p>
	<table class="reference-table">
		<thead>
			<tr>
				<th>filterScope</th>
				<th>Descendants added for a match</th>
				<th>What <code>x</code> means</th>
				<th>Good for</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td><code>matches</code></td>
				<td>None — just the match (default).</td>
				<td>—</td>
				<td>Finding a node; the smallest result.</td>
			</tr>
			<tr>
				<td><code>descendants</code></td>
				<td>Its whole subtree, always.</td>
				<td>—</td>
				<td>"Show me everything under Sales".</td>
			</tr>
			<tr>
				<td><code>tree-depth</code></td>
				<td>Its whole subtree, but only if the match sits at level ≥ (tree's max depth − <code>x</code>);
					else none. Judged against the <em>deepest branch of the whole tree</em>.</td>
				<td>How far up from the tree's bottom level a match may sit and still expand
					(now: level ≥ {6 - scopeDepth}). Smaller <code>x</code> = only matches near the bottom.</td>
				<td>Uniform-depth trees, where "near the bottom" means the same everywhere. On this ragged
					chart a shallow branch (HR, IT) behaves differently from Sales.</td>
			</tr>
			<tr>
				<td><code>subtree-height</code></td>
				<td>Its whole subtree, but only if that subtree is ≤ <code>x</code> levels deep; else none.
					Judged per match, from the match down.</td>
				<td>The biggest subtree worth unfolding (0 = leaves only).</td>
				<td>Ragged trees: expand small teams, keep a whole division folded.</td>
			</tr>
			<tr>
				<td><code>levels-below</code></td>
				<td>Exactly <code>x</code> levels under every match (deeper levels hidden).</td>
				<td>How many levels to show beneath each match.</td>
				<td>Previewing the next level or two, e.g. "Division" + x=1 = its teams.</td>
			</tr>
		</tbody>
	</table>
	<p class="muted">
		<code>shouldExpandFilterDescendants</code> (the checkbox above) only affects the rows a mode
		<em>adds</em>: unchecked, they're in the tree but start collapsed — the cheap option on big trees.
	</p>

	<div class="code-block" data-language="svelte">
		<pre>{`<Tree
  bind:searchTerm
  shouldUseInternalSearchIndex={true}
  searchValueMember="name"
  filterScope="subtree-height"   // 'matches' | 'descendants' | 'tree-depth' | 'subtree-height' | 'levels-below'
  filterDescendantDepth={2}      // x
  shouldExpandFilterDescendants={false}  // added subtrees start collapsed
  ...
/>`}</pre>
	</div>
</div>


<style>
	/* Index / filter status line under the search bar (reserved height: no jump when it fills). */
	.search-status {
		margin: -0.5rem 0 1rem;
		font-size: 0.85rem;
		min-height: 1.2em;
	}

	/* SF04: one column per filterScope variant. */
	.scope-cell h3 {
		margin-bottom: 0.25rem;
		font-size: 1rem;
	}

	.scope-rule {
		margin-bottom: 0.5rem;
		font-size: 0.85rem;
		min-height: 2.4em;
	}

	/* Fixed frame so the five columns line up. In virtual mode the tree scrolls itself
	   (examples-local.css drops the frame's own scroll), so the frame takes its height. */
	.scope-tree {
		height: 420px;
	}
	.scope-tree:has(:global(.stv__virtual-scroll)) {
		height: auto;
	}

	.scope-match {
		font-weight: 700;
		color: var(--kmwc-accent-color);
	}

	/* SF01 results / checked lists: clickable rows beside the tree. */
	.results-list ul {
		list-style: none;
	}

	.results-list li {
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--kmwc-border-color);
		border-left: 3px solid transparent;
		cursor: pointer;
		line-height: 1.4;
	}

	.results-list li:hover {
		background: var(--kmwc-hover-bg);
	}

	.results-list li.active {
		background: var(--kmwc-accent-light-bg);
		border-left-color: var(--kmwc-accent-color);
	}

	.checked-list {
		max-height: 220px;
	}

	.checked-list li {
		cursor: default;
	}

	.result-name {
		display: block;
		font-weight: 500;
		color: var(--kmwc-text-color-1);
	}

	.empty-state {
		text-align: center;
		padding: 2rem 0;
	}

	/* Node template: city name + population pill. */
	.location-node {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.location-name {
		font-weight: 500;
	}
</style>
