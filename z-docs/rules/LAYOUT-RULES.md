<!-- Short rules for page layout, region sizing, and responsive behavior.
     Container queries (not viewport media queries) are the responsive
     mechanism; this file is their canonical rule home. Full explanation,
     examples, and pitfalls live in frontend/STYLES.md §12. -->

# BrainFlex Layout Rules

Short rules for page layout, layout-region sizing, and responsive behavior. The full explanation, code examples, and pitfalls are in [frontend/STYLES.md §12](../../frontend/STYLES.md). See also [STYLE-RULES.md](STYLE-RULES.md) for CSS/token conventions.

## Responsive strategy: container queries

Responsive behavior comes from **container queries**, not viewport media queries — a component adapts to the space _it_ is given, so the same component works in a wide board, a narrow sidebar, or a design-system demo cell. The reusable `Container` component (`frontend/src/components/Containers/Container.tsx`) is the component-level primitive (it requires a `name` and defaults to `inline-size`); `Kpi.module.css` is the reference example.

- **Default to `container-type: inline-size`.** Reach for `size` only when you must query height/aspect _and_ the element already has a layout-definite height (otherwise `size` collapses the block axis to 0).
- **A container's queried size must be layout-owned, never content-owned.** Only put `container-type` on a `flex: 1` item (with `min-width: 0`), a grid track, an explicitly-sized box, or a block/stretched child. Never on `flex: 0 0 auto` / auto-basis / `width: fit-content` — containment makes the content size ≈ 0 and the box collapses. Give sidebars a defined width before making them containers.
- **Name every container and query it by name** (`container-name`, or the `Container` component) — `@container <name> (…)`. A bare `@container` binds to the _nearest_ container, which silently breaks (or matches nothing) when nesting changes.
- **Children fill, then adapt:** content inside a container uses `width: 100%` / auto (never `fit-content`) and reacts via `@container`, ideally by flipping the component's manifest vars.
- **`var()` can't be used in `@container` conditions** — thresholds must be literal values (breakpoints aren't tokenizable like colors). Prefer `cqi` / `cqw` units for fluid sizing (values _can_ use `var()`); reserve a small fixed rem ladder for hard layout switches.
- **`container-type` makes the element a containing block for `position: fixed` / `absolute` descendants.** Don't make a region a container while it holds inline fixed overlays (modals, toasts, popovers) — portal those to the document root first.

## Layout containers today

The shared layout regions live in `frontend/src/components/Layout/`.

| Region                                     | Container?  | Why                                                                                                       |
| ------------------------------------------ | ----------- | --------------------------------------------------------------------------------------------------------- |
| `innerDisplay` (`container-name: display`) | ✅          | `flex: 1` (layout-owned width), no inline fixed descendants — descendants size to it via `@container display`. |
| `canvasBody`, `mainBodyDashboard`          | ⏳ deferred | Layout-owned, but hold inline `position: fixed` overlays (e.g. `SessionChat`). Gated on portaling overlays first. |
| `leftSidebar`, `rightSidebar`              | ❌ not yet  | Content-sized — need a defined width token before they can be containers.                                 |

When overlays are portaled, promote `canvasBody` / `mainBodyDashboard` to named containers; when sidebars get a width token, make them `container-name: sidebar`.
