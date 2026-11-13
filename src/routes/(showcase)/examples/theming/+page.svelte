<script lang="ts">
	import Tree from '$lib/components/Tree.svelte';
	import { onMount } from 'svelte';
	import { observeThemeContext, type ColorScheme } from '$lib/index.js';
	import type { LTreeNode } from '$lib/ltree/types.js';
	import RenderModeSwitch from '../RenderModeSwitch.svelte';
	import { getTreeProps } from '../render-mode.svelte.js';

	type FileItem = {
		id: number;
		path: string;
		name: string;
		icon: string;
	};

	const sampleData: FileItem[] = [
		{ id: 1, path: '1', name: 'Documents', icon: '📁' },
		{ id: 2, path: '1.1', name: 'Work', icon: '💼' },
		{ id: 3, path: '1.1.1', name: 'Reports', icon: '📊' },
		{ id: 4, path: '1.2', name: 'Personal', icon: '🏠' },
		{ id: 5, path: '2', name: 'Downloads', icon: '⬇️' },
		{ id: 6, path: '2.1', name: 'Software', icon: '💿' }
	];

	function sortByName({ nodes: items }: { nodes: LTreeNode<FileItem>[] }) {
		return [...items].sort((a, b) => (a.data?.name || '').localeCompare(b.data?.name || ''));
	}

	// Toggle icon demo state — ONE `iconSet` knob re-points the --stv-icon-* set.
	type IconSetKey = 'chevron' | 'triangle' | 'plus-minus' | 'arrow';
	const iconSetOptions: { key: IconSetKey; label: string; note: string }[] = [
		{ key: 'chevron', label: 'Chevron', note: '→ --base-icon-chevron · rotates' },
		{ key: 'triangle', label: 'Filled caret', note: '→ --base-icon-caret-down · rotates' },
		{ key: 'plus-minus', label: 'Plus / Minus', note: '→ --base-icon-expand/-collapse · swaps' },
		{ key: 'arrow', label: 'Arrows', note: 'Lucide arrow · rotates' }
	];

	let iconSet = $state<IconSetKey>('chevron');
	let toggleIconMode = $state<'rotate' | 'swap'>('rotate');

	// Reskin the default chevron via the shared --base-icon-* contract: setting
	// --base-icon-chevron on an ancestor of .stv__container flows into
	// --stv-icon-expand, so the whole tree's chevron swaps to a custom mask — the
	// same override a theme applies to every KeenMate component at once. (Only the
	// chevron set consults --base-icon-chevron; the others chain to their own token.)
	let brandChevron = $state(false);
	const brandChevronUrl =
		"url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='black'><path d='M8 5l11 7-11 7z'/></svg>\")";
	const toggleDemoStyle = $derived(brandChevron ? `--base-icon-chevron: ${brandChevronUrl}` : '');

	// ---- Dark Mode Playground state -----------------------------------------
	type PageScheme = 'normal' | 'light dark' | 'dark' | 'light';
	type AncestorSignal = 'none' | 'data-theme-dark' | 'data-bs-theme-dark' | 'dark-class' | 'data-theme-light';
	type InstanceTheme = 'none' | 'dark' | 'light';
	type BrandTheme = 'default' | 'material' | 'neon' | 'sharp' | 'soft' | 'glass' | 'forest';

	let pageScheme = $state<PageScheme>('normal');
	let ancestorSignal = $state<AncestorSignal>('none');
	let instanceTheme = $state<InstanceTheme>('none');
	let brandTheme = $state<BrandTheme>('default');
	// Pre-highlight a node so the accent (multi-select bg + outline, both derived
	// from --stv-accent-color via color-mix) is visible at rest — otherwise switching
	// brand themes only changes interaction states the user has to trigger.
	let playgroundHighlight = $state<Set<string>>(new Set(['1.1']));

	// User-driven INPUT: the page-scheme radio sets color-scheme on the demo SCOPE
	// (.th-scheme-scope, a stand-in for <html>) — the consumer side of the contract,
	// what a hand-rolled theme toggle would write on <html>. It is NOT detection —
	// CSS resolves everything from here on. Scoped (not on <html>) so it never
	// fights the examples site's own light/dark switch, which owns html[data-theme].
	const scopeColorScheme = $derived(pageScheme === 'normal' ? undefined : pageScheme);

	// Brand theme is applied as a class on the playground wrapper. Because the
	// library now declares its --stv-* variables on .stv__container (not on
	// :root), setting --base-* on the wrapper correctly re-tints the descendant
	// .stv__container — no document-level hackery needed.

	const wrapperClass = $derived(ancestorSignal === 'dark-class' ? 'dark' : '');
	const wrapperDataTheme = $derived(
		ancestorSignal === 'data-theme-dark' ? 'dark'
		: ancestorSignal === 'data-theme-light' ? 'light'
		: undefined
	);
	const wrapperBsTheme = $derived(ancestorSignal === 'data-bs-theme-dark' ? 'dark' : undefined);
	const treeTheme = $derived<'dark' | 'light' | undefined>(
		instanceTheme === 'dark' ? 'dark' : instanceTheme === 'light' ? 'light' : undefined
	);

	// The PAGE theme signal (the header's light / dark / auto switch writes html[data-theme]),
	// read through the same core theme context the tree uses — for the "winning signal" line.
	let pageSignal = $state<ColorScheme | null>(null);
	onMount(() => observeThemeContext(document.documentElement, undefined, (scheme) => (pageSignal = scheme)));

	const winningSignal = $derived.by(() => {
		if (instanceTheme !== 'none') return `Per-instance: <Tree theme="${instanceTheme}" />`;
		if (ancestorSignal !== 'none') {
			if (ancestorSignal === 'dark-class') return 'Ancestor class: .dark (Tailwind)';
			if (ancestorSignal === 'data-theme-dark') return 'Ancestor attr: [data-theme="dark"]';
			if (ancestorSignal === 'data-theme-light') return 'Ancestor attr: [data-theme="light"]';
			if (ancestorSignal === 'data-bs-theme-dark') return 'Ancestor attr: [data-bs-theme="dark"] (Bootstrap)';
		}
		if (pageSignal) return `Page theme signal: &lt;html data-theme="${pageSignal}"&gt; (the header switch — set it to ◐ auto to see the color-scheme layer)`;
		if (pageScheme === 'dark') return 'Page color-scheme: dark (light-dark() resolves to dark branch)';
		if (pageScheme === 'light') return 'Page color-scheme: light';
		if (pageScheme === 'light dark') return 'Page color-scheme: light dark (follows OS preference via light-dark())';
		return 'No demo signal — inherits this page\'s own color-scheme (the light / dark switch in the header)';
	});

	// ---- Dynamic Theme Switching (bottom-of-page picker) --------------------
	// Mirrors web-daterangepicker's examples-theming.html "Dynamic Theme Switching"
	// section: one demo tree, a row of color-coded buttons that hot-swap the
	// brand theme class, plus a dark/light toggle for the per-instance theme prop.
	let dynamicBrand = $state<BrandTheme>('default');
	let dynamicMode = $state<'inherit' | 'dark' | 'light'>('inherit');
	const dynamicTreeTheme = $derived<'dark' | 'light' | undefined>(
		dynamicMode === 'dark' ? 'dark' : dynamicMode === 'light' ? 'light' : undefined
	);
	let dynamicHighlight = $state<Set<string>>(new Set(['1.1']));
</script>

<svelte:head>
	<title>Theming Examples - Svelte Treeview</title>
</svelte:head>

<header class="example-header">
	<a href="/" class="back-link">&larr; Back to Examples</a>
	<h1>Theming</h1>
	<p class="subtitle">CSS variables, custom styles, and visual customization</p>
	<RenderModeSwitch />
</header>

