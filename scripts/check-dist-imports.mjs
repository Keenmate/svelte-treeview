#!/usr/bin/env node
/**
 * Every relative import in the published dist/ must name a file that exists — with its extension.
 *
 * svelte-package copies module specifiers from src/lib unchanged, so `./logger` or
 * `./core/TreeController.svelte` (a .svelte.ts module) ends up in dist/*.d.ts as written. Bundlers
 * cope; TypeScript with `moduleResolution: node16 / nodenext` (and Node itself) does not, and the
 * exports silently become `any` for the consumer (GitHub issue #30). Fix in src: `./logger.js`,
 * `./core/TreeController.svelte.js`; a component stays `./components/Tree.svelte`.
 *
 * Run after svelte-package (chained into `prepack`): `node scripts/check-dist-imports.mjs [dir]`.
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';

const root = resolve(process.argv[2] ?? 'dist');
if (!existsSync(root)) {
	console.error(`check-dist-imports: ${root} not found — run svelte-package first`);
	process.exit(1);
}

// import / export … from '…', import('…'), bare import '…'
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{1,2}\/[^'"]*)\1/g;

function* files(dir) {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) yield* files(path);
		else if (/\.(d\.ts|js|svelte)$/.test(name)) yield path;
	}
}

/** Does `spec` (relative to `file`) name an existing module — its .js / .svelte, or for types its .d.ts? */
function resolves(file, spec) {
	const target = resolve(dirname(file), spec);
	if (spec.endsWith('.js')) return existsSync(target) || existsSync(target.replace(/\.js$/, '.d.ts'));
	if (/\.(svelte|css|json)$/.test(spec)) return existsSync(target);
	return false; // no extension (or a .ts one): node16 / nodenext can't resolve it
}

const problems = [];
let count = 0;
for (const file of files(root)) {
	const text = readFileSync(file, 'utf8');
	for (const match of text.matchAll(SPECIFIER)) {
		count++;
		const spec = match[2];
		if (!resolves(file, spec)) {
			const line = text.slice(0, match.index).split('\n').length;
			problems.push(`  ${relative(process.cwd(), file)}:${line}  '${spec}'`);
		}
	}
}

if (problems.length) {
	console.error(
		`check-dist-imports: ${problems.length} relative import(s) in ${relative(process.cwd(), root)}/ don't name an existing file.\n` +
			`Add the extension in src/lib (.ts → '.js', .svelte.ts → '.svelte.js'); see issue #30.\n` +
			problems.join('\n')
	);
	process.exit(1);
}
console.log(`check-dist-imports: ${count} relative imports, all resolve with explicit extensions`);
