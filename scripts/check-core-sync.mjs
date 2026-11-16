#!/usr/bin/env node
// Revalidate what svelte-treeview takes from @keenmate/web-components-core.
// Manifest: scripts/core-sync.json · guide: docs/CORE-SYNC.md · run: npm run check:core-sync
//
// For every group / file pair:
//   identical — local must equal core HEAD (line endings + trailing whitespace ignored)
//   adapted   — copied with documented edits: flagged when core changed it since `baseline`
//   mirror    — hand-ported behaviour: flagged when the core source changed since `baseline`
// Also flags a core file that no longer exists and a baseline the core repo doesn't know.
// Exit code 1 when anything needs a look (so CI / a pre-release step can gate on it).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'scripts/core-sync.json'), 'utf8'));
const coreRepo = resolve(root, manifest.coreRepo);
const isVerbose = process.argv.includes('--verbose');

if (!existsSync(resolve(coreRepo, '.git'))) {
	console.error(`core repo not found at ${coreRepo} (manifest coreRepo) — clone web-components-core next to this repo.`);
	process.exit(2);
}

const git = (...args) => execFileSync('git', ['-C', coreRepo, ...args], { encoding: 'utf8' }).trim();
const normalize = (text) => text.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '').replace(/\n+$/, '\n');
const read = (path) => normalize(readFileSync(path, 'utf8'));

const head = git('rev-parse', '--short', 'HEAD');
const headVersion = JSON.parse(readFileSync(resolve(coreRepo, 'package.json'), 'utf8')).version;
console.log(`web-components-core ${headVersion} @ ${head}\n`);

let problemCount = 0;
for (const group of manifest.groups) {
	const problems = [];
	let isBaselineKnown = true;
	try {
		git('cat-file', '-e', `${group.baseline}^{commit}`);
	} catch {
		isBaselineKnown = false;
		problems.push(`baseline ${group.baseline} is not a commit in the core repo`);
	}

	const coreFiles = [...new Set(group.files.map(([corePath]) => corePath))];
	for (const corePath of coreFiles) {
		if (!existsSync(resolve(coreRepo, corePath))) problems.push(`${corePath} no longer exists in core`);
	}

	if (group.mode === 'identical') {
		for (const [corePath, localPath] of group.files) {
			const coreFile = resolve(coreRepo, corePath);
			const localFile = resolve(root, localPath);
			if (!existsSync(coreFile)) continue;
			if (!existsSync(localFile)) {
				problems.push(`${localPath} is missing locally`);
				continue;
			}
			if (read(coreFile) !== read(localFile)) problems.push(`${localPath} differs from core ${corePath}`);
		}
	}

	// What core changed since the baseline — for adapted / mirror that IS the signal; for
	// identical it explains a difference (and says the baseline can be bumped when there is none).
	const upstream =
		isBaselineKnown && coreFiles.length
			? git('log', '--format=%h %ad %s', '--date=short', `${group.baseline}..HEAD`, '--', ...coreFiles)
			: '';
	if (upstream && group.mode !== 'identical') {
		problems.push(`core changed since baseline ${group.baseline}:\n${upstream.replace(/^/gm, '      ')}`);
	}

	const isOk = problems.length === 0;
	if (!isOk) problemCount++;
	const tag = isOk ? 'ok   ' : 'CHECK';
	console.log(`${tag} ${group.name} (${group.mode}, baseline ${group.baseline}) — ${group.description}`);
	for (const problem of problems) console.log(`      - ${problem}`);
	if (!isOk && group.note) console.log(`      note: ${group.note}`);
	if (isOk && upstream && isVerbose) console.log(`      (identical; core commits since baseline — bump it to ${head}:)\n${upstream.replace(/^/gm, '        ')}`);
}

console.log(
	problemCount
		? `\n${problemCount} group(s) need a look. Re-sync or review, then bump their baseline in scripts/core-sync.json (docs/CORE-SYNC.md).`
		: '\nAll in sync with core.'
);
process.exit(problemCount ? 1 : 0);