<!-- Dark mode playground (interactive control panel) -->
<div class="card">
	<h2>TH01 · Dark Mode Playground</h2>
	<p class="description">
		Toggle each signal independently and watch the demo tree react. The
		"winning signal" line shows which input wins, highest first: the per-instance
		<code>theme</code> prop → the theme context (the nearest ancestor signal, read here via
		<code>themeSource="closest"</code>, else the page's own <code>&lt;html data-theme&gt;</code> —
		the header switch) → the inherited <code>color-scheme</code> → the OS preference. It's the
		same KeenMate core detection every web-* component uses (<code>setThemeMode()</code> forces
		it page-wide). OS <code>prefers-color-scheme</code> can't be controlled from JavaScript —
		flip your OS or browser dev-tools setting to test that path. The demo lives in its own
		scope, so these controls never touch the header switch.
	</p>

	<div class="playground-controls card-grid" style="--grid-min: 260px; --grid-gap: 1rem">
		<fieldset class="check-list">
			<legend>1. Page <code>color-scheme</code> (on the demo scope, standing in for <code>&lt;html&gt;</code>) — only with no theme signal: header switch on ◐ auto</legend>
			<label><input type="radio" bind:group={pageScheme} value="normal" /> none</label>
			<label><input type="radio" bind:group={pageScheme} value="light dark" /> <code>light dark</code> (OS-aware)</label>
			<label><input type="radio" bind:group={pageScheme} value="dark" /> <code>dark</code> (force)</label>
			<label><input type="radio" bind:group={pageScheme} value="light" /> <code>light</code> (force)</label>
		</fieldset>

		<fieldset class="check-list">
			<legend>2. Ancestor theme class / attribute (wraps the demo tree; read via <code>themeSource="closest"</code>)</legend>
			<label><input type="radio" bind:group={ancestorSignal} value="none" /> none</label>
			<label><input type="radio" bind:group={ancestorSignal} value="data-theme-dark" /> <code>[data-theme="dark"]</code></label>
			<label><input type="radio" bind:group={ancestorSignal} value="data-bs-theme-dark" /> <code>[data-bs-theme="dark"]</code></label>
			<label><input type="radio" bind:group={ancestorSignal} value="dark-class" /> <code>.dark</code> (Tailwind)</label>
			<label><input type="radio" bind:group={ancestorSignal} value="data-theme-light" /> <code>[data-theme="light"]</code> (force light)</label>
		</fieldset>

		<fieldset class="check-list">
			<legend>3. Per-instance <code>theme</code> prop (highest precedence)</legend>
			<label><input type="radio" bind:group={instanceTheme} value="none" /> inherit</label>
			<label><input type="radio" bind:group={instanceTheme} value="dark" /> <code>theme="dark"</code></label>
			<label><input type="radio" bind:group={instanceTheme} value="light" /> <code>theme="light"</code></label>
		</fieldset>

		<fieldset class="check-list">
			<legend>4. Brand theme — sets <code>--base-*</code> tokens on the wrapper</legend>
			<label><input type="radio" bind:group={brandTheme} value="default" /> Default (Bootstrap blue)</label>
			<label><input type="radio" bind:group={brandTheme} value="material" /> Material (calm blue, soft shadows, pre-oriented caret)</label>
			<label><input type="radio" bind:group={brandTheme} value="neon" /> Neon (dark, magenta + cyan glow, double-chevron)</label>
			<label><input type="radio" bind:group={brandTheme} value="sharp" /> Sharp (high-contrast, brutalist, square-chevron)</label>
			<label><input type="radio" bind:group={brandTheme} value="soft" /> Soft (peach + pink, very rounded, circle-chevron)</label>
			<label><input type="radio" bind:group={brandTheme} value="glass" /> Glass (translucent, blurred)</label>
			<label><input type="radio" bind:group={brandTheme} value="forest" /> Forest (earth tones, cream ↔ deep forest)</label>
		</fieldset>
	</div>

	<p class="note">
		<strong>Winning signal:</strong> {@html winningSignal}
	</p>

	<!-- The demo scope: radio 1 writes color-scheme HERE (not on <html>), so the
	     page's own theme switch and this playground stay independent. -->
	<div class="th-scheme-scope" style:color-scheme={scopeColorScheme}>
		<div
			class={['playground-wrapper', wrapperClass, `brand-${brandTheme}`]}
			data-theme={wrapperDataTheme}
			data-bs-theme={wrapperBsTheme}
		>
			<div class="tree-container playground-tree">
				<Tree
					nodes={sampleData}
					idMember="id"
					pathMember="path"
					sortCallback={sortByName}
					isSorted={true}
					expandLevel={3}
					themeSource="closest"
					theme={treeTheme}
					selectionMode="multiple"
					bind:selectedPaths={playgroundHighlight}
					{...getTreeProps()}
				>
					{#snippet nodeTemplate(node: any)}
						<span>{node.data?.icon} {node.data?.name}</span>
					{/snippet}
				</Tree>
			</div>
		</div>
	</div>

	<p class="muted">
		Tip: combine signals to verify precedence. Set <code>theme="light"</code>
		with all ancestor classes also set to dark — the per-instance prop should
		win and the tree stays light.
	</p>
</div>

<!-- Theme Examples -->
<div class="card">
	<h2>TH02 · Theme Examples</h2>
	<p class="description">Different visual themes using CSS variables.</p>

	<div class="grid-2" style="--grid-min: 480px">
		<!-- Default Theme -->
		<div>
			<h3>Default Theme</h3>
			<div class="tree-container">
				<Tree
					nodes={sampleData}
					idMember="id"
					pathMember="path"
					sortCallback={sortByName}
					isSorted={true}
					expandLevel={3}
					{...getTreeProps()}
				>
					{#snippet nodeTemplate(node: any)}
						<span>{node.data?.icon} {node.data?.name}</span>
					{/snippet}
				</Tree>
			</div>
		</div>

		<!-- Purple Theme -->
		<div class="purple-theme">
			<h3>Purple Theme</h3>
			<div class="tree-container">
				<Tree
					nodes={sampleData}
					idMember="id"
					pathMember="path"
					sortCallback={sortByName}
					isSorted={true}
					expandLevel={3}
					{...getTreeProps()}
				>
					{#snippet nodeTemplate(node: any)}
						<span>{node.data?.icon} {node.data?.name}</span>
					{/snippet}
				</Tree>
			</div>
		</div>

		<!-- Dark Theme (via theme="dark" prop — no CSS overrides needed) -->
		<div class="dark-card">
			<h3>Dark Theme <code>theme="dark"</code></h3>
			<div class="tree-container">
				<Tree
					nodes={sampleData}
					idMember="id"
					pathMember="path"
					sortCallback={sortByName}
					isSorted={true}
					expandLevel={3}
					theme="dark"
					{...getTreeProps()}
				>
					{#snippet nodeTemplate(node: any)}
						<span>{node.data?.icon} {node.data?.name}</span>
					{/snippet}
				</Tree>
			</div>
		</div>

		<!-- Green Theme -->
		<div class="green-theme">
			<h3>Green Theme</h3>
			<div class="tree-container">
				<Tree
					nodes={sampleData}
					idMember="id"
					pathMember="path"
					sortCallback={sortByName}
					isSorted={true}
					expandLevel={3}
					{...getTreeProps()}
				>
					{#snippet nodeTemplate(node: any)}
						<span>{node.data?.icon} {node.data?.name}</span>
					{/snippet}
				</Tree>
			</div>
		</div>
	</div>
</div>

<!-- Selection Styles -->
<div class="card">
	<h2>TH03 · Selection Styles</h2>
	<p class="description">Built-in classes for styling selected nodes.</p>

	<table class="reference-table">
		<thead>
			<tr>
				<th>Class</th>
				<th>Effect</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td><code>stv__node-content--selected-bold</code></td>
				<td>Bold text with primary color</td>
			</tr>
			<tr>
				<td><code>stv__node-content--selected-border</code></td>
				<td>Border with light background</td>
			</tr>
			<tr>
				<td><code>stv__node-content--selected-brackets</code></td>
				<td>Chevron brackets around content</td>
			</tr>
			<tr>
				<td><code>stv__node-content--selected-fill</code></td>
				<td>Explorer-style solid fill background</td>
			</tr>
			<tr>
				<td><code>stv__node-content--selected-glow</code></td>
				<td>Tinted background with a soft primary-colored glow ring</td>
			</tr>
		</tbody>
	</table>

	<div class="code-block">
		<pre>{`<Tree ...>
  {#snippet nodeTemplate(node: any)}
    <span class:stv__node-content--selected-bold={node.isChecked}>
      {node.data?.name}
    </span>
  {/snippet}
</Tree>`}</pre>
	</div>
</div>

<!-- Toggle Icon Live Demo -->
<div class="card">
	<h2>TH04 · Toggle Icon — Live Demo</h2>
	<p class="description">
		Pick the disclosure glyph with ONE knob — <code>iconSet</code>
		(<code>'chevron'</code> · <code>'triangle'</code> · <code>'plus-minus'</code> ·
		<code>'arrow'</code>) — plus <code>toggleIconMode</code>
		(<code>'rotate'</code> or <code>'swap'</code>). <code>iconSet</code> re-points
		the single <code>--stv-icon-*</code> variable set (via
		<code>data-icon-set</code> on <code>.stv__container</code>); it does not switch
		between separate CSS classes.
	</p>

	<div class="grid" style="--grid-min: 260px; --grid-gap: 1.5rem">
		<div>
			<fieldset class="check-list">
				<legend>iconSet</legend>
				{#each iconSetOptions as opt (opt.key)}
					<label>
						<input
							type="radio"
							name="icon-set"
							value={opt.key}
							checked={iconSet === opt.key}
							onchange={() => (iconSet = opt.key)}
						/>
						<span><code>{opt.key}</code> — {opt.label} <small class="muted">{opt.note}</small></span>
					</label>
				{/each}
			</fieldset>

			<fieldset class="check-list">
				<legend>toggleIconMode</legend>
				<label>
					<input
						type="radio"
						name="toggle-mode"
						value="rotate"
						checked={toggleIconMode === 'rotate'}
						onchange={() => (toggleIconMode = 'rotate')}
					/>
					<span><code>rotate</code> — rotate the glyph on expand</span>
				</label>
				<label>
					<input
						type="radio"
						name="toggle-mode"
						value="swap"
						checked={toggleIconMode === 'swap'}
						onchange={() => (toggleIconMode = 'swap')}
					/>
					<span><code>swap</code> — swap to the collapse glyph on expand</span>
				</label>
			</fieldset>

			<fieldset class="check-list">
				<legend>Theme reskin</legend>
				<label>
					<input type="checkbox" bind:checked={brandChevron} />
					<span
						>Override <code>--base-icon-chevron</code>
						<small class="muted">re-skins the chevron set through the shadow of the shared base contract</small></span
					>
				</label>
			</fieldset>
		</div>

		<div class="tree-container" style={toggleDemoStyle}>
			<Tree
				nodes={sampleData}
				idMember="id"
				pathMember="path"
				sortCallback={sortByName}
				isSorted={true}
				expandLevel={3}
				{iconSet}
				{toggleIconMode}
				{...getTreeProps()}
			>
				{#snippet nodeTemplate(node: any)}
					<span>{node.data?.icon} {node.data?.name}</span>
				{/snippet}
			</Tree>
		</div>
	</div>

	<div class="code-block">
		<pre>{`<Tree
  ...
  iconSet="${iconSet}"
  toggleIconMode="${toggleIconMode}"
/>`}</pre>
	</div>

	<p class="muted">
		Tip: <code>rotate</code> suits chevron/arrow/caret sets, where one glyph points
		two ways. <code>plus-minus</code> is inherently a swap set (a rotated +/− is
		meaningless) so it glyph-swaps regardless of <code>toggleIconMode</code>. All
		built-in glyphs are Lucide SVGs rendered via <code>mask-image</code>, so they
		inherit <code>currentColor</code> and chain to <code>--base-icon-*</code> — set
		that token once and every KeenMate component's disclosure glyph follows.
	</p>
</div>

<!-- Icon Set Reference -->
<div class="card">
	<h2>TH05 · Icon Sets</h2>
	<p class="description">
		The <code>iconSet</code> values and the <code>--base-icon-*</code> token each
		re-points the one <code>--stv-icon-expand</code>/<code>--stv-icon-collapse</code>
		set to. Rotation offsets differ because a glyph's native orientation does.
	</p>

	<table class="reference-table">
		<thead>
			<tr>
				<th><code>iconSet</code></th>
				<th>Base token(s)</th>
				<th>Behaviour</th>
				<th>Rotation (collapsed → expanded)</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td><code>chevron</code> (default)</td>
				<td><code>--base-icon-chevron</code></td>
				<td>rotate</td>
				<td><code>0° → 90°</code></td>
			</tr>
			<tr>
				<td><code>triangle</code></td>
				<td><code>--base-icon-caret-down</code></td>
				<td>rotate</td>
				<td><code>-90° → 0°</code></td>
			</tr>
			<tr>
				<td><code>plus-minus</code></td>
				<td><code>--base-icon-expand</code> / <code>--base-icon-collapse</code></td>
				<td>swap (forced)</td>
				<td>—</td>
			</tr>
			<tr>
				<td><code>arrow</code></td>
				<td>Lucide arrow (no base token)</td>
				<td>rotate</td>
				<td><code>0° → 90°</code></td>
			</tr>
		</tbody>
	</table>
</div>

<!-- Drag Over Styles -->
<div class="card">
	<h2>TH06 · Drag-Over Styles</h2>
	<p class="description">Classes applied when dragging nodes over drop targets.</p>

	<table class="reference-table">
		<thead>
			<tr>
				<th>Class</th>
				<th>Description</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td><code>stv__node-content--dragover-highlight</code></td>
				<td>Dashed border with light green background</td>
			</tr>
			<tr>
				<td><code>stv__node-content--dragover-glow</code></td>
				<td>Glowing box-shadow effect</td>
			</tr>
			<tr>
				<td><code>stv__node-content--drag-over</code></td>
				<td>Applied to node content during drag</td>
			</tr>
			<tr>
				<td><code>stv__node-content--drop-valid</code></td>
				<td>Green styling for valid drop target</td>
			</tr>
			<tr>
				<td><code>stv__node-content--drop-invalid</code></td>
				<td>Red styling for invalid drop target</td>
			</tr>
		</tbody>
	</table>

	<div class="code-block">
		<pre>{`/* Customize drag-over appearance */
:global(.stv__node-content--dragover-highlight) {
  background-color: rgba(16, 185, 129, 0.15) !important;
  border: 2px dashed #10b981 !important;
}

:global(.stv__node-content--dragover-glow) {
  box-shadow: 0 0 12px rgba(102, 126, 234, 0.5) !important;
}`}</pre>
	</div>
</div>

<!-- Complete Theme Example -->
<div class="card">
	<h2>TH07 · Complete Theme Example</h2>
	<p class="description">Copy this CSS to create a custom theme.</p>

	<div class="code-block">
		<pre>{`/* Custom Purple Theme — set primary once, tints follow via color-mix() */
.my-custom-theme {
  --stv-accent-color: #667eea;
  --stv-success-color: #10b981;
  --stv-danger-color: #ef4444;
  --stv-elevated-bg: #f3f4f6;
  --stv-border-color: #e5e7eb;
  --stv-text-color-1: #1f2937;
  --stv-indent-size: calc(1.0 * var(--stv-rem));
  --stv-touch-ghost-bg: color-mix(in srgb, #667eea 90%, transparent);
  --stv-touch-ghost-text-color: white;
}

/* Dark mode variant */
.my-dark-theme {
  --stv-accent-color: #818cf8;
  --stv-elevated-bg: #374151;
  --stv-border-color: #4b5563;
  --stv-text-color-1: #f9fafb;
  background-color: #1f2937;
}`}</pre>
	</div>
</div>

<!-- ====== CSS reference (moved below the demos for scannability) ====== -->

<!-- CSS Variables Reference -->
<div class="card">
	<h2>TH08 · CSS Variables Reference</h2>
	<p class="description">
		Override these CSS variables to customize the tree appearance. Each one chains to a
		<code>--base-*</code> token shared across other <code>@keenmate/*</code> web components
		(see "Base token integration" below), then falls back to the listed default. Sized
		values are <code>calc(N × var(--stv-rem))</code> where <code>--stv-rem</code>
		defaults to <code>10px</code> — change it once to scale everything.
	</p>

	<table class="reference-table">
		<thead>
			<tr>
				<th>Variable</th>
				<th>Default</th>
				<th>Description</th>
			</tr>
		</thead>
		<tbody>
			<tr><th colspan="3" scope="colgroup">Base sizing unit</th></tr>
			<tr><td><code>--stv-rem</code></td><td><code>10px</code></td><td>Base unit multiplied into every size/spacing value. Set to <code>12px</code> for 20% scale, or to <code>1rem</code> to follow document font-size.</td></tr>

			<tr><th colspan="3" scope="colgroup">Colors</th></tr>
			<tr><td><code>--stv-accent-color</code></td><td><code>var(--base-primary-color, #3b82f6)</code></td><td>Primary color (selection, highlights). Tints derived via <code>color-mix()</code>.</td></tr>
			<tr><td><code>--stv-success-color</code></td><td><code>var(--base-success-color, #10b981)</code></td><td>Success color (valid drop targets)</td></tr>
			<tr><td><code>--stv-danger-color</code></td><td><code>var(--base-danger-color, #dc2626)</code></td><td>Danger color (invalid drops)</td></tr>
			<tr><td><code>--stv-elevated-bg</code></td><td><code>var(--base-elevated-bg, bg shifted in lightness)</code></td><td>Raised surface (full-label popover)</td></tr>
			<tr><td><code>--stv-border-color</code></td><td><code>var(--base-border-color, #dee2e6)</code></td><td>Border color</td></tr>
			<tr><td><code>--stv-text-color-1</code></td><td><code>var(--base-text-color-1, #212529)</code></td><td>Default text color</td></tr>

			<tr><th colspan="3" scope="colgroup">Typography</th></tr>
			<tr><td><code>--stv-font-family</code></td><td><code>var(--base-font-family, system stack)</code></td><td>Font family for all tree text</td></tr>
			<tr><td><code>--stv-font-size</code></td><td><code>(--base-font-size-sm, 1.4) × rem</code> (= 14px)</td><td>Node text size</td></tr>
			<tr><td><code>--stv-node-icon-margin-right</code></td><td><code>0.6 × rem</code> (= 6px)</td><td>Gap between node icon and label</td></tr>
			<tr><td><code>--stv-node-path-font-size</code></td><td><code>(--base-font-size-xs, 1.2) × rem</code> (= 12px)</td><td>Path / debug text size</td></tr>
			<tr><td><code>--stv-node-path-color</code></td><td><code>var(--base-text-color-3, #6c757d)</code></td><td>Path / muted text color</td></tr>

			<tr><th colspan="3" scope="colgroup">Node layout</th></tr>
			<tr><td><code>--stv-indent-size</code></td><td><code>0.8 × rem</code> (= 8px)</td><td>Indentation per nesting level</td></tr>
			<tr><td><code>--stv-node-padding</code></td><td><code>0.4 × rem / 0.4 × rem</code> (= 4px 4px)</td><td>Inner padding of a node row (V / H)</td></tr>
			<tr><td><code>--stv-node-border-radius</code></td><td><code>= --stv-border-radius-sm</code> (4px)</td><td>Node row corner rounding</td></tr>
			<tr><td><code>--stv-node-bg-hover</code> / <code>--stv-node-bg-active</code></td><td><code>= --stv-hover-bg / --stv-active-bg</code></td><td>Row hover / pressed background (neutral overlays of the surface)</td></tr>
			<tr><td><code>--stv-children-margin-top</code></td><td><code>0.2 × rem</code> (= 2px)</td><td>Top margin of child list</td></tr>

			<tr><th colspan="3" scope="colgroup">Toggle icon</th></tr>
			<tr><td><code>--stv-toggle-icon-size</code></td><td><code>1.6 × rem</code> (= 16px)</td><td>SVG icon size (chevron / +/- / arrow / leaf)</td></tr>
			<tr><td><code>--stv-toggle-icon-width</code></td><td><code>2.0 × rem</code> (= 20px)</td><td>Width reserved for the toggle column</td></tr>
			<tr><td><code>--stv-toggle-icon-color</code></td><td><code>var(--base-text-color-3, #6c757d)</code></td><td>Icon color (via <code>currentColor</code> mask)</td></tr>
			<tr><td><code>--stv-toggle-icon-margin-right</code></td><td><code>0.8 × rem</code> (= 8px)</td><td>Gap between toggle and node label</td></tr>
			<tr><td><code>--stv-toggle-icon-transition</code></td><td><code>transform var(--stv-transition-normal) var(--stv-ease-standard)</code></td><td>Expand / collapse turn of the glyph</td></tr>
			<tr><td><code>--stv-icon-expand</code></td><td><code>var(--base-icon-chevron, …)</code></td><td>Disclosure glyph (collapsed / rotate mode). Re-pointed by <code>iconSet</code>.</td></tr>
			<tr><td><code>--stv-icon-collapse</code></td><td>Lucide chevron-down</td><td>Glyph shown expanded — only in swap / plus-minus</td></tr>
			<tr><td><code>--stv-icon-leaf</code></td><td>dot</td><td>Optional leaf marker (disabled by default)</td></tr>
			<tr><td><code>--stv-icon-rotate-collapsed</code></td><td><code>0deg</code></td><td>Glyph rotation when collapsed (per icon-set)</td></tr>
			<tr><td><code>--stv-icon-rotate-expanded</code></td><td><code>90deg</code></td><td>Glyph rotation when expanded (per icon-set)</td></tr>
			<tr><td><code>--stv-icon-size-glyph</code></td><td><code>1em</code></td><td>Mask box for the disclosure glyph</td></tr>

			<tr><th colspan="3" scope="colgroup">Checkbox</th></tr>
			<tr><td><code>--stv-checkbox-size</code></td><td><code>1.5 × rem</code> (= 15px)</td><td>Checkbox square dimension</td></tr>
			<tr><td><code>--stv-checkbox-border-width</code></td><td><code>1.5px</code></td><td>Border thickness (hairline, does not scale)</td></tr>
			<tr><td><code>--stv-checkbox-border-color</code></td><td><code>var(--base-border-color, #adb5bd)</code></td><td>Unchecked border</td></tr>
			<tr><td><code>--stv-checkbox-border-radius</code></td><td><code>(--base-border-radius-sm, 0.3) × rem</code> (= 3px)</td><td>Corner rounding</td></tr>
			<tr><td><code>--stv-checkbox-bg</code></td><td><code>var(--base-input-bg, #fff)</code></td><td>Unchecked background</td></tr>
			<tr><td><code>--stv-checkbox-checked-bg</code></td><td><code>var(--stv-accent-color)</code></td><td>Checked / indeterminate background</td></tr>
			<tr><td><code>--stv-checkbox-checked-border-color</code></td><td><code>var(--stv-accent-color)</code></td><td>Checked / indeterminate border</td></tr>
			<tr><td><code>--stv-checkbox-checkmark-color</code></td><td><code>var(--base-on-primary-text-color, #fff)</code></td><td>Tick / dash color</td></tr>
			<tr><td><code>--stv-checkbox-focus-ring-width</code></td><td><code>2px</code></td><td>Focus-visible ring thickness</td></tr>
			<tr><td><code>--stv-checkbox-focus-ring-color</code></td><td><code>color-mix(primary 25%, transparent)</code></td><td>Focus-visible ring color</td></tr>
			<tr><td><code>--stv-checkbox-focus-box-shadow</code></td><td><code>0 0 0 [ring-width] [ring-color]</code></td><td>Composed box-shadow; override directly for full control, or tune the two parts above</td></tr>

			<tr><th colspan="3" scope="colgroup">Selection &amp; highlight states</th></tr>
			<tr><td><code>--stv-selected-fill-bg</code></td><td><code>#cce8ff</code></td><td>Explorer-style highlight background</td></tr>
			<tr><td><code>--stv-selected-fill-text-color</code></td><td><code>inherit</code></td><td>Highlight text color</td></tr>
			<tr><td><code>--stv-selected-bg</code></td><td><code>var(--base-selected-bg) → primary 10%</code></td><td>Default highlight tint (multi-select)</td></tr>
			<tr><td><code>--stv-selected-preset-ring-color</code></td><td><code>color-mix(primary 45%, transparent)</code></td><td>Hairline ring of the border / glow presets</td></tr>
			<tr><td><code>--stv-selected-bg-hover</code> / <code>-color</code> / <code>-border</code></td><td><code>var(--base-selected-bg-hover / -text / -ring)</code></td><td>Highlighted row on hover, its text color, optional ring (outline shorthand)</td></tr>
			<tr><td><code>--stv-focused-outline</code></td><td><code>var(--base-focused-outline) → 1px solid primary</code></td><td>Default focus ring, drawn inset (<code>none</code> hides it)</td></tr>
			<tr><td><code>--stv-focused-bg</code> / <code>-color</code></td><td><code>var(--base-focused-bg / -text)</code></td><td>Focused row background (transparent) and text color</td></tr>
			<tr><td><code>--stv-checkbox-gap</code></td><td><code>calc(0.6 * rem)</code></td><td>Space between checkbox and node row</td></tr>

			<tr><th colspan="3" scope="colgroup">Drag / drop states</th></tr>
			<tr><td><code>--stv-drag-over-bg</code></td><td><code>var(--base-drop-target-bg, var(--stv-drop-valid-bg))</code></td><td>Drag-over background tint (a valid drop target)</td></tr>
			<tr><td><code>--stv-drag-over-box-shadow</code></td><td><code>0 0 8px color-mix(drop-target border color 40%, transparent)</code></td><td>Drag-over glow shadow</td></tr>
			<tr><td><code>--stv-drop-placeholder-bg</code></td><td><code>var(--stv-drag-over-bg)</code></td><td>Empty-tree placeholder background</td></tr>
			<tr><td><code>--stv-drop-placeholder-color</code></td><td><code>var(--base-drop-target-border-color, var(--stv-success-color))</code></td><td>Placeholder text color</td></tr>
			<tr><td><code>--stv-drop-placeholder-border-radius</code></td><td><code>0.8 × rem</code> (= 8px)</td><td>Placeholder corner rounding</td></tr>
			<tr><td><code>--stv-drop-placeholder-min-height</code></td><td><code>6.0 × rem</code> (= 60px)</td><td>Placeholder min height</td></tr>
			<tr><td><code>--stv-touch-ghost-bg</code></td><td><code>rgba(59, 130, 246, 0.9)</code></td><td>Touch drag ghost background</td></tr>
			<tr><td><code>--stv-touch-ghost-text-color</code></td><td><code>#fff</code></td><td>Touch drag ghost text color</td></tr>

			<tr><th colspan="3" scope="colgroup">Drop zones (pastel mode)</th></tr>
			<tr><td><code>--stv-drop-zone-border-radius</code></td><td><code>0</code></td><td>Drop zone corner rounding</td></tr>
			<tr><td><code>--stv-drop-zone-[before|after|child]-bg</code></td><td><code>rgba sage / coral / lavender</code></td><td>Per-zone resting background</td></tr>
			<tr><td><code>--stv-drop-zone-[before|after|child]-text-color</code></td><td><code>matching dark variants</code></td><td>Per-zone resting text color</td></tr>
			<tr><td><code>--stv-drop-zone-[before|after|child]-bg-active</code></td><td><code>~85% opacity variants</code></td><td>Active zone background</td></tr>
			<tr><td><code>--stv-drop-zone-[before|after|child]-text-color-active</code></td><td><code>~darker variants</code></td><td>Active zone text color</td></tr>
			<tr><td><code>--stv-drop-zone-[before|after|child]-box-shadow-active</code></td><td><code>0 2px 12px (color, 0.4)</code></td><td>Active zone shadow</td></tr>

			<tr><th colspan="3" scope="colgroup">Drop zones (glow mode)</th></tr>
			<tr><td><code>--stv-drop-glow-[before|after|child]-color</code></td><td><code>0.8-alpha pastel variants</code></td><td>Glow border color per zone</td></tr>
			<tr><td><code>--stv-drop-glow-child-bg</code></td><td><code>color-mix(drop-glow-child-color 19%, transparent)</code></td><td>Glow child zone background tint</td></tr>
			<tr><td><code>--stv-drop-glow-size</code></td><td><code>3px</code></td><td>Glow border thickness (hairline, does not scale)</td></tr>
			<tr><td><code>--stv-drop-arrow-size</code></td><td><code>2.4 × rem</code> (= 24px)</td><td>Direction arrow size</td></tr>
			<tr><td><code>--stv-drop-arrow-position</code></td><td><code>66%</code></td><td>Horizontal arrow position</td></tr>
			<tr><td><code>--stv-drop-arrow-[before|after|child]-rotation</code></td><td><code>0 / 0 / 45deg</code></td><td>Arrow rotation per zone</td></tr>

			<tr><th colspan="3" scope="colgroup">Context menu</th></tr>
			<tr><td><code>--stv-context-menu-bg</code></td><td><code>var(--base-dropdown-bg, #fff)</code></td><td>Menu background</td></tr>
			<tr><td><code>--stv-context-menu-border</code></td><td><code>var(--base-dropdown-border, 1px solid border-color)</code></td><td>Menu border shorthand</td></tr>
			<tr><td><code>--stv-context-menu-border-radius</code></td><td><code>(--base-border-radius-sm, 0.4) × rem</code> (= 4px)</td><td>Menu rounding</td></tr>
			<tr><td><code>--stv-context-menu-box-shadow</code></td><td><code>var(--base-dropdown-box-shadow, …)</code></td><td>Menu drop shadow</td></tr>
			<tr><td><code>--stv-context-menu-min-width</code></td><td><code>15 × rem</code> (= 150px)</td><td>Menu minimum width</td></tr>
			<tr><td><code>--stv-context-menu-padding</code></td><td><code>0.4 × rem / 0</code></td><td>Menu inner padding</td></tr>
			<tr><td><code>--stv-context-menu-item-padding</code></td><td><code>0.8 × rem / 1.6 × rem</code> (= 8px 16px)</td><td>Item padding</td></tr>
			<tr><td><code>--stv-context-menu-font-size</code></td><td><code>(--base-font-size-sm, 1.4) × rem</code> (= 14px)</td><td>Item font size</td></tr>
			<tr><td><code>--stv-context-menu-text-color</code></td><td><code>var(--stv-text-color-1)</code></td><td>Item color</td></tr>
			<tr><td><code>--stv-context-menu-bg-hover</code></td><td><code>var(--stv-elevated-bg)</code></td><td>Item hover background</td></tr>
			<tr><td><code>--stv-context-menu-icon-width</code></td><td><code>1.6 × rem</code> (= 16px)</td><td>Icon column width</td></tr>
			<tr><td><code>--stv-context-menu-icon-font-size</code></td><td><code>(--base-font-size-xs, 1.2) × rem</code> (= 12px)</td><td>Icon font size</td></tr>
			<tr><td><code>--stv-context-menu-shortcut-color</code></td><td><code>var(--base-text-color-4, #9ca3af)</code></td><td>Shortcut hint color</td></tr>
			<tr><td><code>--stv-context-menu-shortcut-font-size</code></td><td><code>(--base-font-size-xs, 1.2) × rem</code> (= 12px)</td><td>Shortcut hint size</td></tr>
			<tr><td><code>--stv-context-menu-divider-color</code></td><td><code>var(--stv-border-color)</code></td><td>Divider line color</td></tr>
			<tr><td><code>--stv-context-menu-divider-label-color</code></td><td><code>var(--base-text-color-4, #9ca3af)</code></td><td>Named divider label color</td></tr>

			<tr><td><code>--stv-context-menu-danger-color</code> / <code>-danger-bg-hover</code></td><td><code>= --stv-danger-text-color / danger tint</code></td><td>Danger item text / hover background</td></tr>
			<tr><td><code>--stv-context-menu-toggled-color</code></td><td><code>= --stv-accent-color</code></td><td>Toggled item color</td></tr>
			<tr><td><code>--stv-context-menu-text-color-hover</code></td><td><code>unset</code></td><td>Item text color on hover</td></tr>
			<tr><td><code>--stv-context-menu-disabled-opacity</code></td><td><code>= --stv-disabled-opacity</code> (0.65)</td><td>Disabled item opacity</td></tr>
			<tr><td><code>--stv-context-menu-z-index</code></td><td><code>= --stv-z-index-dropdown</code> (7500)</td><td>Menu stacking order</td></tr>

			<tr><th colspan="3" scope="colgroup">Motion — the contract's four speeds; motion off = <code>0s</code>; <code>prefers-reduced-motion</code> → 0s</th></tr>
			<tr><td><code>--stv-transition-fast</code> / <code>-normal</code> / <code>-medium</code> / <code>-slow</code></td><td><code>var(--base-duration-*, 0.1s / 0.15s / 0.25s / 0.3s)</code></td><td>Every transition / animation duration (toggle, hover, tooltip, drop zones: normal; drag-denied tint: slow)</td></tr>
			<tr><td><code>--stv-ease-standard</code> / <code>-out</code> / <code>-in</code></td><td><code>var(--base-ease-*)</code></td><td>Easings</td></tr>
			<tr><td><code>--stv-spinner-duration</code></td><td><code>0.8s</code></td><td>One turn of the loading spinners (keeps turning under reduced motion)</td></tr>
			<tr><td><code>--stv-disabled-opacity</code></td><td><code>var(--base-disabled-opacity, 0.65)</code></td><td>Disabled dimming (checkbox, menu item)</td></tr>

			<tr><th colspan="3" scope="colgroup">Loading + spinner</th></tr>
			<tr><td><code>--stv-loading-bg</code></td><td><code>rgba(255, 255, 255, 0.8)</code></td><td>Loading overlay background</td></tr>
			<tr><td><code>--stv-loading-color</code></td><td><code>var(--base-text-color-3, #718096)</code></td><td>"Loading more..." text color</td></tr>
			<tr><td><code>--stv-spinner-size</code></td><td><code>3.2 × rem</code> (= 32px)</td><td>Spinner diameter</td></tr>
			<tr><td><code>--stv-spinner-track</code></td><td><code>var(--base-border-color, #e2e8f0)</code></td><td>Spinner track (background ring)</td></tr>
			<tr><td><code>--stv-spinner-color</code></td><td><code>var(--stv-accent-color)</code></td><td>Spinner active color</td></tr>

			<tr><th colspan="3" scope="colgroup">Scroll highlight (after <code>scrollToPath</code>)</th></tr>
			<tr><td><code>--stv-scroll-highlight-bg</code></td><td><code>color-mix(primary 30%, transparent)</code></td><td>Highlight background</td></tr>
			<tr><td><code>--stv-scroll-highlight-box-shadow</code></td><td><code>0 0 0.5em color-mix(primary 40%, transparent)</code></td><td>Highlight glow</td></tr>
			<tr><td><code>--stv-scroll-highlight-arrow-color</code></td><td><code>var(--stv-danger-color)</code></td><td>Arrow icon color</td></tr>
		</tbody>
	</table>

	<div class="code-block">
		<pre>{`/* Override individual variables — tints follow automatically */
.my-tree {
  --stv-accent-color: #667eea;   /* hover/dragover/multi-select tints
                                  derived via color-mix() */
  --stv-success-color: #10b981;
  --stv-danger-color: #ef4444;
}

/* Scale everything proportionally with one knob */
.my-bigger-tree {
  --stv-rem: 12px;   /* 20% larger — all dimensions follow */
}

/* Or scale with document font-size (Pure Admin pattern) */
.my-tree {
  --stv-rem: 1rem;   /* now respects html { font-size: ... } */
}`}</pre>
	</div>
</div>

<!-- Base token integration -->
<div class="card">
	<h2>TH09 · Base token integration (<code>--base-*</code>)</h2>
	<p class="description">
		If you're using svelte-treeview alongside other <code>@keenmate/*</code> components
		(<code>web-multiselect</code>, <code>web-daterangepicker</code>, etc.), set the shared
		<code>--base-*</code> tokens once at <code>:root</code> and every component picks them
		up automatically. Each <code>--stv-*</code> variable resolves to
		<code>--base-{`{token}`}</code> first, then to its hardcoded default.
	</p>

	<div class="code-block">
		<pre>{`/* One theme, every KM component.
   --base-font-size-* and --base-border-radius-* are UNITLESS multipliers
   that the component multiplies by its own --*-rem unit. */
:root {
  /* Colors — direct values; tints derived via color-mix() */
  --base-primary-color: #10b981;
  --base-text-color-1: #111827;
  --base-text-color-3: #6b7280;
  --base-text-color-4: #9ca3af;
  --base-border-color: #e5e7eb;
  --base-hover-bg: #f3f4f6;
  --base-dropdown-bg: #ffffff;

  /* Typography — unitless multipliers (× --stv-rem) */
  --base-font-family: 'Inter', system-ui, sans-serif;
  --base-font-size-xs: 1.2;       /* 12px at default --stv-rem: 10px */
  --base-font-size-sm: 1.4;       /* 14px */
  --base-font-weight-medium: 500;

  /* Radii — unitless multipliers (× --stv-rem) */
  --base-border-radius-sm: 0.4;   /* 4px */
}`}</pre>
	</div>

	<p class="muted">
		<code>--stv-*</code> overrides on the tree element itself take precedence over
		<code>--base-*</code> tokens, so you can still tweak a single tree without affecting the
		global theme.
	</p>
</div>

<!-- Dynamic Theme Switching — ported from web-daterangepicker -->
<div class="card">
	<h2>TH10 · Dynamic Theme Switching</h2>
	<p class="description">
		Change themes at runtime with JavaScript. The brand buttons swap a class
		on the wrapper (which re-tints the tree via <code>--base-*</code>); the
		light / dark / inherit buttons drive the per-instance <code>theme</code>
		prop on <code>&lt;Tree&gt;</code>.
	</p>

	<div
		class={['playground-wrapper', `brand-${dynamicBrand}`]}
	>
		<div class="tree-container playground-tree">
			<Tree
				nodes={sampleData}
				idMember="id"
				pathMember="path"
				sortCallback={sortByName}
				isSorted={true}
				expandLevel={3}
				theme={dynamicTreeTheme}
				selectionMode="multiple"
				bind:selectedPaths={dynamicHighlight}
				{...getTreeProps()}
			>
				{#snippet nodeTemplate(node: any)}
					<span>{node.data?.icon} {node.data?.name}</span>
				{/snippet}
			</Tree>
		</div>
	</div>

	<div class="controls mt-1" aria-label="Brand theme">
		<button
			type="button"
			class="theme-btn theme-btn--default"
			class:is-active={dynamicBrand === 'default'}
			onclick={() => (dynamicBrand = 'default')}
		>Default</button>
		<button
			type="button"
			class="theme-btn theme-btn--material"
			class:is-active={dynamicBrand === 'material'}
			onclick={() => (dynamicBrand = 'material')}
		>Material</button>
		<button
			type="button"
			class="theme-btn theme-btn--neon"
			class:is-active={dynamicBrand === 'neon'}
			onclick={() => (dynamicBrand = 'neon')}
		>Neon</button>
		<button
			type="button"
			class="theme-btn theme-btn--sharp"
			class:is-active={dynamicBrand === 'sharp'}
			onclick={() => (dynamicBrand = 'sharp')}
		>Sharp</button>
		<button
			type="button"
			class="theme-btn theme-btn--soft"
			class:is-active={dynamicBrand === 'soft'}
			onclick={() => (dynamicBrand = 'soft')}
		>Soft</button>
		<button
			type="button"
			class="theme-btn theme-btn--forest"
			class:is-active={dynamicBrand === 'forest'}
			onclick={() => (dynamicBrand = 'forest')}
		>Forest</button>
		<button
			type="button"
			class="theme-btn theme-btn--glass"
			class:is-active={dynamicBrand === 'glass'}
			onclick={() => (dynamicBrand = 'glass')}
		>Glass</button>
	</div>

	<div class="controls" aria-label="Color scheme">
		<button
			type="button"
			class={dynamicMode === 'inherit' ? '' : 'btn-outline'}
			onclick={() => (dynamicMode = 'inherit')}
		>Inherit</button>
		<button
			type="button"
			class={dynamicMode === 'light' ? '' : 'btn-outline'}
			onclick={() => (dynamicMode = 'light')}
		>Light</button>
		<button
			type="button"
			class={dynamicMode === 'dark' ? '' : 'btn-outline'}
			onclick={() => (dynamicMode = 'dark')}
		>Dark</button>
	</div>

	<div class="code-block">
		<pre>{`// Brand theme: a class on the wrapper that sets --base-* tokens
wrapper.className = 'brand-${dynamicBrand}';

// Color scheme: forwarded to the inner Tree as data-theme
<Tree theme={${dynamicMode === 'inherit' ? 'undefined' : `'${dynamicMode}'`}} ... />`}</pre>
	</div>
</div>


<style>
	/* Page chrome comes from the devkit kit (cards, fieldsets/.check-list, .note, .grid,
	   .reference-table, buttons) and --kmwc-* tokens. What remains here is the DEMO itself:
	   the theme scopes the trees sit in. */

	/* kmwc-fixed-colors: TH02 sample themes — the literal accent IS the demo. Each sets
	   --base-primary-color on the wrapper; the tree's .stv__container re-substitutes
	   --stv-accent-color on its own scope and every primary-derived tint follows via color-mix(). */
	.purple-theme {
		--base-primary-color: #667eea;
	}
	.green-theme {
		--base-primary-color: #10b981;
	}

	/* TH02 dark card — the tree flips via theme="dark"; the card forces a dark color-scheme so
	   its kit tokens (surface, heading, code chip, tree frame) resolve to their dark branch
	   whatever the page theme is. */
	.dark-card {
		color-scheme: dark;
		background: var(--kmwc-page-bg);
		color: var(--kmwc-text-color-1);
		padding: 1rem;
		border-radius: var(--kmwc-radius-md);
	}

	/* The control fieldsets are .check-list grids stretched to a common height by the
	   .card-grid row — keep their options packed at the top. */
	.playground-controls fieldset {
		align-content: start;
		margin: 0;
	}

	/* =========================================================================
	   DARK MODE PLAYGROUND (TH01) + DYNAMIC SWITCHING (TH10)
	   =========================================================================
	   The tree's scheme comes from the core theme context (data-context-theme, written by
	   Tree from the page / themeSource="closest" signal) or its own `theme`. Every surface is
	   a light-dark() pair, so the WRAPPER only has to follow the same scheme:
	     per-instance theme (:has(.stv__container[data-theme])) > the tree's detected context
	       (:has([data-context-theme])) > wrapper signal attr/class > the scope's color-scheme
	       (radio 1; else inherited from the page). */

	/* Default surfaces = the kit's page / main tokens, resolved in the wrapper's scheme. */
	.playground-wrapper {
		padding: 1rem;
		border-radius: var(--kmwc-radius-md);
		background: var(--kmwc-page-bg);
		transition: background 0.15s ease;
	}

	/* Signal #2 — framework theme class/attr on the wrapper itself. */
	:global(.playground-wrapper:is([data-theme='dark'], [data-bs-theme='dark'], .dark)) {
		color-scheme: dark;
	}
	:global(.playground-wrapper[data-theme='light']) {
		color-scheme: light;
	}
	/* Signal #3 — per-instance theme on the inner tree (the Tree forwards `theme` as
	   data-theme on its .stv__container); :has() lets the wrapper follow it without JS.
	   (0,3,0) beats the wrapper-attr rules above, so per-instance wins. :global() so
	   Svelte's scoper doesn't prune the runtime-only selectors. */
	:global(.playground-wrapper:has(.stv__container[data-theme='dark'])) {
		color-scheme: dark;
	}
	:global(.playground-wrapper:has(.stv__container[data-theme='light'])) {
		color-scheme: light;
	}

	/* The wrapper follows the tree's detected theme context too (data-context-theme — the page
	   signal, or the wrapper's own via themeSource="closest"), so brand surfaces match the tree. */
	:global(.playground-wrapper:has(.stv__container[data-context-theme='dark']:not([data-theme]))) {
		color-scheme: dark;
	}
	:global(.playground-wrapper:has(.stv__container[data-context-theme='light']:not([data-theme]))) {
		color-scheme: light;
	}

	/* The library never paints a background on .stv__container — the demo frame does. The
	   border uses the tree accent so the active brand theme is visible at rest, and the
	   multi-select tint is bumped so the pre-highlighted "Work" node reads on any surface. */
	.playground-tree {
		border-radius: var(--kmwc-radius-sm);
		padding: 0.5rem;
		margin-bottom: 0;
		border: 2px solid var(--stv-accent-color);
		transition: background 0.15s ease;
		--stv-selected-bg: color-mix(in srgb, var(--stv-accent-color) 18%, transparent);
	}

	/* === BRAND THEMES ===
	   Each theme sets --base-* tokens on the wrapper; the library declares its --stv-*
	   variables on .stv__container (a descendant), so the overrides flow in by inheritance.
	   Modeled on web-multiselect's examples-theming.html — full visual identities, not just
	   an accent swap. Light/dark pairs are light-dark() (gradient stops and shadow colours
	   included), resolved in whatever scheme the signals above gave the wrapper.
	   :global() keeps the selectors plain (no scope hash inflating specificity). */

	/* kmwc-fixed-colors: brand themes — each palette IS the demo (Material / Neon / Sharp /
	   Soft / Forest / Glass identities), deliberately independent of the page tokens. */

	/* === Material — soft shadows, calm blue accent; dark = deep indigo. */
	:global(.playground-wrapper.brand-material) {
		--base-primary-color: light-dark(#1976d2, #64b5f6);
		--base-border-radius-sm: 0.4;
		--base-text-color-1: light-dark(#212121, #e3f2fd);
		--base-text-color-3: light-dark(#757575, #90caf9);
		--base-border-color: light-dark(#e0e0e0, #3949ab);
		--base-hover-bg: light-dark(#f5f5f5, #283593);
		--base-main-bg: light-dark(#ffffff, #1a237e);
		--base-elevated-bg: light-dark(oklch(from #ffffff calc(l - 0.03) c h), #283593);
		--base-input-bg: light-dark(#ffffff, #1a237e);
		/* Custom glyph + rotation RE-MAP: Material's indicator is a PRE-ORIENTED down-caret
		   (arrow_drop_down), so hand the toggle a down-caret and re-map the rotation tokens. */
		--base-icon-chevron: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='black'><path d='M18 9c.852 0 1.297 .986 .783 1.623l-.076 .084l-6 6a1 1 0 0 1 -1.32 .083l-.094 -.083l-6 -6l-.083 -.094l-.054 -.077l-.054 -.096l-.017 -.036l-.027 -.067l-.032 -.108l-.01 -.053l-.01 -.06l-.004 -.057v-.118l.005 -.058l.009 -.06l.01 -.052l.032 -.108l.027 -.067l.07 -.132l.065 -.09l.073 -.081l.094 -.083l.077 -.054l.096 -.054l.036 -.017l.067 -.027l.108 -.032l.053 -.01l.06 -.01l.057 -.004l12.059 -.002z'/></svg>");
		background: linear-gradient(135deg, light-dark(#e3f2fd, #0d1654) 0%, light-dark(#f3e5f5, #1a237e) 100%);
	}
	/* The rotation re-map must target .stv__container DIRECTLY: it declares its own
	   --stv-icon-rotate-* defaults, which beat a value inherited from the wrapper. */
	:global(.playground-wrapper.brand-material .stv__container) {
		--stv-icon-rotate-collapsed: -90deg;
		--stv-icon-rotate-expanded: 0deg;
	}
	:global(.playground-wrapper.brand-material .playground-tree) {
		background: light-dark(#ffffff, #1a1a1a);
		border: 1px solid transparent;
		box-shadow: 0 4px 16px light-dark(rgba(25, 118, 210, 0.12), rgba(100, 181, 246, 0.18));
	}

	/* === Neon — cyberpunk: deep purple-black, magenta + cyan glow. Intrinsically dark. */
	:global(.playground-wrapper.brand-neon) {
		--base-primary-color: #ff00ff;
		--base-main-bg: #1a0a1a;
		--base-elevated-bg: #2a1a2a;
		--base-input-bg: #1a0a1a;
		--base-text-color-1: #00ffff;
		--base-text-color-3: #ff8aff;
		--base-text-color-4: #cc99cc;
		--base-border-color: #ff00ff;
		/* Double-chevron disclosure glyph to match the neon energy. */
		--base-icon-chevron: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m6 17 5-5-5-5'/><path d='m13 17 5-5-5-5'/></svg>");
		background: #0a0a0a;
		background-image: linear-gradient(45deg, rgba(255, 0, 255, 0.1), rgba(0, 255, 255, 0.08));
	}
	:global(.playground-wrapper.brand-neon .playground-tree) {
		background: transparent;
		border: 1px solid #ff00ff;
		box-shadow: 0 0 24px rgba(255, 0, 255, 0.3), 0 0 8px rgba(0, 255, 255, 0.2);
	}

	/* === Sharp — brutalist: square corners, thick borders, hard offset shadow.
	   Light: black-on-white. Dark: white-on-black (same DNA, opposite ink). */
	:global(.playground-wrapper.brand-sharp) {
		--base-primary-color: light-dark(#000000, #ffffff);
		--base-text-color-1: light-dark(#000000, #ffffff);
		--base-text-color-3: light-dark(#333333, #cccccc);
		--base-border-color: light-dark(#000000, #ffffff);
		--base-main-bg: light-dark(#ffffff, #000000);
		--base-elevated-bg: light-dark(oklch(from #ffffff calc(l - 0.03) c h), #000000);
		--base-input-bg: light-dark(#ffffff, #000000);
		--base-border-radius-sm: 0;
		--base-font-weight-medium: 700;
		/* Hard geometric filled square-chevron for the brutalist look. */
		--base-icon-chevron: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='black'><path d='M19 2a3 3 0 0 1 3 3v14a3 3 0 0 1 -3 3h-14a3 3 0 0 1 -3 -3v-14a3 3 0 0 1 3 -3zm-10.387 6.21a1 1 0 0 0 -1.32 .083l-.083 .094a1 1 0 0 0 .083 1.32l2.292 2.293l-2.292 2.293l-.083 .094a1 1 0 0 0 1.497 1.32l3 -3l.083 -.094a1 1 0 0 0 -.083 -1.32l-3 -3zm5 0a1 1 0 0 0 -1.32 .083l-.083 .094a1 1 0 0 0 .083 1.32l2.292 2.293l-2.292 2.293l-.083 .094a1 1 0 0 0 1.497 1.32l3 -3l.083 -.094a1 1 0 0 0 -.083 -1.32l-3 -3z'/></svg>");
		background: light-dark(#ffffff, #000000);
		border: 2px solid light-dark(#000000, #ffffff);
		border-radius: 0;
		box-shadow: 6px 6px 0 0 light-dark(#000000, #ffffff);
	}
	:global(.playground-wrapper.brand-sharp .playground-tree) {
		background: light-dark(#ffffff, #1a1a1a);
		border: 2px solid light-dark(#000000, #ffffff);
		border-radius: 0;
	}

	/* === Soft — extra-rounded, warm. Light: peach + apricot, pink accent.
	   Dark: deep wine/burgundy, dusty rose accent. */
	:global(.playground-wrapper.brand-soft) {
		--base-primary-color: light-dark(#ff6b9d, #e88aa8);
		--base-text-color-1: light-dark(#5a3e36, #f5d4dc);
		--base-text-color-3: light-dark(#8a6f6a, #c8a0ad);
		--base-border-color: light-dark(#f0d0c0, #5a3a45);
		--base-hover-bg: light-dark(#fff5f0, #3d2530);
		--base-main-bg: light-dark(#ffffff, #2c1820);
		--base-elevated-bg: light-dark(oklch(from #ffffff calc(l - 0.03) c h), #3d2530);
		--base-input-bg: light-dark(#ffffff, #2c1820);
		--base-border-radius-sm: 1.2;
		/* Soft circle-chevron to match the extra-rounded pill shapes. */
		--base-icon-chevron: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'/><path d='m10 8 4 4-4 4'/></svg>");
		background: linear-gradient(135deg, light-dark(#ffecd2, #1a0f15) 0%, light-dark(#fcb69f, #3a2530) 100%);
		border-radius: 20px;
	}
	:global(.playground-wrapper.brand-soft .playground-tree) {
		background: light-dark(#ffffff, #1a1a1a);
		border: 1px solid light-dark(#ffc0dd, #5a3a45);
		border-radius: 16px;
		box-shadow: 0 8px 24px light-dark(rgba(252, 182, 159, 0.3), rgba(232, 138, 168, 0.25));
	}

	/* === Forest — earth tones. Light: warm cream, deep forest text. Dark: deep forest, pale mint. */
	:global(.playground-wrapper.brand-forest) {
		--base-primary-color: light-dark(#2d6a4f, #74c69d);
		--base-main-bg: light-dark(#f0ebe0, #1b2e23);
		--base-elevated-bg: light-dark(#e8e1d0, #2d4a3a);
		--base-text-color-1: light-dark(#1b4332, #d8f3dc);
		--base-text-color-3: light-dark(#4a7c5e, #95d5b2);
		--base-text-color-4: light-dark(#6a9b80, #6f9a82);
		--base-border-color: light-dark(#c9b896, #2d4a3a);
		--base-input-bg: light-dark(#f0ebe0, #1b2e23);
		--base-hover-bg: light-dark(#e0d8c4, #243d2e);
		--base-border-radius-sm: 0.6;
		background: linear-gradient(135deg, light-dark(#f5f0e8, #0d1f15) 0%, light-dark(#d9d0b8, #1b2e23) 100%);
		border-radius: 10px;
	}
	:global(.playground-wrapper.brand-forest .playground-tree) {
		background: transparent;
		border: 1px solid light-dark(#c9b896, #2d4a3a);
		/* Light and dark glows differ in blur too — one shadow per scheme, the other transparent. */
		box-shadow:
			0 4px 16px light-dark(rgba(45, 106, 79, 0.15), transparent),
			0 4px 24px light-dark(transparent, rgba(116, 198, 157, 0.2));
	}

	/* === Glass — translucent, frosted. Light: purple→violet; dark: deep midnight. */
	:global(.playground-wrapper.brand-glass) {
		--base-primary-color: #ffffff;
		--base-main-bg: rgba(255, 255, 255, 0.15);
		--base-elevated-bg: rgba(255, 255, 255, 0.2);
		--base-input-bg: rgba(255, 255, 255, 0.15);
		--base-text-color-1: #ffffff;
		--base-text-color-3: rgba(255, 255, 255, 0.75);
		--base-text-color-4: rgba(255, 255, 255, 0.55);
		--base-border-color: rgba(255, 255, 255, 0.4);
		--base-hover-bg: rgba(255, 255, 255, 0.25);
		--base-border-radius-sm: 1.2;
		background: linear-gradient(135deg, light-dark(#667eea, #1a1f4d) 0%, light-dark(#764ba2, #2d1b4d) 100%);
		border-radius: 16px;
	}
	:global(.playground-wrapper.brand-glass .playground-tree) {
		background: rgba(255, 255, 255, 0.12);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 14px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
	}

	/* === TH10 brand buttons — each renders in the accent of the theme it switches to, so the
	   row reads as a palette; the kit button supplies size/shape, .is-active a ring. */
	.theme-btn.is-active {
		outline: 2px solid var(--kmwc-text-color-1);
		outline-offset: 2px;
	}
	/* kmwc-fixed-colors: the palette swatches mirror each brand theme's literal accent. */
	.theme-btn {
		color: #ffffff;
	}
	.theme-btn--default  { background: #0d6efd; }
	.theme-btn--material { background: #1976d2; }
	.theme-btn--neon     { background: linear-gradient(135deg, #ff00ff 0%, #00ffff 100%); }
	.theme-btn--sharp    { background: #000000; }
	.theme-btn--soft     { background: #ff6b9d; }
	.theme-btn--forest   { background: #2d6a4f; }
	.theme-btn--glass    {
		background: rgba(255, 255, 255, 0.55);
		color: #1f2937;
		backdrop-filter: blur(6px);
		border: 1px solid rgba(31, 41, 55, 0.2);
	}
	.theme-btn:hover {
		filter: brightness(1.1);
	}
</style>
