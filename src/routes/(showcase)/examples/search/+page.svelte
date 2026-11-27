<script lang="ts">
	import Tree from '$lib/components/Tree.svelte';
	import type { LTreeNode, CheckboxMode, CascadeCheckPolicy, FilterScope, IndexProgress, SearchStatus } from '$lib/ltree/types.js';
	import type { BeforeScrollContext, TreeScrollOptions } from '$lib/core/TreeEngine.svelte.js';
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

	// ── SF04 · Filter Scope ──────────────────────────────
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

	// ── SF02 / SF03 / SF05 data (= web-treeview's examples-search.html) ──
	type SimpleItem = { id: number | string; path: string; name: string; description?: string };
	const projectTree: SimpleItem[] = [
		{ id: 1, path: '1', name: 'src' },
		{ id: 2, path: '1.1', name: 'components' },
		{ id: 3, path: '1.1.1', name: 'Button.tsx' },
		{ id: 4, path: '1.1.2', name: 'Input.tsx' },
		{ id: 5, path: '1.2', name: 'pages' },
		{ id: 6, path: '1.2.1', name: 'Home.tsx' },
		{ id: 7, path: '1.2.2', name: 'tests' },
		{ id: 8, path: '1.2.2.1', name: 'unit-test-1.ts' },
		{ id: 9, path: '1.2.2.2', name: 'unit-test-2.ts' },
		{ id: 10, path: '1.3', name: 'utils' },
		{ id: 11, path: '1.3.1', name: 'helpers.ts' },
		{ id: 12, path: '1.3.2', name: 'config.ts' },
		{ id: 13, path: '2', name: 'docs' },
		{ id: 14, path: '2.1', name: 'README.md' },
		{ id: 15, path: '2.2', name: 'test-plan.md' }
	];
	const orgTree: SimpleItem[] = [
		{ id: 1, path: '1', name: 'Engineering', description: 'builds the product' },
		{ id: 2, path: '1.1', name: 'Frontend', description: 'web UI team' },
		{ id: 3, path: '1.2', name: 'Backend', description: 'API and services' },
		{ id: 4, path: '2', name: 'Design', description: 'product design' },
		{ id: 5, path: '2.1', name: 'UX Research', description: 'user studies' },
		{ id: 6, path: '3', name: 'Marketing', description: 'growth and brand' }
	];
	function sortByPath({ nodes: items }: { nodes: LTreeNode<SimpleItem>[] }) {
		return [...items].sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
	}
	const listMatches = (matches: LTreeNode<SimpleItem>[]) =>
		matches.length
			? `Found ${matches.length} match(es):\n` + matches.map((n) => `  - ${n.data?.name} (${n.path})`).join('\n')
			: 'No matches';

	// ── SF02 · Filter vs Search ──────────────────────────
	let sf02FilterText = $state('');
	let sf02SearchText = $state('');
	let sf02Output = $state('Type to search');
	let sf02SearchTree: Tree<SimpleItem>;
	function onSf02Search() {
		const q = sf02SearchText.trim();
		sf02Output = q ? listMatches(sf02SearchTree?.searchNodes(q) ?? []) : 'Type to search';
	}

	// ── SF03 · index toggle ──────────────────────────────
	let sf03IndexEnabled = $state(true);
	let sf03Text = $state('');
	let sf03Output = $state('Type to search');
	let sf03Tree: Tree<SimpleItem>;
	function onSf03Search() {
		const q = sf03Text.trim();
		if (!q) sf03Output = 'Type to search';
		else if (!sf03IndexEnabled) sf03Output = 'Index disabled — searchNodes() returns no matches.';
		else sf03Output = listMatches(sf03Tree?.searchNodes(q) ?? []);
	}

	// ── SF05 · beforeScrollCallback ──────────────────────
	const scrollNodes: SimpleItem[] = [];
	for (let g = 1; g <= 40; g++) {
		scrollNodes.push({ id: `g${g}`, path: `${g}`, name: `Group ${g}` });
		for (let i = 1; i <= 8; i++) scrollNodes.push({ id: `g${g}-${i}`, path: `${g}.${i}`, name: `Item ${g}.${i}` });
	}
	let sf05Tree: Tree<SimpleItem>;
	let sf05CancelKeyboard = $state(false);
	let sf05AlignStart = $state(false);
	let sf05Reveal = $state(true);
	let sf05Log = $state<string[]>([]);
	function onBeforeScroll({ source, path, container, options }: BeforeScrollContext<SimpleItem>) {
		const where = container ? container.id || container.className : 'page';
		let verdict = 'defaults';
		let result: false | Partial<TreeScrollOptions> | undefined;
		if (source === 'keyboard' && sf05CancelKeyboard) {
			result = false;
			verdict = 'skipped';
		} else if (source === 'scroll-to-path' && sf05AlignStart) {
			result = { block: 'start' };
			verdict = '→ block start';
		}
		sf05Log = [`${source}  ${path}  container=${where}  ${JSON.stringify(options)}  ${verdict}`, ...sf05Log].slice(0, 30);
		return result;
	}
	function onScrollDemo(text: string) {
		const q = text.trim();
		if (!q) return;
		const [hit] = sf05Tree?.searchNodes(q) ?? [];
		if (hit) sf05Tree.scrollToPath(hit.path, { shouldHighlight: true, shouldRevealContainer: sf05Reveal });
	}
