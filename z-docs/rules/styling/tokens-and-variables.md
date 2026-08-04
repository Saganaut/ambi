# Tokens & the Component Variable Manifest

**Rule:** Every value comes from a token; every variantizable component declares a manifest of local CSS vars and flips them via local `variant` / `size` classes nested in the base rule.

Long-form treatment and worked examples: [frontend/STYLES.md §3–§4](../../../frontend/STYLES.md) — the rules below are canonical.

## Tokens

- Colors, spacing, and typography come from tokens in `frontend/src/tokens.css`. Never hardcode values.
- Semantic tokens (`--bg-*`, `--text-*`, `--border-*`, `--action-*`) are **derived from 16 palette role vars** (`--role-canvas`, `--role-foreground`, `--role-primary`, `--role-accent`, the four `--role-{red,green,yellow,blue}` status colours, …). A theme repaints the UI by setting those `--role-*` vars plus a `data-appearance="light|dark"` flag on an element — `<html>` globally, a scope wrapper for a per-deck theme. **Components never touch `--role-*` or `data-appearance`**; they consume only the semantic tokens. See the **Theme** entry in the [glossary](../../glossary.md) and `frontend/src/shared/utils/applyPalette.ts`.

## Component variable manifest

The base component rule **declares the manifest defaults**; **local variant/size classes nested inside it override them** (`.btn.error` out-specifies `.btn`, so the variant wins). Components opt into only the slots they need.

- **Color slots:** `--color`, `--background-color`, `--border-color` (flipped by variant).
- **Layout slots:** `--padding`, `--gap`, `--radius`, optionally `--height` / `--width` / `--border-width` (flipped by size).
- **Typography slots:** `--font-size`, optionally `--font-weight` / `--line-height` (flipped by size).
- **State slot:** `--opacity`.
