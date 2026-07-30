# Ambi Frontend — Styling Conventions

This doc covers how component styles are organized in this codebase: the role-based theme palette, the local CSS-variable manifest each component exposes, the variant/size classes that flip it, and how it all fits together.

If you're adding or refactoring a component, read this first.

---

## 1. The Big Picture

There are **four layers** that decide what a pixel looks like, from broadest to narrowest:

| Layer                         | Defined in                                                                                                           | What it sets                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Theme roles                   | inline `--role-*` on `<html>` / a scope wrapper (written by `applyPalette`); brand light **and** dark defaults in `tokens.css`, selected by `data-appearance` | The 16 raw colour inputs a theme provides (`--role-canvas`, `--role-primary`, `--role-red`, …)           |
| Semantic tokens               | `frontend/src/tokens.css` (`:root, [data-appearance]`)                                                               | `--bg-canvas`, `--text-primary`, `--border-default`, … — each **derived from the roles** via `color-mix()` |
| Component manifest + variants | `**/*.module.css`                                                                                                    | Each component declares local vars (`--color`, `--padding`, …) and flips them via its own variant/size **classes** |
| Component styles              | `**/*.module.css`                                                                                                    | Properties read from the component's local vars                                                          |

A theme provides **16 role colours**; `tokens.css` fans them out into ~50 semantic tokens with `color-mix()`/`oklch()`, so swapping the 16 roles recolours the whole UI. Components consume the semantic tokens through their own manifest vars (never hard-coded values) and express variants/sizes as CSS-module classes. Themes are invisible to components — they only change the roles the semantic tokens derive from.

---

## 2. Theming — roles + appearance (not classes)

A theme is a **palette of 16 role colours plus an intrinsic light/dark appearance** — there is no separate light/dark toggle and there are no `theme-*` classes. `tokens.css` ships the built-in **brand** palette in both appearances — a light set on `:root, [data-appearance="light"]` and a dark set on `[data-appearance="dark"]`, so the un-themed app is brand-light and `data-appearance="dark"` alone is enough for a complete dark UI. A theme overrides whichever set applies by setting the 16 `--role-*` custom properties (and a `data-appearance` flag) on a target element; inline styles out-rank both blocks, and every semantic token re-derives automatically.

**How it's applied:**

- **Global theme** — `useTheme` (mounted once near the app root) resolves the user's `ThemeSpec` (server `preferences.theme` for registered users, `localStorage` for guests) and calls `applyPalette(document.documentElement, spec)`, which writes the 16 inline `--role-*` vars and `data-appearance="light"|"dark"` onto `<html>`. A null spec clears them, reverting to the brand defaults. — `src/shared/hooks/useTheme.ts`, `src/shared/utils/applyPalette.ts`
- **Per-deck scope** — the deck editor is the only surface that applies a deck's own theme today: `useDeckTheme` resolves the deck's `ThemeSpec` and `SlideDisplay` merges the `--role-*` vars + `data-appearance` directly onto its canvas element, overriding the global theme for that subtree. `DeckThemeScope` (`src/features/theme/components/DeckThemeScope.tsx`) offers the same resolution as a wrapper component for a `display: contents` subtree, documented for the whole-screen live-session surface — but nothing imports it yet, so a deck's theme does **not** currently apply to the live session (players and the host see the global/brand theme regardless of the deck's `themeId`).
- **Authoring** — the `ThemeEditor` lets a user build a palette from the 16 role swatches. — `src/shared/components/Theme/ThemeModal/ThemeEditor.tsx`

**The 16 roles** (written by `applyPalette`): `--role-canvas`, `--role-surface`, `--role-surface-raised`, `--role-subtle`, `--role-foreground`, `--role-muted-foreground`, `--role-primary`, `--role-on-primary`, `--role-accent`, `--role-accent-secondary`, `--role-border`, `--role-border-subtle`, `--role-red`, `--role-green`, `--role-yellow`, `--role-blue`.

**Appearance overrides** — the two blocks at the bottom of `tokens.css` hold the brand palette's 16 `--role-*` defaults for each appearance, plus the handful of tokens that can't auto-adapt from the role mixes (`--edge-tint`, `color-scheme`). Both are written out so a light scope nested in a dark global (or vice-versa) resets correctly. They have identical specificity, so **the dark block must stay last in the file** — source order is what lets it win.

