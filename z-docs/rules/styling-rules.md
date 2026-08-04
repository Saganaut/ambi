# Styling Rules

CSS, tokens, and design-system conventions. Full explanation: [frontend/STYLES.md](../../frontend/STYLES.md).

1. **CSS Modules** — Files end in `*.module.css`; class names are lowerCamelCase (Stylelint enforces). The only global styles are `tokens.css` (design tokens + the 16 `--role-*` theme inputs, with `[data-appearance]` overrides) and the base element rules in `index.css`.
2. **Module shape** — Each module has a small number of top-level classes with sub-classes nested inside. One module file per directory.
3. **No hover translation** — Never translate a component's position on hover unless it serves a specific purpose.
4. **Tokens & the variable manifest** — Every value comes from a `tokens.css` token (never hardcode); variantizable components declare a manifest of local CSS vars and flip them via local `variant` / `size` classes. — [details](styling/tokens-and-variables.md)
5. **Named color combinations & button variants** — Text/background pairings and `Btn`/`IconBtn` `variant` × `fill` styling come from a fixed catalog; anything off-list is outside the system. — [details](styling/color-and-button-variants.md)
6. **Color formats** — Colors are authored as `oklch()` or hex — never `hsl()` or named colors, with one allowlisted `rgb()`/`rgba()` exception for black/white alpha scrims. — [details](styling/color-formats.md)
7. **Container queries** — Responsive layout uses container queries, not viewport media queries. — [details](styling/container-queries.md)
8. **Spacing hierarchy** — Two spacing tiers, never mixed: component (`--p-*` / `--gap-*`) inside a control, layout (`--stack-*` / `--gutter-*`) between and around large components. — [details](styling/spacing-hierarchy.md)
9. **Elevation over borders** — Prefer a soft `--shadow-*` drop shadow over a border to separate a surface. — [details](styling/elevation-over-borders.md)
10. **Accessibility** — Use semantic HTML with keyboard support and correct ARIA. No `window.alert` / `prompt` / `confirm` — use the shared modal / popover patterns.
11. **Lint clean** — Stylelint included, per [testing-and-ci](../infrastructure/testing-and-ci.md).
