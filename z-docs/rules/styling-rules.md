# Styling Rules

CSS, tokens, and design-system conventions. Full explanation: [frontend/STYLES.md](../../frontend/STYLES.md).

1. **CSS Modules** — Files end in `*.module.css`; class names are lowerCamelCase (Stylelint enforces). The only global styles are `tokens.css` (design tokens + the 16 `--role-*` theme inputs, with `[data-appearance]` overrides) and the base element rules in `index.css`.
2. **Module shape** — Each module has a small number of top-level classes with sub-classes nested inside. One module file per directory.
3. **No hover translation** — Never translate a component's position on hover unless it serves a specific purpose.
4. **Tokens & the variable manifest** — Every value comes from a `tokens.css` token (never hardcode); variantizable components declare a manifest of local CSS vars and flip them via local `variant` / `size` classes. — [details](styling/tokens-and-variables.md)
5. **Named color combinations & button variants** — Text/background pairings and `Btn`/`IconBtn` `variant` × `fill` styling come from a fixed catalog; anything off-list is outside the system. — [details](styling/color-and-button-variants.md)
6. **Container queries** — Responsive layout uses container queries, not viewport media queries. — [details](styling/container-queries.md)
7. **Accessibility** — Use semantic HTML with keyboard support and correct ARIA. No `window.alert` / `prompt` / `confirm` — use the shared modal / popover patterns.
8. **Lint** — Stylelint and ESLint must pass before commit (`lint:all` in the pre-commit hook).
