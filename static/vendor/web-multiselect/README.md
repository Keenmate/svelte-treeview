# static/vendor/web-multiselect

`@keenmate/web-multiselect` 3.0.0-rc03 — `multiselect.js` + `style.css` copied from
`../web-multiselect/dist` (built 2026-11-13, commit c5e9552; core 1.0.0-rc23 bundled in).
A self-contained ESM bundle (no imports) that defines `<web-multiselect>` as a side effect.

Demo-only — loaded at runtime by an injected `<script type="module">` (not `import()`, so Vite
doesn't analyse it) on `/examples/theme-comparison` and `/examples/integration`. Not a package
dependency.

The integration page relies on its bundled core sharing page-wide state with svelte-treeview's
vendored core (theme mode, motion, breakpoints, loader hook, logging). After a core release:
rebuild web-multiselect, re-copy both files, update this note (docs/CORE-SYNC.md routine).
