# Color Formats

**Rule:** Colors are authored in exactly two textual formats — `oklch()` and hex — never `hsl()`, named colors, or anything else, with one documented exception: `rgb()`/`rgba()` is allowed for pure black/white alpha scrims, overlays, and shadows, since those are alpha operations with no semantic token equivalent. `frontend/stylelint.config.mjs`'s `scale-unlimited/declaration-strict-value` allowlist explicitly permits `/^rgb\(/` and `/^rgba\(/` alongside `/^oklch\(/`. The canonical example is `frontend/src/tokens.css`'s `--bg-overlay: rgb(0 0 0 / 50%)`; `ImagePicker.module.css` uses the same pattern for a scrim gradient (`rgba(0, 0, 0, 0.5)`).

## OKLCH — the primary format

- The design-token palette (`frontend/src/tokens.css`) is authored almost entirely in `oklch(...)`. Brand color scales (`--violet-*`, `--orange-*`, `--tolopea-*`, `--cyan-*`, `--concrete-*`, `--white-*`, `--black-russian-*`, `--ultraviolet-*`) use CSS relative-color syntax on a hex seed — e.g. `--violet-500: oklch(from #6019ff l c h);` — the hex is only the seed; every derived shade is still an `oklch()` value.
- Semantic tokens (`--bg-*`, `--text-*`, `--border-*`) build on the role vars with `color-mix(in oklab, ...)`.
- Generated/derived palettes are `oklch()` too: `buildOptionPalette()` (`frontend/src/shared/components/Charts/optionPalette.ts`) emits `oklch(0.65 0.18 <hue>)` swatches — the single source of truth for MCQ/Ranking/Axis option colors. `rankItemColor.ts` (Ranking) and the sibling `axisItemColor` (Axis) delegate to it, then re-derive a darker second cycle via relative-color syntax: `` oklch(from ${base} 0.42 c h) ``.

## Hex — the fallback and user-input format

- Hex is what a user types or picks when authoring a custom color. The DS color picker's custom view (`frontend/src/shared/components/Forms/Input/ColorPicker/ColorPickerPanel.tsx`) accepts hex in its text field and always commits hex on Apply (`#rrggbb`, or `#rrggbbaa` when translucent), even when its starting point was an `oklch()` palette default or a resolved theme variable.
- `parseColor()` (`frontend/src/shared/components/Forms/Input/ColorPicker/colorConversion.ts`) is the read direction: best-effort parsing of hex, `oklch(...)`, or a serialized `rgb()`/`color(srgb …)` computed value into the picker's HSVA working model.

## Display normalizes to OKLCH

When the app needs to show or derive a color value — rather than pass a stored string straight into CSS — the canonical form it produces is OKLCH. `buildOptionPalette()` above is the concrete example: it takes a hue and returns `oklch(...)`, never hex.

## Not yet enforced everywhere

- The backend stores `color` as a plain `String` (`RankItem`, `GridItem`, `AxisItem`, `MatchItem` in `SlideContentTypes.java`) — no format is enforced at the type level. This is a frontend-authored convention, not a backend-validated one.
- `ColorPicker` (`frontend/src/shared/components/Forms/Input/ColorPicker/`) — the DS color picker that replaced the `@uiw`-based pickers — formalizes the contract as types (`colorConversion.ts`: `ColorString = HEX | OKLCH`, plus `var(--role-*)` refs as `ThemeVarColor`) and emits hex from its custom view. It's wired into the rich-text toolbar and the deck editor's background/option color pickers; see [deck-editor's Color pickers section](../../features/deck-editor/README.md#color-pickers).
