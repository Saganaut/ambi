# Named Color Combinations & Button Variants

**Rule:** Text/background pairings and button styling come from a fixed catalog. Anything not on these lists is outside the system. Live catalog: the Figma design-system library.

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

`Btn` and `IconBtn` (from `components/Common/Buttons/BtnTypes.ts`) take **two orthogonal style props**: `variant` picks the color slot, `fill` picks how that color is rendered. Any color × any fill is legal — e.g. `variant="error" fill="ghost"` is a red text-only destructive control. Defaults are `variant="primary"`, `fill="default"`.

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

`error` is also called **destructive**; reach for it on permanent-removal actions.

### `fill` — background + border treatment

| Fill       | Effect                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------- |
| `default`  | Background from the variant + a soft resting shadow (`--shadow-xs`), transparent border. Standard filled look. |
| `bordered` | Background from the variant + the variant's matching border color, plus the resting shadow.   |
| `ghost`    | Transparent background, border, and shadow. Text/icon only (variant's color).                 |

For a close (X) button on `IconBtn`, pass `XMarkIcon` as the `icon` with `fill="ghost"` — there is no `variant="close"` shortcut.

Variants and fills are each a nested rule under `.btn` / `.iconBtn` in `Buttons.module.css`. Variants set `--color` / `--bg-fill` / `--border-fill`; fills decide whether `--background-color` and `--border-color` consume those or fall back to transparent, and whether the resting `--btn-shadow` (`--shadow-xs`, stepping up to `--shadow-sm` on hover per [elevation-over-borders](elevation-over-borders.md)) applies — `ghost` opts out with `--btn-shadow: none`. Sizes and shapes compose on top.

## Modifier vocabulary

Sizes and shapes compose with the variant:

- `size` — `xs | sm | md | lg`. Sets padding, font size, radius, gap. Default `md`.
- `shape` — `default | round | pill | avatar` (avatar is IconBtn-only). Default `default`.

Native interactive state stays on platform pseudo-classes (`:disabled`, `:hover`, `:focus-visible`, `[aria-pressed]`, `[aria-selected]`). Don't invent state classes.

## When to do what

1. Recolor / change emphasis → `variant`.
2. Resize → `size`.
3. Round / pill / avatar shape → `shape`.
4. Native interactive state → platform pseudo-class / aria attribute.
5. Component-specific layout (slot positioning, custom spacing) → a module class on the component.

If a change fits none of those, raise it before inventing a one-off pattern.
