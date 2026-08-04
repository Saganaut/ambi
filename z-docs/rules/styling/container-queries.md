# Layout & Container Queries

**Rule:** Responsive behavior comes from **container queries**, not viewport media queries — a component adapts to the space *it* is given, so the same component works in a wide board, a narrow sidebar, or a component-gallery cell.

The reusable `Container` component (`frontend/src/shared/components/Containers/Container.tsx`) is the component-level primitive: it requires a `name` and defaults to `inline-size`. Reference example: `ItemBankRow/ScaleTracker.module.css`. Long-form treatment, worked examples, and pitfalls: [frontend/STYLES.md §12](../../../frontend/STYLES.md) — the rules below are canonical.

## Rules

- **Default to `container-type: inline-size`.** Reach for `size` only when you must query height/aspect *and* the element already has a layout-definite height (otherwise `size` collapses the block axis to 0).
- **A container's queried size must be layout-owned, never content-owned.** Only put `container-type` on a `flex: 1` item (with `min-width: 0`), a grid track, an explicitly-sized box, or a block/stretched child. Never on `flex: 0 0 auto` / auto-basis / `width: fit-content` — containment makes content size ≈ 0 and the box collapses. Give sidebars a defined width first.
- **Name every container and query it by name** (`container-name`, or the `Container` component) — `@container <name> (…)`. A bare `@container` binds to the *nearest* container, which silently breaks when nesting changes.
- **Children fill, then adapt:** content inside a container uses `width: 100%` / auto (never `fit-content`) and reacts via `@container`, ideally by flipping the component's manifest vars.
- **`var()` can't be used in `@container` conditions** — thresholds must be literal values. Prefer `cqi` / `cqw` units for fluid sizing (those *can* use `var()`); reserve a small fixed rem ladder for hard layout switches.
- **`container-type` makes the element a containing block for `position: fixed` / `absolute` descendants.** Don't make a region a container while it holds inline fixed overlays (modals, toasts, popovers) — portal those to the document root first.

## Layout containers today

Shared layout regions live in `frontend/src/shared/components/Layout/`.

| Region                                     | Container?  |
| ------------------------------------------ | ----------- |
| `innerDisplay` (`container-name: display`) | ✅          |
| `canvasBody`, `mainBodyDashboard`          | ⏳ deferred — hold inline `position: fixed` overlays |
| `leftSidebar`, `rightSidebar`              | ❌ not yet — content-sized, need a width token first |