> **The four status roles are a dual-purpose accent palette, not pure status.** `--role-red/green/yellow/blue` feed the status tokens (`--bg-error`, `--text-success`, …) **and** are used directly as chart series colours (`ParetoChart`, `DotPlot`, `LineChart`, `BarChart` read `var(--role-green)` etc.) **and** are shown to users as named "Red / Green / Yellow / Blue" swatches in the theme editor (`src/shared/utils/roleColors.ts`). They're kept colour-named deliberately — naming them `error/success/…` would misdescribe the chart and swatch uses.

Curated palettes are fully supported by this mechanism — a curated theme is just a preset set of 16 roles — and 6 ship today as DB-backed built-ins (Catppuccin Mocha/Latte, Dracula, One Dark, Gruvbox Dark/Light; see `backend/.../theme/BuiltInPalettes.java`). The brand appearances ("Ambi Light"/"Ambi Dark") are a separate, palette-less mechanism: they are never DB rows, and are resolved entirely from the appearance blocks above rather than a stored 16-role set — see [glossary](../z-docs/glossary.md).

---

## 3. Component CSS-Variable Manifest

Every variantizable component declares a manifest of local vars at the top of its main rule, drawn from this canonical slot list:

| Axis           | Var                  | Default fallback        | Flipped by                 |
| -------------- | -------------------- | ----------------------- | -------------------------- |
| **Color**      | `--color`            | `var(--text-primary)`   | `&.{variant}` class        |
|                | `--background-color` | `var(--bg-surface)`     | `&.{variant}` / `&.{fill}` |
|                | `--border-color`     | `var(--border-default)` | `&.{variant}` / `&.{fill}` |
| **Layout**     | `--padding`          | `var(--p-md)`           | `&.{size}` class           |
|                | `--gap`              | `var(--space-3)`        | `&.{size}` class           |
|                | `--radius`           | `var(--radius-md)`      | `&.{size}` class           |
|                | `--height`           | (component-specific)    | `&.{size}` class           |
|                | `--width`            | (component-specific)    | `&.{size}` class           |
|                | `--border-width`     | `1px`                   | (rarely flipped)           |
| **Typography** | `--font-size`        | `var(--font-size-base)` | `&.{size}` class           |
|                | `--font-weight`      | `400`                   | (rarely flipped)           |
|                | `--line-height`      | `1.4`                   | (rarely flipped)           |
| **State**      | `--opacity`          | `1`                     | (rarely flipped)           |

`{variant}` / `{size}` / `{fill}` are the prop values, applied as module classes (`styles[variant]`, …). Components opt into a subset — they only use the slots they need.

---

## 4. How variants flip the manifest

The base component rule **declares the manifest defaults**, and **local variant/size classes override them**. Because a component class plus a modifier class (`.btn.error`, specificity `(0,2,0)`) out-specifies the base rule (`.btn`, `(0,1,0)`), the override wins:

```css
.btn {
  /* manifest defaults */
  --color: var(--text-primary);
  --background-color: var(--bg-surface);
  --padding: var(--p-md);

  /* properties read the manifest */
  color: var(--color);
  background-color: var(--background-color);
  padding: var(--padding);

  /* variant flips a manifest slot — higher specificity, so it wins */
  &.error {
    --color: var(--text-error);
    --background-color: var(--bg-error);
  }
}
```

Every variant/size value a component supports therefore lives **once, in that component's module**, referencing the shared semantic tokens (`--text-error`, `--bg-error`, …). The semantic colours are centralised in `tokens.css`; what each component repeats is only the small mapping from its variant names to those tokens.

> A different approach — declaring the manifest _with_ `var(--name, fallback)` and flipping it from **global** `[data-variant]` rules instead of local classes — is described in §11 as a future consideration. It is **not** how the code works today.

---

## 5. Variant vocabulary (CSS-module classes)

Components expose their look through **props mapped to module classes** — `className={[styles.base, styles[variant], styles[size], …]}` — not `data-*` attributes. The catalog is per-component (each module defines the classes it supports); the common axes are:

### `variant` — colour slot

Sets the `--color` / `--background-color` / `--border-color` triple from the matched semantic tokens, so contrast holds in every theme. The widely-shared values:

| `variant` | Use for                       |
| --------- | ----------------------------- |
| `error`   | Destructive, failure states   |
| `success` | Confirmations, completion     |
| `warning` | Cautions, pending actions     |
| `info`    | Informational, neutral accent |
| `brand`   | Primary CTAs, brand emphasis  |

Some components add their own: `Btn`/`IconBtn` also have `primary`, `secondary`, `disabled`; `Badge` defaults to `info`; etc. The variant set is a per-component catalog, not one global enum.

### `size` — layout + typography

Sets `--padding`, `--font-size`, `--radius`, `--gap` (and component-specific `--height` / `--width` / `--min-height`). The shared ladder is `xs` / `sm` / `md` / `lg`.

### Component-specific axes

E.g. `Btn`/`IconBtn` `fill`: `default` (filled) / `bordered` (filled + matching border) / `ghost` (text-only) — composes with any `variant`.

### Native state (no class needed)

Interactive states use the platform selectors directly — `:disabled`, `:hover`, `[aria-disabled="true"]`, `[aria-selected="true"]`, `[aria-pressed="true"]`, etc.

---

## 6. Compositional Payoff

Each axis is an independent class flipping only its own manifest slots, so they stack without enumerating combinations:

```tsx
<Btn variant='error' size='sm' fill='ghost'>
  Delete
</Btn>
```

Renders as: error-red text, small padding/font, transparent background (ghost). No rule enumerates that specific combination — `error` set the colour triple, `sm` set the layout triple, `ghost` cleared the background.

---

## 7. Example: Btn

### `BtnTypes.ts`

```ts
export type BtnSize = "xs" | "sm" | "md" | "lg";
export type BtnVariant =
  | "primary" | "secondary" | "brand" | "info"
  | "error" | "success" | "warning" | "disabled";
export type BtnFill = "default" | "bordered" | "ghost";
export type BtnShape = "default" | "round" | "pill" | "avatar";
```

### `Btn.tsx` (excerpt)

```tsx
const Btn = ({ variant = "primary", fill = "default", size = "md", shape = "default", ... }: BtnProps) => (
  <button
    className={[styles.btn, styles[variant], styles[fill], styles[size],
                shape !== "default" && styles[shape], className]
      .filter(Boolean)
      .join(" ")}>
    {children}
  </button>
);
```

### `Buttons.module.css` (excerpt)

```css
.btn {
  /* manifest defaults */
  --padding: var(--p-md);
  --radius: var(--radius-lg);
  --color: var(--text-primary);
  --bg-fill: var(--bg-secondary);
  --background-color: var(--bg-fill);
  --border-color: transparent;

  color: var(--color);
  background-color: var(--background-color);
  border: var(--border-size-sm) solid var(--border-color);
  padding: var(--padding);
  border-radius: var(--radius);

  /* variant — colour slot */
  &.error {
    --color: var(--text-error);
    --bg-fill: var(--bg-error);
    --border-fill: var(--border-error);
  }

  /* fill — how the colour renders */
  &.ghost {
    --background-color: transparent;
    --border-color: transparent;
  }

  /* size — layout + type */
  &.sm {
    --padding: var(--p-pill-xs);
    --font-size: var(--font-size-xs);
    --radius: var(--radius-md);
  }

  /* shape — component-local concept */
  &.pill {
    border-radius: var(--radius-full);
  }
}
```

The variant/size/fill rules are **local to this module**, keyed by the class the component emits. The colours they reference (`--text-error`, `--bg-error`, …) are the shared semantic tokens, so every component's `error` resolves to the same theme-derived colour.

---

## 8. Decision Guide

When you reach for a styling change, ask:

