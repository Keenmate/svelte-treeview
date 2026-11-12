// SvelteKit shim for @keenmate/web-components-devkit's examples kit.
//
// The devkit's own Vite plugin (createExamplesPlugin) only works on root *.html pages
// (transformIndexHtml) — SvelteKit routes never pass through it. This provides the two
// things the kit runtime still needs from the build:
//   • `__KMWC_PAGE_CONFIG__` — the page config the plugin would inject as window.__KMWC__
//     (resolved by the devkit's own getKmwcConfig() from package.json#kmwc)
//   • `virtual:kmwc-chapters` — the spotlight's site-wide <h2> index, built from the
//     showcase registry's route sources instead of root *.html files
// Same entry shape as the devkit's vite/chapter-index.js. Candidate for upstreaming
// (docs/PLAN-devkit-adoption.md §5).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

export function kmwcSvelteKit(root = resolve()): Plugin {
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
