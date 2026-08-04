# Ambi Design System — conventions

Ambi is an interactive presentation platform. Its look is driven entirely by **CSS
custom-property design tokens** (no utility-class framework, no Tailwind). Build
on-brand UI by styling with these tokens; the truth lives in `tokens/tokens.css`,
with element defaults in `tokens/base.css` (both reachable from `styles.css`).

## How to style — the one rule

Style by **consuming semantic tokens through `var()`**, with the semantic token as
the fallback. Never hardcode a color, space, or radius — every value is a token.

```css
.panel {
  background-color: var(--bg-surface);
  color: var(--text-primary);
  border: var(--border-size-sm) solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: var(--p-md);
  box-shadow: var(--shadow-md);
}
```

In this codebase components go further: each reads a *local* var with the token as
fallback — `color: var(--color, var(--text-primary))` — so a parent can flip
`--color` without the component enumerating variants. When authoring component CSS,
follow that `var(--local, var(--token))` pattern; for plain layout, use the tokens
directly as above.

## Token vocabulary (all defined in `tokens/tokens.css`)

| Family | Tokens |
| --- | --- |
| Backgrounds | `--bg-canvas` `--bg-surface` `--bg-surface-raised` `--bg-secondary` `--bg-subtle` `--bg-primary` `--bg-brand` `--bg-disabled` `--bg-overlay` |
| Status bg | `--bg-error` `--bg-success` `--bg-warning` `--bg-info` |
| Inverted bg | `--bg-canvas-inverted` `--bg-surface-inverted` `--bg-primary-inverted` |
| Text | `--text-primary` `--text-secondary` `--text-muted` `--text-accent` `--text-on-brand` `--text-disabled` |
| Status text | `--text-error` `--text-success` `--text-warning` `--text-info` |
| Borders | `--border-default` `--border-subtle` `--border-focus` `--border-brand` `--border-disabled` (+ `--border-success/-warning/-error/-info`) |
| Edges (hairlines) | `--edge-canvas` `--edge-surface` `--edge-surface-raised` `--edge-subtle` `--edge-primary` `--edge-brand` |
| Actions | `--action-hover` `--action-active` `--action-disabled` |
| Type face | `--font-mono` (Poppins — the body face) `--font-heading` `--font-sans` |
| Type size | `--font-size-xs` `-sm` `-base` `-md` `-lg` `-xl` `-2xl` `-3xl` |
| Spacing | `--space-0 … --space-24`; gaps `--gap-xs/-sm/-md/-lg/-xl` |
| Padding presets | `--p-xs/-sm/-md/-lg`, `--p-square-*`, `--p-pill-*`, `--p-stack-*`, `--p-asym-*` |
| Radius | `--radius-sm` `--radius-md` `--radius-lg` `--radius-full` |
| Border width | `--border-size-sm/-md/-lg` |
| Elevation | `--shadow` `--shadow-sm/-md/-lg` |
| Z-index | `--z-base` `--z-dropdown` `--z-sticky` `--z-modal` `--z-tooltip` |
| Motion | `--ease-out` `--duration-fast/-base/-slow` |

Status families (`error`/`success`/`warning`/`info`) come as matched bg + text +
border triples — pair them (`--bg-error` with `--text-error`, etc.) for guaranteed
contrast. The brand color is violet (`#6019ff`); the accent CTA color is orange.

## Theming

`:root` ships the **brand light** theme. Re-skinning is done by overriding the 16
**role** tokens on a scope element and setting its appearance flag — every semantic
token above is a pure function of these, so the whole UI recolors automatically:

```css
[data-appearance="dark"] .myScope {
  --role-canvas: var(--black-russian-900);
  --role-foreground: var(--white-100);
  --role-primary: var(--violet-400);
  /* …the other roles… */
}
```

The 16 roles: `--role-canvas` `--role-surface` `--role-surface-raised`
`--role-subtle` `--role-foreground` `--role-muted-foreground` `--role-primary`
`--role-on-primary` `--role-accent` `--role-accent-secondary` `--role-border`
`--role-border-subtle` `--role-red` `--role-green` `--role-yellow` `--role-blue`.
Set `data-appearance="light"` or `"dark"` on the wrapper. **Do not** redefine
semantic tokens directly — change roles and let them cascade.

## Component prop convention

Ambi's React components expose variants through props that emit `data-*`
attributes: `data-variant` (`default`/`error`/`success`/`warning`/`info`/`brand`),
`data-size` (`xs`/`sm`/`md`/`lg`), `data-mode` (`outline`/`ghost`). When you build
components, mirror that API and back each attribute with the matching token triple.
