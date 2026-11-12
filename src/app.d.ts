// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	interface Window {
		/** Devkit examples-kit page config (read by its getPageConfig()). */
		__KMWC__?: Record<string, unknown>;
	}

	/** Devkit examples-kit page config (scripts/kmwc-sveltekit.ts → window.__KMWC__ + accent). */
	const __KMWC_PAGE_CONFIG__: {
		pageConfig: Record<string, unknown>;
		accent: { color: string | null; endColor: string | null };
	};
}

export {};
