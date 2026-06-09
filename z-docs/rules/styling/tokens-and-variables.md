# Tokens & the Component Variable Manifest

**Rule:** Every value comes from a token; every variantizable component reads its style from local CSS vars using the `var(--name, fallback)` pattern.

## Tokens

- Colors, spacing, and typography come from tokens in `frontend/src/tokens.css`. Never hardcode values.
- Tokens cascade through theme classes (`.theme-dark`, `.theme-custom`, `.theme-custom.theme-dark`, default light). All four states must keep working — don't touch theme classes from a component module.

## Component variable manifest

Every variantizable component exposes a manifest of local CSS vars and reads from them. Variant classes nested inside the base component class flip those vars. Components opt into only the slots they need.

- **Color slots:** `--color`, `--background-color`, `--border-color` (flipped by variant).
- **Layout slots:** `--padding`, `--gap`, `--radius`, optionally `--height` / `--width` / `--border-width` (flipped by size).
- **Typography slots:** `--font-size`, optionally `--font-weight` / `--line-height` (flipped by size).
- **State slot:** `--opacity`.

## The `var(--name, fallback)` rule (load-bearing)

**Never declare a manifest var inside the component rule.** Read it with the fallback syntax:

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

Why: `.btn` and `.btn.error` have equal specificity, and component CSS imports after `tokens.css`, so a local declaration always wins. The fallback pattern means the component never declares the var — variant classes set it; otherwise the fallback applies.
