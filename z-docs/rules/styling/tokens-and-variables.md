# Tokens & the Component Variable Manifest

**Rule:** Every value comes from a token; every variantizable component declares a manifest of local CSS vars and flips them via local `variant` / `size` classes nested in the base rule.

## Tokens

- Colors, spacing, and typography come from tokens in `frontend/src/tokens.css`. Never hardcode values.
- Semantic colour tokens (`--bg-*`, `--text-*`, `--border-*`, `--action-*`) are **derived from 16 palette role vars** (`--role-canvas`, `--role-foreground`, `--role-primary`, `--role-accent`, the four `--role-{red,green,yellow,blue}` status colours, …). A theme repaints the UI by setting those `--role-*` vars (and a `data-appearance="light|dark"` flag) on an element — `<html>` for the global theme, a scope wrapper for a per-deck theme. Components never touch `--role-*` or `data-appearance`; they only consume the semantic tokens. See the **Theme** entry in the [glossary](../../glossary.md) and `frontend/src/shared/utils/applyPalette.ts`.

## Component variable manifest

Every variantizable component exposes a manifest of local CSS vars and reads from them. Variant classes nested inside the base component class flip those vars. Components opt into only the slots they need.

- **Color slots:** `--color`, `--background-color`, `--border-color` (flipped by variant).
- **Layout slots:** `--padding`, `--gap`, `--radius`, optionally `--height` / `--width` / `--border-width` (flipped by size).
- **Typography slots:** `--font-size`, optionally `--font-weight` / `--line-height` (flipped by size).
- **State slot:** `--opacity`.

## How the manifest is flipped

The base component rule **declares the manifest defaults**; **local variant/size classes override them**:

```css
.btn {
  /* manifest default */
  --color: var(--text-primary);
  color: var(--color);

  /* variant override — wins on specificity */
  &.error {
    --color: var(--text-error);
  }
}
```

Why it works: `.btn.error` (specificity `(0,2,0)`) out-specifies the base `.btn` (`(0,1,0)`), so the variant's `--color` wins. The colours referenced (`--text-error`, …) are shared semantic tokens, so every component's `error` resolves to the same theme-derived colour.

> A global-modifier variant — `var(--name, fallback)` reads flipped from `[data-variant]` rules in `tokens.css` — is a possible future refactor, not current practice. See [STYLES.md §11](../../../frontend/STYLES.md).
