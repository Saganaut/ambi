# Elevation over Borders

**Rule:** Prefer a soft drop shadow (elevation) over a border to separate a surface from what's behind it. Reach for a border only where elevation can't do the job.

## The elevation tokens

Soft neutral drop shadows seeded from `#141414`, defined in [`tokens.css`](../../../frontend/src/tokens.css). The same shadow is used in light and dark appearance (they live in `:root`, not the `[data-appearance]` blocks).

| Token         | Value                  | Use                                            |
| ------------- | ---------------------- | ---------------------------------------------- |
| `--shadow-xs` | `0 1px 3px #14141433`  | Hairline lift — the border replacement on flat elements (chips, inputs, list rows). |
| `--shadow-sm` | `0 3px 10px #14141447` | Resting cards and tiles.                       |
| `--shadow-md` | `0 8px 24px #14141461` | Raised cards, dropdowns, menus. `--shadow` aliases this. |
| `--shadow-lg` | `0 16px 40px #14141475`| Modals, popovers, anything floating over content. |

Always consume `--shadow-*` (or `--shadow`) — never hand-write a `box-shadow` colour, and never use `rgb()`/`rgba()` (see [color-formats](color-formats.md); the tokens are authored in hex-with-alpha).

## How to apply

- **Separating a surface** (card, panel, dropdown, sheet) → `box-shadow: var(--shadow-sm)` (or `-md`/`-lg` by elevation). No `border`.
- **A flat control that used a 1px border** (input, chip, filled button) → `--shadow-xs` on the filled surface instead of `border` / the `--edge-*` tokens.
- **Hover/active elevation** → step up one token (`--shadow-sm` → `--shadow-md`), don't add a border.

## When a border is still allowed

Borders and the `--border-*` / `--edge-*` tokens are **not** deleted — they stay for the cases elevation can't express:

- **Focus indication** — `--border-focus` / `outline` on `:focus-visible` (accessibility; a shadow is not a reliable focus cue).
- **Status semantics** — `--border-error` / `--border-success` etc. where a coloured edge carries meaning (see [color-and-button-variants](color-and-button-variants.md)).
- **True dividers** — a `1px` rule between rows/sections where no surface is being lifted.
- **The `bordered` button fill** — an explicit, opt-in variant treatment.

The `--edge-*` tokens are neither: they're a **decorative** ~8% hairline (~`1.2:1` against their fill), far below the `3:1` WCAG 1.4.11 threshold, so an edge may never stand in for a meaningful boundary. The one legitimate reach is two same-coloured surfaces abutting where a shadow reads ambiguously or is dropped (forced-colours mode) and a faint seam aids perception.

If a separation need fits none of the above, raise it before hand-rolling a border.