</script>

<svelte:head>
	<title>Search & Filter - Svelte Treeview</title>
</svelte:head>

<header>
	<a href="/" class="back-link">&larr; Back to Examples</a>
	<h1>Search & Filter</h1>
	<p class="subtitle">Filter the tree down to matches, or search-and-navigate while keeping the whole tree visible &mdash; powered by the internal FlexSearch index</p>
	<RenderModeSwitch />
</header>

<!-- Unified Search Card -->
<div class="card">
	<h2>SF01 · Search & Navigate</h2>
	<p class="description">
		Type to query the tree. <strong>Filter</strong> mode hides non-matching nodes and auto-expands
		ancestors of matches. <strong>Search</strong> mode keeps the whole tree visible and jumps between
		matches. Use <kbd>Enter</kbd> for next, <kbd>Shift+Enter</kbd> for previous, <kbd>Esc</kbd> to
		clear. Toggle the mode with the icon button. Tick checkboxes while filtered — the checked list
		keeps what you picked.
	</p>

	<div class="search-bar">
		<button class="search-mode-btn" onclick={toggleSearchMode} title="Toggle filter/search mode">
			{#if searchMode === 'filter'}
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
			{:else}
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
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
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
			</button>
			<button class="search-nav-btn" title="Next (Enter)" aria-label="Next result" onclick={searchNext}>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
			</button>
		{:else if searchInputValue.trim()}
			<span class="search-counter no-results">0 results</span>
		{/if}

		{#if searchInputValue}
			<button class="search-nav-btn" title="Clear (Esc)" aria-label="Clear search" onclick={clearSearch}>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
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
					isInternalSearchIndexEnabled={true}
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
		<p>The search index is built asynchronously after the data is set. If no results appear on the very first keystroke, wait a moment for indexing to finish (the status line above says when it is ready).</p>
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
  isInternalSearchIndexEnabled={true}
  searchValueMember="name"
  ...
/>`}</pre>
	</div>
</div>

<!-- SF02 · Filter vs Search -->
<div class="card">
	<h2>SF02 · Filter vs Search</h2>
	<p class="description">
		Both consult the same index, but they do different things to the tree. Run the two live demos
		below with the same query to feel the difference.
	</p>

	<table class="reference-table">
		<thead>
			<tr>
				<th>API</th>
				<th>Effect on the tree</th>
				<th>Returns</th>
				<th>Use when</th>
			</tr>
		</thead>
		<tbody>
			<tr class="is-highlight">
				<td><code>searchTerm</code> (bindable) / <code>filterNodes(text)</code></td>
				<td>Prunes &mdash; hides non-matching nodes, auto-expands ancestors of matches</td>
				<td><code>void</code></td>
				<td>You want to narrow a large tree down to what matters</td>
			</tr>
			<tr>
				<td><code>searchNodes(text)</code></td>
				<td>None &mdash; the tree stays fully intact</td>
				<td><code>LTreeNode&lt;T&gt;[]</code></td>
				<td>You want to count / navigate matches without losing context</td>
			</tr>
			<tr>
				<td><code>scrollToPath(path, opts)</code></td>
				<td>Scrolls a node into view (auto-expands ancestors)</td>
				<td><code>Promise&lt;boolean&gt;</code></td>
				<td>Jumping to a search result (<code>&#123; shouldExpandAncestors, shouldHighlight &#125;</code>)</td>
			</tr>
		</tbody>
	</table>

	<div class="grid" style="--grid-min: 320px; margin-top: 1rem">
		<div>
			<p class="output-label"><code>searchTerm</code> &mdash; non-matches disappear</p>
			<div class="controls">
				<input type="text" id="sf02-filter-input" placeholder="Filter (e.g. 'test')..." bind:value={sf02FilterText} />
				<button class="btn-outline" onclick={() => (sf02FilterText = '')}>Clear</button>
			</div>
			<div class="tree-container tree-container-sm">
				<Tree
					nodes={projectTree}
					idMember="id"
					pathMember="path"
					displayValueMember="name"
					sortCallback={sortByPath}
					isSorted={true}
					expandLevel={1}
					searchValueMember="name"
					searchTerm={sf02FilterText.trim()}
					{...getTreeProps()}
				/>
			</div>
		</div>
		<div>
			<p class="output-label"><code>searchNodes</code> &mdash; tree intact, matches listed</p>
			<div class="controls">
				<input type="text" id="sf02-search-input" placeholder="Search (e.g. 'test')..." bind:value={sf02SearchText} oninput={onSf02Search} />
				<button class="btn-outline" onclick={() => { sf02SearchText = ''; onSf02Search(); }}>Clear</button>
			</div>
			<div class="tree-container tree-container-sm">
				<Tree
					bind:this={sf02SearchTree}
					nodes={projectTree}
					idMember="id"
					pathMember="path"
					displayValueMember="name"
					sortCallback={sortByPath}
					isSorted={true}
					expandLevel={1}
					searchValueMember="name"
					{...getTreeProps()}
				/>
			</div>
			<div class="output">
				<p class="output-label">Matches:</p>
				<pre id="sf02-output">{sf02Output}</pre>
			</div>
		</div>
	</div>
</div>

<!-- SF03 · Internal Search Index (FlexSearch) -->
<div class="card">
	<h2>SF03 · Internal Search Index (FlexSearch)</h2>
	<p class="description">
		Search is backed by an internal <strong>FlexSearch</strong> index, built asynchronously off the
		node data. It is on by default (<code>isInternalSearchIndexEnabled</code>); tell it which value
		to index via <code>searchValueMember</code> (or the <code>getSearchValueCallback</code> for
		multi-field / computed text). Without the index enabled, <code>searchTerm</code> /
		<code>searchNodes</code> have nothing to query.
	</p>

	<table class="reference-table">
		<thead>
			<tr>
				<th>Prop</th>
				<th>Type</th>
				<th>Description</th>
			</tr>
		</thead>
		<tbody>
			<tr class="is-highlight">
				<td><code>isInternalSearchIndexEnabled</code></td>
				<td><code>boolean</code></td>
				<td>Build the internal FlexSearch index (required for search/filter). Default <code>true</code>; <code>false</code> = no index, search finds nothing</td>
			</tr>
			<tr>
				<td><code>searchValueMember</code></td>
				<td><code>string</code></td>
				<td>Property name whose value gets indexed (e.g. <code>"name"</code>)</td>
			</tr>
			<tr>
				<td><code>getSearchValueCallback</code></td>
				<td><code>(&#123; node &#125;) =&gt; string</code></td>
				<td>Custom extractor &mdash; index multiple fields / computed text</td>
			</tr>
			<tr>
				<td><code>indexerBatchSize</code></td>
				<td><code>number</code></td>
				<td>Max nodes indexed per idle slot (default 1000; each slot is also time-boxed)</td>
			</tr>
			<tr>
				<td><code>indexerTimeout</code></td>
				<td><code>number</code></td>
				<td>Idle timeout (ms) between index batches (default 50)</td>
			</tr>
			<tr>
				<td><code>initializeIndexCallback</code></td>
				<td><code>() =&gt; Index</code></td>
				<td>Factory for a custom FlexSearch <code>Index</code> (tokenizer, charset, …) instead of the built-in one; a change rebuilds the index</td>
			</tr>
			<tr>
				<td><code>searchTerm</code></td>
				<td><code>string</code></td>
				<td>The active filter term (bindable) &mdash; the declarative twin of <code>filterNodes(text)</code></td>
			</tr>
			<tr>
				<td><code>maxSearchResultCount</code></td>
				<td><code>number</code></td>
				<td>Max matches a search / filter returns (default 1000); <code>onSearchStatusChange</code> reports <code>isLimited</code></td>
			</tr>
			<tr>
				<td><code>filterScope</code></td>
				<td><code>'matches' | 'descendants' | 'tree-depth' | 'subtree-height' | 'levels-below'</code></td>
				<td><strong>Experimental.</strong> Which descendants of a filter match stay visible (ancestors always do) &mdash; see SF04</td>
			</tr>
			<tr>
				<td><code>filterDescendantDepth</code></td>
				<td><code>number</code></td>
				<td><strong>Experimental.</strong> The x of the depth-limited filter scopes (default 1)</td>
			</tr>
			<tr>
				<td><code>shouldExpandFilterDescendants</code></td>
				<td><code>boolean</code></td>
				<td><strong>Experimental.</strong> Expand the descendants a filter scope adds (default <code>true</code>); off, they start collapsed</td>
			</tr>
		</tbody>
	</table>

	<table class="reference-table">
		<thead>
			<tr>
				<th>Event prop</th>
				<th>ctx</th>
				<th>Fires when</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td><code>onIndexProgress</code></td>
				<td><code>&#123; processed, total, isComplete &#125;</code></td>
				<td>The async index filled another batch, and once more with <code>isComplete: true</code> at the end &mdash; results are partial until then</td>
			</tr>
			<tr>
				<td><code>onSearchStatusChange</code></td>
				<td><code>&#123; searchTerm, matchCount, isLimited, limit, isIndexing &#125;</code></td>
				<td>A filter was applied or cleared (also the automatic re-filter when indexing completes); <code>isLimited</code> = more matched than <code>maxSearchResultCount</code></td>
			</tr>
		</tbody>
	</table>

	<div class="controls mt-1">
		<label>
			<input type="checkbox" id="sf03-index-toggle" bind:checked={sf03IndexEnabled} onchange={() => queueMicrotask(onSf03Search)} />
			Internal search index enabled
		</label>
		<input type="text" id="sf03-input" placeholder="Search (e.g. 'frontend')..." bind:value={sf03Text} oninput={onSf03Search} />
		<button class="btn-outline" onclick={() => { sf03Text = ''; onSf03Search(); }}>Clear</button>
	</div>

	<div class="tree-container tree-container-sm">
		<Tree
			bind:this={sf03Tree}
			nodes={orgTree}
			idMember="id"
			pathMember="path"
			displayValueMember="name"
			sortCallback={sortByPath}
			isSorted={true}
			expandLevel={1}
			searchValueMember="name"
			isInternalSearchIndexEnabled={sf03IndexEnabled}
			{...getTreeProps()}
		/>
	</div>

	<div class="output">
		<p class="output-label">Result:</p>
		<pre id="sf03-output">{sf03Output}</pre>
	</div>

	<div class="code-block" data-language="svelte">
		<pre>{`<!-- Simple: index a single member -->
<Tree isInternalSearchIndexEnabled searchValueMember="name" ... />

<!-- Advanced: index a computed string across several fields -->
<Tree
  isInternalSearchIndexEnabled
  getSearchValueCallback={({ node }) => \`\${node.data?.name} \${node.data?.description ?? ''}\`}
  ...
/>`}</pre>
	</div>
</div>

<!-- Filter Scope -->
<div class="card">
	<h2>SF04 · Filter Scope</h2>
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
						isInternalSearchIndexEnabled={true}
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
  isInternalSearchIndexEnabled={true}
  searchValueMember="name"
  filterScope="subtree-height"   // 'matches' | 'descendants' | 'tree-depth' | 'subtree-height' | 'levels-below'
  filterDescendantDepth={2}      // x
  shouldExpandFilterDescendants={false}  // added subtrees start collapsed
  ...
/>`}</pre>
	</div>
</div>

<!-- SF05 · Scroll control (beforeScrollCallback) -->
<div class="card">
	<h2>SF05 · Scroll control (beforeScrollCallback)</h2>
	<p class="description">
		The tree scrolls a node into view on its own in three places: a keyboard move
		(<code>source: 'keyboard'</code> &mdash; <code>nearest</code>, always instant),
		<code>scrollToPath</code> (<code>'scroll-to-path'</code> &mdash; <code>center</code>, the
		<code>--stv-scroll-behavior</code> token, and it first scrolls the page to the tree when the tree
		is off-screen) and the reveal after a paste into a node (<code>'paste'</code>). Each scroll moves
		only the tree's scroll container, never the page; a tree without one scrolls the page with the
		same alignment. <code>beforeScrollCallback</code> runs first: return <code>false</code> to skip
		the scroll, or options to replace the defaults. Type to jump with <code>scrollToPath</code>, or
		click a node and use the arrow keys / <kbd>PageDown</kbd> / <kbd>End</kbd>. Scroll the page so
		the tree is out of sight, then search with &ldquo;Reveal the tree&rdquo; on and off.
	</p>

	<div class="controls">
		<input type="search" id="sf05-input" placeholder="Search (e.g. 'Item 27.5')..." oninput={(e) => onScrollDemo(e.currentTarget.value)} />
		<label><input type="checkbox" id="sf05-cancel-keyboard" bind:checked={sf05CancelKeyboard} /> Cancel keyboard scrolls</label>
		<label><input type="checkbox" id="sf05-start" bind:checked={sf05AlignStart} /> Align to start (not center)</label>
		<label><input type="checkbox" id="sf05-reveal" bind:checked={sf05Reveal} /> Reveal the tree</label>
	</div>

	<table class="reference-table">
		<thead>
			<tr><th>ctx field</th><th>Type</th><th>Description</th></tr>
		</thead>
		<tbody>
			<tr><td><code>node</code> / <code>path</code></td><td><code>LTreeNode</code> / <code>string</code></td><td>The node being revealed</td></tr>
			<tr class="is-highlight"><td><code>source</code></td><td><code>'keyboard' | 'scroll-to-path' | 'paste'</code></td><td>What made the tree scroll</td></tr>
			<tr><td><code>container</code></td><td><code>HTMLElement | null</code></td><td>The scroll container found around the row (the tree's own, or a wrapper); <code>null</code> = only the page scrolls</td></tr>
			<tr><td><code>options</code></td><td><code>&#123; block, inline, behavior, shouldRevealContainer &#125;</code></td><td>What the tree is about to use; return a partial to replace it</td></tr>
			<tr><td><code>controller</code></td><td><code>TreeController</code></td><td>The usual callback context</td></tr>
		</tbody>
	</table>

	<div class="tree-container tree-container-sm mt-1" id="sf05-container">
		<Tree
			bind:this={sf05Tree}
			nodes={scrollNodes}
			idMember="id"
			pathMember="path"
			displayValueMember="name"
			sortCallback={sortByPath}
			isSorted={true}
			expandLevel={1}
			searchValueMember="name"
			beforeScrollCallback={onBeforeScroll}
			{...getTreeProps()}
		/>
	</div>

	<div class="output">
		<p class="output-label">beforeScrollCallback ctx:</p>
		<div class="log-panel" id="sf05-log">
			{#each sf05Log as line, i (i)}<div>{line}</div>{/each}
		</div>
	</div>

	<div class="code-block" data-language="svelte">
		<pre>{`<Tree
  beforeScrollCallback={({ source, path, container, options }) => {
    if (source === 'keyboard' && cancelKeyboard) return false;  // skip it
    if (source === 'scroll-to-path') return { block: 'start' };  // replace a default
    // nothing → the defaults in \`options\`
  }}
  ...
/>

<!-- scrollToPath brings an off-screen tree into view first — opt out per call: -->
tree.scrollToPath('27.5', { shouldRevealContainer: false });`}</pre>
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
