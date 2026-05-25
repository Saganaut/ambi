# Frontend Style Rules

Short rules. See [frontend/STYLES.md](../../frontend/STYLES.md) for the full explanation, examples, and migration status.

## File & class structure

- Use CSS Modules; files end in `*.module.css`.
- Class names are lowerCamelCase. Stylelint enforces this.
- No global styles. The only exception is the modifier rules in `tokens.css` (theme classes + `data-*` selectors).
- Each module has a small number of top-level classes with sub-classes nested inside.
- Use container queries for responsive layout, not viewport media queries — see [LAYOUT-RULES.md](LAYOUT-RULES.md).
- Never translate a component's position on hover unless it serves a specific purpose.

## Tokens

- Colors, spacing, and typography come from tokens in `frontend/src/tokens.css`. Never hardcode values.
- Tokens cascade through theme classes (`.theme-dark`, `.theme-custom`, `.theme-custom.theme-dark`, default light). All four states must keep working — don't touch theme classes from a component module.

## Component variable manifest

Every variantizable component exposes a manifest of local CSS vars and reads from them. Variant classes nested inside the base component class flip those vars.

- **Color slots:** `--color`, `--background-color`, `--border-color` (flipped by variant).
- **Layout slots:** `--padding`, `--gap`, `--radius`, optionally `--height` / `--width` / `--border-width` (flipped by size).
- **Typography slots:** `--font-size`, optionally `--font-weight` / `--line-height` (flipped by size).
- **State slot:** `--opacity`.

Components opt into only the slots they need.

## The `var(--name, fallback)` rule (load-bearing)

- **Never declare a manifest var inside the component rule.** Read it with the fallback syntax:

  ```css
  /* correct */
  .btn {
    color: var(--color, var(--text-primary));
    padding: var(--padding, var(--p-md));
  }

  /* wrong — this kills every modifier silently */
  .btn {
    --color: var(--text-primary);
    color: var(--color);
  }
  ```

- Why: `.btn` and `.btn.error` have equal specificity. Component CSS imports after `tokens.css`, so a local declaration would always win. The fallback pattern means the component never declares the var — variant classes set it; otherwise the fallback applies.

## Named text + background combinations

Every legal pairing of text role with a background. Anything not on this list is outside the system. Tokens live in `frontend/src/tokens.css`; the live catalog is at `/design-system` → Tokens → "Text + background combinations".

### Neutral surfaces

| Name                          | Background             | Text               | Edge (optional)         |
| ----------------------------- | ---------------------- | ------------------ | ----------------------- |
| Heading on canvas             | `--bg-canvas`          | `--text-primary`   | `--edge-canvas`         |
| Body on canvas                | `--bg-canvas`          | `--text-secondary` | `--edge-canvas`         |
| Link on canvas                | `--bg-canvas`          | `--text-accent`    | `--edge-canvas`         |
| Heading on surface            | `--bg-surface`         | `--text-primary`   | `--edge-surface`        |
| Body on surface               | `--bg-surface`         | `--text-secondary` | `--edge-surface`        |
| Link on surface               | `--bg-surface`         | `--text-accent`    | `--edge-surface`        |
| Heading on surface-raised     | `--bg-surface-raised`  | `--text-primary`   | `--edge-surface-raised` |
| Body on surface-raised        | `--bg-surface-raised`  | `--text-secondary` | `--edge-surface-raised` |
| Link on surface-raised        | `--bg-surface-raised`  | `--text-accent`    | `--edge-surface-raised` |
| Heading on sibling            | `--bg-secondary`       | `--text-primary`   | `--edge-secondary`      |
| Body on sibling               | `--bg-secondary`       | `--text-secondary` | `--edge-secondary`      |
| Link on sibling               | `--bg-secondary`       | `--text-accent`    | `--edge-secondary`      |
| Heading on subtle             | `--bg-subtle`          | `--text-primary`   | `--edge-subtle`         |
| Body on subtle                | `--bg-subtle`          | `--text-secondary` | `--edge-subtle`         |
| Link on subtle                | `--bg-subtle`          | `--text-accent`    | `--edge-subtle`         |

### Brand surfaces

| Name              | Background      | Text              | Edge             |
| ----------------- | --------------- | ----------------- | ---------------- |
| Primary action    | `--bg-primary`  | `--text-on-brand` | `--edge-primary` |
| Brand fill        | `--bg-brand`    | `--text-on-brand` | `--edge-brand`   |

