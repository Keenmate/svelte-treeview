// SvelteKit shim for @keenmate/web-components-devkit's examples kit.
//
// The devkit's own Vite plugin (createExamplesPlugin) only works on root *.html pages
// (transformIndexHtml) — SvelteKit routes never pass through it. This provides the two
// things the kit runtime still needs from the build:
//   • `__KMWC_PAGE_CONFIG__` — the page config the plugin would inject as window.__KMWC__
//     (resolved by the devkit's own getKmwcConfig() from package.json#kmwc)
//   • `virtual:kmwc-chapters` — the spotlight's site-wide <h2> index, built from the
//     showcase registry's route sources instead of root *.html files
//   • code highlighting — `.code-block[data-language]` blocks highlighted at build time
//     with the kit's Shiki theme (see "Code highlighting" below)
// Same entry shape as the devkit's vite/chapter-index.js. Candidate for upstreaming
// (docs/PLAN-devkit-adoption.md §5).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Plugin } from 'vite';
import { getKmwcConfig } from '@keenmate/web-components-devkit';
import { EXAMPLE_PAGES, getPageSource } from '../src/routes/(showcase)/examples-registry.js';

const VIRTUAL_CHAPTERS_ID = 'virtual:kmwc-chapters';
const RESOLVED_CHAPTERS_ID = '\0' + VIRTUAL_CHAPTERS_ID;
const ROUTES_DIR = 'src/routes';

// Mirrors the devkit's CHAPTER_CODE_PATTERN / generateSlug (examples/constants.js, sections.js).
const CHAPTER_CODE_PATTERN = /^([A-Z]{2,3}\d+[a-z]?)\s*·\s*/;
const generateSlug = (text: string) =>
	text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const ENTITIES: Record<string, string> = {
	amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·',
	mdash: '—', ndash: '–', hellip: '…', rarr: '→', larr: '←'
};
const decodeEntities = (html: string) =>
	html.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, name: string) => {
		if (name[0] === '#') {
			const codePoint = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
			return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
		}
		return ENTITIES[name.toLowerCase()] ?? entity;
	});

export interface ChapterEntry {
	code: string | null;
	title: string;
	label: string;
	pageHref: string;
	pageTitle: string;
	href: string;
}

/** <h2> chapters of one Svelte route source (markup only — script/style/comments stripped). */
export function getSvelteChapters(source: string, page: { href: string; title: string }): ChapterEntry[] {
	const markup = source.replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
	// The kit compares pageHref with location.pathname's last segment (spotlight.js
	// getCurrentPageHref); href is what it navigates to, so it can be absolute.
	const pageHref = page.href.split('/').pop() || page.href;
	const usedAnchors = new Set<string>();
	const chapters: ChapterEntry[] = [];
	for (const match of markup.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)) {
		const label = decodeEntities(
			match[1]
				.replace(/<span\b[^>]*\bclass="[^"]*\bbadge\b[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '')
				.replace(/<[^>]+>/g, '')
				.replace(/\{[^}]*\}/g, '')
		)
			.replace(/\s+/g, ' ')
			.trim();
		if (!label) continue;
		const code = label.match(CHAPTER_CODE_PATTERN)?.[1] ?? null;
		let anchor = code ? code.toLowerCase() : generateSlug(label) || `section-${chapters.length + 1}`;
		if (usedAnchors.has(anchor)) {
			let suffix = 2;
			while (usedAnchors.has(`${anchor}-${suffix}`)) suffix++;
			anchor = `${anchor}-${suffix}`;
		}
		usedAnchors.add(anchor);
		chapters.push({
			code,
			title: code ? label.replace(CHAPTER_CODE_PATTERN, '') : label,
			label,
			pageHref,
			pageTitle: page.title,
			href: `${page.href}#${anchor}`
		});
	}
	return chapters;
}

function getDevkitPackageJson(root: string): { version: string; homepage: string } {
	return JSON.parse(readFileSync(resolve(root, 'node_modules/@keenmate/web-components-devkit/package.json'), 'utf8'));
}

/** What the devkit plugin injects as window.__KMWC__ (vite/index.js transformIndexHtml). */
export function getKmwcPageConfig(root = resolve(), isBuild = false) {
	const config = getKmwcConfig(root);
	const devkit = getDevkitPackageJson(root);
	return {
		pageConfig: {
			id: config.id,
			title: config.title,
			tagline: config.tagline,
			version: config.version,
			packageName: config.packageName,
			buildTimestamp: isBuild ? new Date().toISOString() : null,
			mode: isBuild ? 'build' : 'dev',
			canonicalOrigin: config.examples.canonicalOrigin,
			storagePrefix: config.examples.storagePrefix,
			isSpotlightEnabled: config.examples.isSpotlightEnabled,
			repository: config.repository,
			homepage: config.homepage,
			devkitVersion: devkit.version,
			devkitHomepage: devkit.homepage
		},
		accent: { color: config.theme.accentColor ?? null, endColor: config.theme.accentEndColor ?? null }
	};
}

