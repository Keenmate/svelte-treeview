import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import pkg from './package.json' with { type: 'json' };
import { kmwcSvelteKit } from './scripts/kmwc-sveltekit.js';

export default defineConfig({
	// kmwcSvelteKit: devkit examples-kit page config + spotlight chapter index for the showcase.
	plugins: [kmwcSvelteKit(), sveltekit()],
	define: {
		'__VERSION__': JSON.stringify(pkg.version),
		'__PACKAGE_NAME__': JSON.stringify(pkg.name),
		'__AUTHOR__': JSON.stringify(pkg.author),
		'__LICENSE__': JSON.stringify(pkg.license),
		'__REPOSITORY__': JSON.stringify(pkg.repository?.url || ''),
		'__HOMEPAGE__': JSON.stringify(pkg.homepage || '')
	},
	test: {
		// Vitest runs unit tests; Playwright owns e2e/**.
		// Keep vitest's defaults (node_modules, dist) and add the e2e dir.
		exclude: ['**/node_modules/**', '**/dist/**', '**/.svelte-kit/**', 'e2e/**']
	}
});