### Inverted surfaces

Inverted surfaces are for anchored chrome (top nav, sidebar, hero) — not for content. Inverted text must pair with an inverted bg.

| Name                            | Background              | Text                        |
| ------------------------------- | ----------------------- | --------------------------- |
| Heading on inverted canvas      | `--bg-canvas-inverted`  | `--text-primary-inverted`   |
| Body on inverted canvas         | `--bg-canvas-inverted`  | `--text-secondary-inverted` |
| Link on inverted canvas         | `--bg-canvas-inverted`  | `--text-accent-inverted`    |
| Heading on inverted surface     | `--bg-surface-inverted` | `--text-primary-inverted`   |
| Body on inverted surface        | `--bg-surface-inverted` | `--text-secondary-inverted` |
| Link on inverted surface        | `--bg-surface-inverted` | `--text-accent-inverted`    |
| Heading on inverted primary     | `--bg-primary-inverted` | `--text-primary-inverted`   |
| Body on inverted primary        | `--bg-primary-inverted` | `--text-secondary-inverted` |
| Link on inverted primary        | `--bg-primary-inverted` | `--text-accent-inverted`    |

### Status surfaces

Status colors mean exactly one thing: feedback about an operation. Never decorative.

| Name           | Background     | Text             | Border             |
| -------------- | -------------- | ---------------- | ------------------ |
| Error notice   | `--bg-error`   | `--text-error`   | `--border-error`   |
| Success notice | `--bg-success` | `--text-success` | `--border-success` |
| Warning notice | `--bg-warning` | `--text-warning` | `--border-warning` |
| Info notice    | `--bg-info`    | `--text-info`    | `--border-info`    |

## Named button + icon-button variants

`Btn` and `IconBtn` (from `components/Common/Buttons/BtnTypes.ts`) take **two orthogonal style props**: `variant` picks the color slot and `fill` picks how that color is rendered. Any color × any fill is legal — e.g. `variant="error" fill="ghost"` is a red text-only destructive control. Defaults are `variant="primary"` and `fill="default"`. The live catalog is at `/design-system` → Common → "Action combinations".

### `variant` — color slot

| Variant     | Tokens                                                        |
| ----------- | ------------------------------------------------------------- |
| `primary`   | `--text-primary` + `--bg-secondary` (neutral workhorse CTA)   |
| `secondary` | `--text-secondary` + `--bg-subtle` (quieter neutral)          |
| `brand`     | `--text-on-brand` + `--bg-brand` + `--border-brand`           |
| `info`      | `--text-info` + `--bg-info` + `--border-info`                 |
| `error`     | `--text-error` + `--bg-error` + `--border-error`              |
| `success`   | `--text-success` + `--bg-success` + `--border-success`        |
| `warning`   | `--text-warning` + `--bg-warning` + `--border-warning`        |
| `disabled`  | `--text-disabled` + `--bg-disabled` + `--border-disabled`     |

`error` is also called **destructive** in design discussions; reach for it on permanent-removal actions.

### `fill` — background + border treatment

| Fill       | Effect                                                                       |
| ---------- | ---------------------------------------------------------------------------- |
| `default`  | Background from the variant, transparent border. The standard filled look.    |
| `bordered` | Background from the variant + the variant's matching border color.            |
| `ghost`    | Transparent background, transparent border. Text/icon only (variant's color). |

For a close (X) button on `IconBtn`, pass `XMarkIcon` as the `icon` and use `fill="ghost"`. There is no longer a `variant="close"` shortcut.

Variants and fills are each implemented as a nested rule under `.btn` / `.iconBtn` in `Buttons.module.css`. Variants set the component-local `--color` / `--bg-fill` / `--border-fill` slots; fills decide whether `--background-color` and `--border-color` consume those slots or fall back to transparent. Sizes and shapes compose on top.

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

If a change doesn't fit any of those, raise it before inventing a one-off pattern.

## Accessibility & semantics

- Use semantic HTML elements. Components must support keyboard navigation and carry the right ARIA attributes.
- No `window.alert` / `window.prompt` / `window.confirm`. Use the shared modal / popover patterns.

## Lint

- Stylelint and ESLint must pass before commit. The pre-commit hook runs `lint:all`.