// ── Code highlighting ────────────────────────────────────────────────────────────────
// The devkit highlights `<div class="code-block" data-language="…">` at build time in its
// HTML page composer, with Shiki themed onto the kit's --kmwc-code-* tokens. Our code
// blocks are Svelte template literals — `<pre>{`…`}</pre>` — some with live `${expr}`
// holes, so this pre-transform (before vite-plugin-svelte) highlights them in the route
// source instead: each `${expr}` becomes a sentinel identifier for Shiki, then a Svelte
// `{expr}` in the output, so the block stays reactive AND coloured. Every <pre> before the
// block's closing </div> is highlighted (a block may switch <pre>s with {#if}).
// The highlighter isn't in the devkit's package exports — loaded by file path (upstream
// candidate: export loadCodeHighlighter from `@keenmate/web-components-devkit/vite`).

type HighlightCode = (code: string, language: string) => string;

const CODE_BLOCK_OPEN_PATTERN = /<div\b[^>]*\bclass="code-block"[^>]*\bdata-language="([^"]+)"[^>]*>/g;
const PRE_OPEN = '<pre>{`';
const PRE_CLOSE = '}</pre>';
const SENTINEL = (index: number) => `KMWCX${index}X`;
const SENTINEL_PATTERN = /KMWCX(\d+)X/g;
const TEMPLATE_ESCAPES: Record<string, string> = { n: '\n', t: '\t', r: '\r' };
// `${"<"}script>` hides a tag from Svelte's parser — a constant, not a live value.
const STRING_LITERAL_PATTERN = /^\s*(["'])((?:\\.|(?!\1).)*)\1\s*$/;

let highlighterPromise: Promise<HighlightCode> | null = null;

function loadCodeHighlighter(root: string): Promise<HighlightCode> {
	const file = resolve(root, 'node_modules/@keenmate/web-components-devkit/src/vite/code-highlighter.js');
	highlighterPromise ??= import(/* @vite-ignore */ pathToFileURL(file).href).then((m) => m.loadCodeHighlighter());
	return highlighterPromise;
}

/** Index just past the `}` closing the `${` expression that starts at `start` (after `${`). */
function skipExpression(source: string, start: number): number {
	let depth = 1;
	let i = start;
	while (i < source.length) {
		const char = source[i];
		if (char === '\'' || char === '"') {
			i++;
			while (i < source.length && source[i] !== char) i += source[i] === '\\' ? 2 : 1;
		} else if (char === '`') {
			i = skipTemplate(source, i + 1);
			continue;
		} else if (char === '{') depth++;
		else if (char === '}' && --depth === 0) return i + 1;
		i++;
	}
	throw new Error('unterminated ${…} in a code block');
}

/** Index just past the closing backtick of a template literal whose body starts at `start`. */
function skipTemplate(source: string, start: number): number {
	let i = start;
	while (i < source.length) {
		if (source[i] === '\\') i += 2;
		else if (source[i] === '`') return i + 1;
		else if (source[i] === '$' && source[i + 1] === '{') i = skipExpression(source, i + 2);
		else i++;
	}
	throw new Error('unterminated template literal in a code block');
}

/** A template literal body → its text with `${expr}` holes as sentinels, plus the expressions. */
function parseTemplate(body: string): { text: string; expressions: string[] } {
	const expressions: string[] = [];
	let text = '';
	let i = 0;
	while (i < body.length) {
		const char = body[i];
		if (char === '\\') {
			text += TEMPLATE_ESCAPES[body[i + 1]] ?? body[i + 1];
			i += 2;
		} else if (char === '$' && body[i + 1] === '{') {
			const end = skipExpression(body, i + 2);
			const expression = body.slice(i + 2, end - 1);
			const literal = expression.match(STRING_LITERAL_PATTERN);
			if (literal) text += literal[2];
			else {
				text += SENTINEL(expressions.length);
				expressions.push(expression.trim());
			}
			i = end;
		} else {
			text += char;
			i++;
		}
	}
	return { text, expressions };
}

/** Shiki HTML → Svelte markup: braces escaped, sentinels back to `{expr}`. */
function toSvelteMarkup(html: string, expressions: string[]): string {
	let found = 0;
	const markup = html
		.replace(/\{/g, '&#123;')
		.replace(/\}/g, '&#125;')
		.replace(SENTINEL_PATTERN, (_match, index: string) => {
			found++;
			return `{${expressions[Number(index)]}}`;
		});
	if (found !== expressions.length) throw new Error('a ${…} hole was split by the highlighter');
	return markup;
}

/** Highlight every `.code-block[data-language]` in a Svelte route source (null = untouched). */
export function highlightSvelteCodeBlocks(source: string, highlightCode: HighlightCode, file = 'page'): string | null {
	if (!source.includes('data-language=')) return null;
	let output = '';
	let cursor = 0;
	for (const match of source.matchAll(CODE_BLOCK_OPEN_PATTERN)) {
		if (match.index < cursor) continue;
		const language = match[1];
		let i = match.index + match[0].length;
		output += source.slice(cursor, i);
		// Walk the block: highlight each <pre>{`…`}</pre> until the block's own </div>. The
		// template literals are skipped whole, so a `</div>` in the example code can't end it.
		for (;;) {
			const pre = source.indexOf(PRE_OPEN, i);
			const close = source.indexOf('</div>', i);
			if (close === -1) throw new Error(`kmwc: ${file}: unclosed ${language} code block`);
			if (pre === -1 || close < pre) {
				output += source.slice(i, close);
				i = close;
				break;
			}
			output += source.slice(i, pre);
			const bodyStart = pre + PRE_OPEN.length;
			let bodyEnd: number;
			try {
				bodyEnd = skipTemplate(source, bodyStart);
			} catch (error) {
				throw new Error(`kmwc: ${file}: ${(error as Error).message}`);
			}
			if (!source.startsWith(PRE_CLOSE, bodyEnd)) {
				throw new Error(`kmwc: ${file}: a ${language} code block's <pre> must hold one template literal`);
			}
			const { text, expressions } = parseTemplate(source.slice(bodyStart, bodyEnd - 1));
			let codeHtml: string;
			try {
				codeHtml = toSvelteMarkup(highlightCode(text, language), expressions);
			} catch (error) {
				throw new Error(`kmwc: ${file}: ${(error as Error).message.replace(/^kmwc: /, '')}`);
			}
			output += `<pre><code>${codeHtml}</code></pre>`;
			i = bodyEnd + PRE_CLOSE.length;
		}
		cursor = i;
	}
	return output + source.slice(cursor);
}

export function kmwcSvelteKit(root = resolve()): Plugin[] {
	return [kmwcCodeHighlightPlugin(root), kmwcPagePlugin(root)];
}

function kmwcCodeHighlightPlugin(root: string): Plugin {
	return {
		name: 'kmwc-sveltekit:code-highlight',
		enforce: 'pre',
		async transform(code, id) {
			if (!id.endsWith('.svelte') || !id.replace(/\\/g, '/').includes('/(showcase)/')) return null;
			if (!code.includes('data-language=')) return null;
			const highlighted = highlightSvelteCodeBlocks(code, await loadCodeHighlighter(root), id);
			return highlighted === null ? null : { code: highlighted, map: null };
		}
	};
}

function kmwcPagePlugin(root: string): Plugin {
	const routesDir = resolve(root, ROUTES_DIR);
	return {
		name: 'kmwc-sveltekit',
		config(_userConfig, env) {
			return {
				define: { __KMWC_PAGE_CONFIG__: JSON.stringify(getKmwcPageConfig(root, env.command === 'build')) },
				// The kit's spotlight imports `virtual:kmwc-chapters`; esbuild's dep pre-bundling
				// can't see this plugin, so serve the devkit as plain ESM through Vite.
				optimizeDeps: { exclude: ['@keenmate/web-components-devkit'] }
			};
		},
		resolveId(id) {
			return id === VIRTUAL_CHAPTERS_ID ? RESOLVED_CHAPTERS_ID : null;
		},
		load(id) {
			if (id !== RESOLVED_CHAPTERS_ID) return null;
			const chapters = EXAMPLE_PAGES.flatMap((page) => {
				const source = getPageSource(page);
				if (!source) return [];
				const file = resolve(routesDir, source);
				this.addWatchFile(file);
				try {
					return getSvelteChapters(readFileSync(file, 'utf8'), page);
				} catch {
					return []; // a missing page reports itself when served — never break the index
				}
			});
			return `export default ${JSON.stringify(chapters)};`;
		},
		handleHotUpdate({ file, server }) {
			if (!file.replace(/\\/g, '/').includes('/(showcase)/')) return;
			const chaptersModule = server.moduleGraph.getModuleById(RESOLVED_CHAPTERS_ID);
			if (chaptersModule) server.moduleGraph.invalidateModule(chaptersModule);
		}
	};
}
