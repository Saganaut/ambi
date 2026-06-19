# design-sync notes

## Scope of the first sync (2026-06-19)

Deliberately **tokens + rules only** — no components — to keep token/time cost low
(user request). Uploaded: `tokens/tokens.css`, `tokens/base.css`, `styles.css`,
`README.md` (the conventions doc). The 57 storied components were NOT synced.

## Repo shape

- This is a **private application**, not a published component library: `package.json`
  has no `exports`/`module`, and `frontend/dist/` holds only favicons. A future
  component sync must **synthesize a bundle entry** (a barrel re-exporting each
  storied component by the name its story imports — `Btn`, `Badge`, `Input`, …,
  all clean named exports) and point the converter at it via `cfg.entry`.
- Storybook config: `frontend/.storybook/main.ts`, stories glob
  `../src/**/*.stories.@(ts|tsx)`, run from `frontend/`. React 19 (shape OK).

## Styling reality vs. STYLES.md

- **`STYLES.md` is partly aspirational.** It describes `[data-variant]`/`[data-size]`/
  `[data-mode]` modifier rules and `.theme-dark`/`.theme-custom` classes "defined in
  tokens.css", but **none of those rules exist in any shipped CSS** (grep across
  `src/**/*.css` returns zero). The components SET `data-variant` etc. as attributes,
  but no global rule maps them to color triples yet.
- Therefore the conventions doc was built on what actually ships and validates: the
  **semantic token layer** in `tokens.css` (consumed via `var(--token, fallback)`)
  and theming via **`[data-appearance="light|dark"]` + the 16 `--role-*` vars**
  (NOT `theme-*` classes). The Storybook `preview.tsx` toggles `theme-light/dark`
  classes that currently match no CSS rules — an approximation only.
- `data-*` modifier vocabulary is documented in the conventions as the component
  **prop API convention**, not as a globally-resolvable utility.

## What was dropped from index.css when lifting base.css

`#root` (app-shell `width: var(--max-screen-width)` = 2440px) and the demo `.counter`
rule — app-specific, would distort design layouts. Kept resets, fonts, headings,
button/input/img defaults, scrollbar styling.

## Fonts

`--font-mono` (the body face) is **Poppins**, a Google font NOT bundled in the repo.
`styles.css` adds a Google Fonts `@import` for it so designs render on-brand. If a
future run uses the converter's font check, expect a `[FONT_MISSING]` unless the
woff2 is vendored or the @import is kept.

## Re-sync risks (watch on next run)

- A component sync is a from-scratch effort here (bundle entry must be authored) — the
  tokens/rules upload does not bootstrap it.
- If STYLES.md's modifier system gets actually wired into CSS later, update the
  conventions doc to promote `data-variant`/`-size`/`-mode` from "prop convention" to
  "globally resolvable".
- `_ds_sync.json` anchor was NOT emitted this run (off-script tokens-only layout), so
  the next sync re-verifies from scratch — expected, not a bug.
