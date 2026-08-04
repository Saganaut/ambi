# Color Formats

**Rule:** Colors are authored in exactly two textual formats — `oklch()` and hex — never `hsl()`, named colors, or anything else.

One documented exception: `rgb()`/`rgba()` for pure black/white alpha scrims, overlays, and shadows, which are alpha operations with no semantic token equivalent. All three are allowlisted in `frontend/stylelint.config.mjs`'s `scale-unlimited/declaration-strict-value` rule. Canonical example: `tokens.css`'s `--bg-overlay: rgb(0 0 0 / 50%)`.

## OKLCH — the primary format

- The design-token palette (`frontend/src/tokens.css`) is authored almost entirely in `oklch(...)`. Brand scales use CSS relative-color syntax on a hex seed — `--violet-500: oklch(from #6019ff l c h);` — so every derived shade is still an `oklch()` value. The neutral ramp is the single `--zinc-100`…`--zinc-900` scale.
- Semantic tokens (`--bg-*`, `--text-*`, `--border-*`) build on the role vars with `color-mix(in oklab, …)`.
- Derived palettes are `oklch()` too, and OKLCH is the canonical form the app *produces* when it computes rather than passes through a stored color. `frontend/src/shared/components/Charts/optionPalette.ts` is the single source of truth for option colors across MCQ/Ranking/Grid/Axis/Place-on-Image/Matching.

## Hex — the fallback and user-input format

- Hex is what a user types or picks. The DS color picker (`shared/components/Forms/Input/ColorPicker/`) accepts hex in its text field and always commits hex on Apply (`#rrggbb`, or `#rrggbbaa` when translucent); hosts whose field can only hold an opaque colour pass `allowAlpha={false}`.
- `parseColor()` (`ColorPicker/colorConversion.ts`) is the read direction — best-effort parsing of hex, `oklch(...)`, or a serialized `rgb()`/`color(srgb …)` computed value into the picker's working model. That file also types the contract: `ColorString = HEX | OKLCH`, plus `var(--role-*)` refs as `ThemeVarColor`.

**Not backend-enforced:** the backend stores `color` as a plain `String` (`RankItem`, `GridItem`, `AxisItem`, `MatchItem` in `SlideContentTypes.java`). This is a frontend-authored convention.
