# Spacing Hierarchy

**Rule:** Spacing has two tiers — component tokens (`--p-*`, `--gap-*`) inside a component, layout tokens (`--stack-*`, `--gutter-*`) between and around large components — and hierarchy comes from stepping the ladder: outer spacing is always at least one step larger than the spacing inside it.

## Two vocabularies, never mixed

| Tier      | Tokens                                             | Use for                                                                |
| --------- | -------------------------------------------------- | ---------------------------------------------------------------------- |
| Component | `--p-*` shape sets, `--gap-xxs…xl`                 | Inside a control: button padding, icon–label gap, fields within a form |
| Layout    | `--stack-sm…xl`, `--gutter-sm…xl`, `--gutter-fluid` | Between sibling cards/panels/sections; a region's own edge inset       |

- `--stack-*` **separates siblings** — grid/flex `gap` between cards, panels, page sections.
- `--gutter-*` **insets edges** — a page, panel, or dialog's own padding. Compose per axis like the `--p-*` sets: `padding: var(--gutter-lg) var(--gutter-sm)`.
- Raw `--space-*` stays for defining tokens and true one-offs (absolute offsets, `scroll-margin`), not day-to-day padding/gap.
- Never use `--gap-*` to separate panels, and never use layout tokens inside a control — the prefix makes misuse visible in review.

## The ladder

| Step | Value               | Stack (between siblings)                  | Gutter (edge inset)                  |
| ---- | ------------------- | ----------------------------------------- | ------------------------------------ |
| `sm` | `--space-4` (16px)  | Cards in a dense grid, tile lists         | App-page inline inset, sidebars      |
| `md` | `--space-6` (24px)  | Default card/panel grid gap               | Cards, dialogs, marketing inline     |
| `lg` | `--space-8` (32px)  | Panel-to-panel, app-page section breaks   | App-page block inset                 |
| `xl` | `--space-12` (48px) | Page-section boundaries (marketing/docs)  | Marketing/doc-page block inset       |

`--gutter-fluid` is a `clamp(…cqi…)` inline gutter that tightens in narrow containers (per the [container-queries rule](container-queries.md), `cqi` — unlike `@container` conditions — composes with `var()`).

## Rules

1. **Outer ≥ inner, by at least one ladder step.** A container's gap between children must exceed the gaps *inside* those children, and its padding should be ≥ its own gap. Nesting only reads as grouping when space steps up at each level: content inside a card `--gap-sm` (8) → cards in a grid `--stack-md` (24) → sections apart `--stack-xl` (48).
2. **Parents own spacing.** Siblings are separated by the parent's `gap`; children never use margins to position themselves. Where document flow forces margins (stacked page sections), use one direction only (`margin-bottom`) with `--stack-*` values.
3. **Adapt via containers, not viewport.** A large component tightens its `--gutter-*`/`--stack-*` by flipping its manifest vars in `@container` blocks or via `--gutter-fluid` — the same card must work in the board, a sidebar, or a gallery cell.
4. **Manifest integration.** Large components expose the standard `--padding` / `--gap` [manifest slots](tokens-and-variables.md) and default them to layout tokens (`--padding: var(--gutter-md)`); size/variant classes flip the slot, not the property.

## Enforcement

`frontend/stylelint.config.mjs` bans `var(--space-*)` in `padding*`, `margin*`, and `gap` properties
(`declaration-property-value-disallowed-list`, *error* severity). Positioned offsets
(`top`/`inset-*`), `scroll-margin`, and token definitions — including named component-local
custom properties such as a `--floating-bar-clearance: var(--space-16)` that document a
deliberate one-off — are outside the rule's property set by design; a ratified one-off that
must stay on a flagged property carries a `stylelint-disable-next-line` with a reason.

## Reference example

`frontend/src/features/deck/views/MyDecksPage/MyDecksPage.module.css` — page inset `var(--gutter-lg) var(--gutter-sm)`, header-to-body `--stack-md`, section breaks `--stack-lg`, while everything inside the tabs/cards stays on component-tier tokens.
