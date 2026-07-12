# Color Formats

**Rule:** Colors are authored in exactly two textual formats — `oklch()` and hex — never `hsl()`, named colors, or anything else, with one documented exception: `rgb()`/`rgba()` is allowed for pure black/white alpha scrims, overlays, and shadows, since those are alpha operations with no semantic token equivalent. `frontend/stylelint.config.mjs`'s `scale-unlimited/declaration-strict-value` allowlist explicitly permits `/^rgb\(/` and `/^rgba\(/` alongside `/^oklch\(/`. The canonical example is `frontend/src/tokens.css`'s `--bg-overlay: rgb(0 0 0 / 50%)`; `ImagePicker.module.css` uses the same pattern for a scrim gradient (`rgba(0, 0, 0, 0.5)`).

## OKLCH — the primary format

- The design-token palette (`frontend/src/tokens.css`) is authored almost entirely in `oklch(...)`. Brand color scales (`--violet-*`, `--orange-*`, `--tolopea-*`, `--cyan-*`, `--concrete-*`, `--white-*`, `--black-russian-*`, `--ultraviolet-*`) use CSS relative-color syntax on a hex seed — e.g. `--violet-500: oklch(from #6019ff l c h);` — the hex is only the seed; every derived shade is still an `oklch()` value.
- Semantic tokens (`--bg-*`, `--text-*`, `--border-*`) build on the role vars with `color-mix(in oklab, ...)`.
- Generated/derived palettes are `oklch()` too: `buildOptionPalette()` (`frontend/src/shared/components/Charts/optionPalette.ts`) emits `oklch(0.65 0.18 <hue>)` swatches — the single source of truth for MCQ/Ranking/Axis option colors. `rankItemColor.ts` (Ranking) and the sibling `axisItemColor` (Axis) delegate to it, then re-derive a darker second cycle via relative-color syntax: `` oklch(from ${base} 0.42 c h) ``.
- `hueToColor()` (`frontend/src/shared/utils/color.ts`) — the hue-to-CSS direction — always returns `` oklch(0.65 0.18 ${hue}) ``.

## Hex — the fallback and user-input format

- Hex is what a user types or picks when authoring a custom color. `CustomColorPicker` (`frontend/src/shared/components/Forms/Input/ColorPicker/CustomColorPicker.tsx`) takes hex in and hands hex back out on Apply (`onApply: (hex: string) => void`), even when its starting point was an `oklch()` palette default.
- `parseHue()` (`color.ts`) reads either format — an `oklch(...)` string via regex, or a hex string via `hexToHsva` — so hex is the fallback interpretation whenever a stored color string can't be read as OKLCH.
- `isHexColor` / `toHexColor` / `hueToHex` are hex-specific helpers backing the picker's swatches and hex text field, which need a hex value to feed the `@uiw/react-color` picker library.

## Display normalizes to OKLCH

When the app needs to show or derive a color value — rather than pass a stored string straight into CSS — the canonical form it produces is OKLCH. `hueToColor()` and `buildOptionPalette()` above are the concrete examples: both take a hue and return `oklch(...)`, never hex.

## Not yet enforced everywhere

- The backend stores `color` as a plain `String` (`RankItem`, `GridItem`, `AxisItem`, `MatchItem` in `SlideContentTypes.java`) — no format is enforced at the type level. This is a frontend-authored convention, not a backend-validated one.
- `ColorPickerNew.tsx` (`frontend/src/shared/components/Forms/Input/ColorPicker/`) is a work-in-progress component (`TODO: Move this to real color picker component when done`) that formalizes the two-format contract as a type — `type ColorString = HEX | OKLCH` — but isn't wired into the app yet.
