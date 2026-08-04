# Named Color Combinations & Button Variants

**Rule:** Text/background pairings and button styling come from a fixed catalog. Anything not on these lists is outside the system. Live catalog: the Figma design-system library — see [figma-references.md](../frontend/figma-references.md) for the page link.

## Named text + background combinations

Every legal pairing of a text role with a background. Tokens live in `frontend/src/tokens.css`.

### Neutral surfaces

| Name                      | Background            | Text               | Edge (optional)         |
| ------------------------- | --------------------- | ------------------ | ----------------------- |
| Heading on canvas         | `--bg-canvas`         | `--text-primary`   | `--edge-canvas`         |
| Body on canvas            | `--bg-canvas`         | `--text-secondary` | `--edge-canvas`         |
| Link on canvas            | `--bg-canvas`         | `--text-accent`    | `--edge-canvas`         |
| Heading on surface        | `--bg-surface`        | `--text-primary`   | `--edge-surface`        |
| Body on surface           | `--bg-surface`        | `--text-secondary` | `--edge-surface`        |
| Link on surface           | `--bg-surface`        | `--text-accent`    | `--edge-surface`        |
| Heading on surface-raised | `--bg-surface-raised` | `--text-primary`   | `--edge-surface-raised` |
| Body on surface-raised    | `--bg-surface-raised` | `--text-secondary` | `--edge-surface-raised` |
| Link on surface-raised    | `--bg-surface-raised` | `--text-accent`    | `--edge-surface-raised` |
| Heading on sibling        | `--bg-secondary`      | `--text-primary`   | `--edge-secondary`      |
| Body on sibling           | `--bg-secondary`      | `--text-secondary` | `--edge-secondary`      |
| Link on sibling           | `--bg-secondary`      | `--text-accent`    | `--edge-secondary`      |
| Heading on subtle         | `--bg-subtle`         | `--text-primary`   | `--edge-subtle`         |
| Body on subtle            | `--bg-subtle`         | `--text-secondary` | `--edge-subtle`         |
| Link on subtle            | `--bg-subtle`         | `--text-accent`    | `--edge-subtle`         |
| Brand glyph on canvas     | `--bg-canvas`         | `--text-brand`     | `--edge-canvas`         |
| Brand glyph on surface    | `--bg-surface`        | `--text-brand`     | `--edge-surface`        |

### Brand surfaces

| Name           | Background     | Text              | Edge             |
| -------------- | -------------- | ----------------- | ---------------- |
| Primary action | `--bg-primary` | `--text-on-brand` | `--edge-primary` |
| Brand fill     | `--bg-brand`   | `--text-on-brand` | `--edge-brand`   |

### Inverted surfaces

For anchored chrome (top nav, sidebar, hero) — not content. Inverted text must pair with an inverted bg.

| Name                        | Background              | Text                        |
| --------------------------- | ----------------------- | --------------------------- |
| Heading on inverted canvas  | `--bg-canvas-inverted`  | `--text-primary-inverted`   |
| Body on inverted canvas     | `--bg-canvas-inverted`  | `--text-secondary-inverted` |
| Link on inverted canvas     | `--bg-canvas-inverted`  | `--text-accent-inverted`    |
| Heading on inverted surface | `--bg-surface-inverted` | `--text-primary-inverted`   |
| Body on inverted surface    | `--bg-surface-inverted` | `--text-secondary-inverted` |
| Link on inverted surface    | `--bg-surface-inverted` | `--text-accent-inverted`    |
| Heading on inverted primary | `--bg-primary-inverted` | `--text-primary-inverted`   |
| Body on inverted primary    | `--bg-primary-inverted` | `--text-secondary-inverted` |
| Link on inverted primary    | `--bg-primary-inverted` | `--text-accent-inverted`    |

### Status surfaces

Status colors mean exactly one thing: feedback about an operation. Never decorative.

| Name           | Background     | Text             | Border             |
| -------------- | -------------- | ---------------- | ------------------ |
| Error notice   | `--bg-error`   | `--text-error`   | `--border-error`   |
| Success notice | `--bg-success` | `--text-success` | `--border-success` |
| Warning notice | `--bg-warning` | `--text-warning` | `--border-warning` |
| Info notice    | `--bg-info`    | `--text-info`    | `--border-info`    |

## Named button + icon-button variants

`Btn` and `IconBtn` (props in `frontend/src/shared/components/UIElements/Buttons/Btn.types.ts`) take **two orthogonal style props**: `variant` picks the color slot, `fill` picks how that color is rendered. Any color × any fill is legal — e.g. `variant="error" fill="ghost"` is a red text-only destructive control. Defaults are `variant="primary"`, `fill="default"`.

### `variant` — color slot

| Variant     | Tokens                                                    |
| ----------- | --------------------------------------------------------- |
| `primary`   | `--text-primary` + `--bg-secondary` (neutral workhorse CTA) |
| `secondary` | `--text-secondary` + `--bg-subtle` (quieter neutral)      |
| `brand`     | `--text-on-brand` + `--bg-brand` + `--border-brand`       |
| `info`      | `--text-info` + `--bg-info` + `--border-info`             |
| `error`     | `--text-error` + `--bg-error` + `--border-error`          |
| `success`   | `--text-success` + `--bg-success` + `--border-success`    |
| `warning`   | `--text-warning` + `--bg-warning` + `--border-warning`    |
| `disabled`  | `--text-disabled` + `--bg-disabled` + `--border-disabled` |

### `fill` — background + border treatment

| Fill       | Effect                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------- |
| `default`  | Background from the variant + a soft resting shadow (`--shadow-xs`), transparent border. Standard filled look. |
| `bordered` | Background from the variant + the variant's matching border color, plus the resting shadow.   |
| `ghost`    | Transparent background, border, and shadow. Text/icon only (variant's color).                 |

Variants and fills are nested rules under `.btn` / `.iconBtn` in the same directory's `Buttons.module.css`, flipping the manifest vars per [tokens-and-variables](tokens-and-variables.md); the resting shadow follows [elevation-over-borders](elevation-over-borders.md).

## Modifiers

Compose on top of the variant, in this order of reach: `variant` (color) → `size` → `shape` → platform pseudo-class → a module class on the component for component-specific layout. Anything that fits none of those needs raising before you invent a one-off.

- `size` — `xs | sm | md | lg`. Sets padding, font size, radius, gap. Default `md`.
- `shape` — `default | round | pill | avatar` (avatar is IconBtn-only). Default `default`.
- Native interactive state stays on platform pseudo-classes (`:disabled`, `:hover`, `:focus-visible`, `[aria-pressed]`, `[aria-selected]`). Don't invent state classes.

**Notes:** `error` is also called *destructive* — reach for it on permanent-removal actions. A close (X) button is `IconBtn` with `XMarkIcon` and `fill="ghost"`; there is no `variant="close"`.
