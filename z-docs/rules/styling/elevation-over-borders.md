# Elevation over Borders

**Rule:** Prefer a soft drop shadow (elevation) over a border to separate a surface from what's behind it. Reach for a border only where elevation can't do the job.

## Why

Borders draw a hard line around every box; on a busy screen they stack into visual noise and fight the theme's palette. A soft shadow lifts a surface off the canvas instead of outlining it — quieter, more modern, and it reads as depth rather than a cage. This is a deliberate design shift: the default separator is now **light**, not **ink**.

## The elevation tokens

Soft neutral drop shadows seeded from `#959da5`, defined in [`tokens.css`](../../../frontend/src/tokens.css). The same shadow is used in light and dark appearance (they live in `:root`, not the `[data-appearance]` blocks).

| Token         | Value                  | Use                                            |
| ------------- | ---------------------- | ---------------------------------------------- |
| `--shadow-xs` | `0 1px 3px #959da533`  | Hairline lift — the border replacement on flat elements (chips, inputs, list rows). |
| `--shadow-sm` | `0 3px 10px #959da547` | Resting cards and tiles.                       |
| `--shadow-md` | `0 8px 24px #959da561` | Raised cards, dropdowns, menus. `--shadow` aliases this. |
| `--shadow-lg` | `0 16px 40px #959da575`| Modals, popovers, anything floating over content. |

Always consume `--shadow-*` (or `--shadow`) — never hand-write a `box-shadow` colour, and never use `rgb()`/`rgba()` (see [color-formats](color-formats.md); the tokens are authored in hex-with-alpha).

## How to apply

- **Separating a surface** (card, panel, dropdown, sheet) → `box-shadow: var(--shadow-sm)` (or `-md`/`-lg` by elevation). No `border`.
- **A flat control that used a 1px border** (input, chip, secondary button) → `--shadow-xs` on the filled surface instead of `border` / the `--edge-*` tokens.
- **Hover/active elevation** → step up one token (`--shadow-sm` → `--shadow-md`), don't add a border.

## When a border is still allowed

Borders and the `--border-*` / `--edge-*` tokens are **not** deleted — they stay for the cases elevation can't express:

- **Focus indication** — `--border-focus` / `outline` on `:focus-visible` (accessibility; a shadow is not a reliable focus cue).
- **Status semantics** — `--border-error` / `--border-success` etc. where a coloured edge carries meaning (see [color-and-button-variants](color-and-button-variants.md)).
- **True dividers** — a `1px` rule between rows/sections where no surface is being lifted.
- **The `bordered` button fill** — an explicit, opt-in variant treatment.

If a separation need fits none of the elevation tokens and isn't one of the above, raise it before hand-rolling a border.