1. **Is it a colour recolouring?** → use or add a `variant` class (flips the `--color` triple from semantic tokens).
2. **Is it a sizing change?** → use or add a `size` class (flips `--padding` / `--font-size` / `--radius` / `--gap`).
3. **Is it a fill treatment like bordered/ghost?** → use or add the component's `fill` class.
4. **Is it a native interactive state (disabled/hover/focus/checked)?** → use the platform selector (`:disabled`, `:hover`, `[aria-pressed]`).
5. **Is it component-specific layout (shape, slot positioning)?** → a module class on the component, like `.pill` on `Btn`.

If a change recolours via raw values instead of semantic tokens, or invents a variant name off the component's catalog, it's outside the system — reconsider, or widen the catalog deliberately.

---

## 9. Consistency status

The variant/size system is **class-based and consistent** across the component library: `Btn`, `IconBtn`, `Badge`, `Card`, `Toast`, `Modal`, and the form `Input` border all declare a manifest and flip it via local variant/size classes that reference the shared semantic tokens. A few components extend the pattern locally — `IconBtn` overrides `--height`/`--width` per size; `NavBar`/`DeckEditor` keep a component-local "sextet" of hover vars on top of the base triple; non-variant form primitives (checkbox/radio/toggle/dropdown/file) just consume tokens directly.

The repeated-per-component mapping (each module restating `&.error { --color: var(--text-error); … }`) is the known cost of the class-based approach. Centralising it into a global attribute-modifier system is a deliberate future option — see §11.

---

## 10. Naming Conventions Summary

- **CSS Module classes:** lowerCamelCase (`iconBtn`, `withBackground`). Stylelint enforces this. Variant/size/fill values are class names (`styles.error`, `styles.sm`).
- **Local manifest vars:** generic, unprefixed (`--color`, `--padding`).
- **Role vars:** `--role-*` — the 16 theme inputs, written by `applyPalette`.
- **Semantic tokens:** intent-named (`--bg-canvas`, `--text-error`), derived from roles in `tokens.css`.
- **`data-appearance`:** `"light"` / `"dark"`, set on the themed element to select the appearance overrides.

---

## 11. Future consideration — global `variant × size × mode` modifiers

Today variants are **CSS-module classes**, with each component restating its variant→token mapping locally (§4, §9). A candidate refactor would replace them with **global attribute modifiers**: `[data-variant]` / `[data-size]` / `[data-mode]` rules defined once in `tokens.css`, with components emitting `data-variant="error"` etc. and reading their manifest via `var(--name, fallback)`.

**Why it's tempting**

- Single source of truth — the variant/size triples defined once; every component identical, no drift.
- Orthogonal composition — `data-variant` × `data-size` × `data-mode` stack from independent global rules.
- HTML-native — variant state sits in the DOM beside the `[aria-*]` styling we already use.

**Why it isn't done (the real costs)**

- **Specificity discipline.** `[data-variant="error"]` is specificity `(0,1,0)` — identical to a component class `.btn`, and component CSS loads _after_ `tokens.css`, so any var **declared inside** the base rule beats the global modifier. Adopting this means rewriting every component to declare its manifest **only** via `var(--name, fallback)` and never inside the rule — the opposite of today's code (§4).
- **Modest payoff.** The colours are _already_ centralised in semantic tokens; what's duplicated is only a few-line mapping per component.
- **No shared catalog.** Components don't share one variant set (`Btn`'s `primary/secondary/disabled` + `fill`; `IconBtn`'s per-size sizing; the `NavBar` sextet), so a global schema still leaves component-local rules — a mixed model.
- **Lost typed linkage.** `styles[variant]` ties the prop to a real module export; `data-variant={variant}` is a raw string.

If taken on, do it as a proof-of-concept on `Btn` first, verified in Storybook, before any rollout.

---

## 12. Container Queries

Responsive behavior comes from **container queries**, never viewport media queries. A component should adapt to the space _it_ is given, not to the size of the window — so the same component works in a wide board, a narrow sidebar, or a design-system demo cell without knowing where it lives.

The mental model: separate two roles.

- **Who sizes the box?** The layout (flex / grid / explicit width).
- **What can a child query?** Whatever ancestor is marked a _query container_.

These don't conflict with flexbox — but a single element must not try to be both _sized by its content_ and a _query container_, or it collapses (see the rule below).

### 12.1 Default to `inline-size`

```css
.panel {
  container-type: inline-size; /* default — query the width */
}
```

`inline-size` contains only the inline axis (width); height still grows with content normally. Reach for `container-type: size` **only** when you genuinely need to query height/aspect-ratio **and** the element already has a layout-definite height — otherwise `size` collapses the block axis to 0. In practice that's rare; default to `inline-size`.

### 12.2 The queried size must be layout-owned, never content-owned

`container-type` makes the contained axis **independent of the element's contents** (that's how it avoids infinite query↔reflow loops). So the box must get that size from its layout context. If it's a flex item whose width comes from its _content_ (`flex: 0 0 auto` / auto basis / `width: fit-content`), containment makes the content size ≈ 0 and the box collapses.

```css
/* ✅ DO — width is layout-owned (flex:1 fills the track) */
.display {
  flex: 1;
  min-width: 0;
  container-type: inline-size;
}

/* ❌ DON'T — width is content-owned; container-type collapses it to 0,
   and any fit-content child then overflows the 0-width box. */
.sidebarPanel {
  display: flex; /* flex row, child has flex:0 1 auto / width:fit-content */
  container-type: inline-size;
}
```

A sidebar can absolutely be a container — but give it a **defined width** first (a token), so its width is layout-owned.

### 12.3 Name every container, and query by name

A bare `@container (…)` matches the **nearest** ancestor with `container-type` — which silently changes meaning (or matches nothing) as nesting evolves. We hit exactly this: a board query was written as `@container (min-width: 50rem)` with no container ancestor at all, so it never fired. Always name containers and target them explicitly:

```css
/* region */
.display {
  container-type: inline-size;
  container-name: display;
}

/* descendant, anywhere below */
@container display (min-width: 50rem) {
  .prompt {
    font-size: var(--font-size-2xl);
  }
}
```

For component-level containers use the **`Container` component** (`src/components/Containers/Container.tsx`); it requires a `name` and defaults to `inline-size`.

### 12.4 Children fill, then adapt

Inside a container, content fills it (`width: 100%` / auto — never `fit-content`) and reacts via `@container`, ideally by flipping the component's manifest vars (§3). `Kpi.module.css` is the reference:

```css
.kpi {
  min-width: 0;
  container-type: inline-size;
}
@container (width < 180px) {
  .kpi {
    --value-size: var(--font-size-md);
  }
}
```

### 12.5 Breakpoints aren't tokenizable; prefer fluid units

`var()` is **not allowed inside `@container` (or `@media`) conditions** — thresholds must be literal values. So container breakpoints can't be tokens the way colors and spacing are. Two consequences:

- Prefer **container-query units** (`cqi`, `cqw`) for fluid sizing where you can — they scale continuously and _can_ use `var()` in the value position, so you avoid hard breakpoints entirely.
- When you do need a hard layout switch, use a small, **consistent** rem ladder (documented here) rather than ad-hoc magic numbers.

### 12.6 Pitfall: containers trap `position: fixed`

`container-type` implies layout containment, which makes the element a **containing block for `position: fixed` and `absolute` descendants**. An inline `position: fixed` overlay (modal, toast, popover, drawer) rendered _inside_ a container is then positioned relative to that container instead of the viewport — i.e. it breaks.

The fix is the architecture you'd want anyway: **portal viewport-level overlays to the document root** (`createPortal`) so they aren't descendants of any layout region. Until overlays are portaled, don't make a region a container if it holds inline fixed overlays.

### 12.7 Where containers live today

| Region                                     | Container?  | Why                                                                                                                       |
| ------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| `innerDisplay` (`container-name: display`) | ✅          | `flex: 1` (layout-owned width); no inline fixed descendants — the board sizes to it.                                      |
| `canvasBody`, `mainBodyDashboard`          | ⏳ deferred | Layout-owned, but hold inline `position: fixed` overlays (e.g. `SessionChat`) — §12.6. Gated on portaling overlays first. |
| `leftSidebar`, `rightSidebar`              | ❌ not yet  | Content-sized — need a defined width token first (§12.2).                                                                 |

When overlays are portaled, promote `canvasBody` / `mainBodyDashboard` to named containers; when sidebars get a width token, make them `container-name: sidebar`.
