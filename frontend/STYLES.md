# BrainFlex Frontend — Styling Conventions

This doc covers how component styles are organized in this codebase: the local CSS-variable manifest each component exposes, the portable `data-*` modifiers that compose against it, how theme classes layer in, and how it all fits together.

If you're adding or refactoring a component, read this first.

---

## 1. The Big Picture

There are **four layers** that decide what a pixel looks like, in order from broadest to narrowest:

| Layer            | Defined in                                        | What it sets                                              |
| ---------------- | ------------------------------------------------- | --------------------------------------------------------- |
| Semantic tokens  | `frontend/src/tokens.css` (`:root`)               | `--bg-canvas`, `--text-primary`, `--border-default`, etc. |
| Theme overrides  | `frontend/src/tokens.css` (`:root.theme-*`)       | Same tokens, redefined for dark / custom modes            |
| Modifiers        | `frontend/src/tokens.css` (`[data-variant=...]`)  | Component vars (`--color`, `--padding`, etc.)             |
| Component styles | `**/*.module.css`                                 | Properties read **only** from component vars              |

Components never reference semantic tokens directly inside property declarations. They consume **component-scoped CSS variables** with a fallback to the semantic token. Modifiers set those variables. Themes are invisible to components — they just redefine the semantic tokens that everything else cascades from.

---

## 2. Theme Classes (still in force)

Theme classes live on `<html>` and are toggled by `useTheme`. They redefine semantic tokens (`--bg-canvas`, `--text-primary`, etc.) at the document root. **Don't touch these from component CSS.** The modifier rules and component rules below cascade through them automatically.

| Class                          | When applied                                                           | Effect                                            |
| ------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------- |
| (none)                         | Default: light mode, brand-color defaults                              | Light tokens from named brand palette             |
| `.theme-dark`                  | Dark mode active                                                       | Dark tokens from named brand palette              |
| `.theme-custom`                | User has engaged hue picker                                            | Tokens are derived from `--hue-primary` / `--hue-accent` (light) |
| `.theme-custom.theme-dark`     | Custom hue + dark mode                                                 | Hue-derived dark tokens                           |

All four states are exercised today and must continue to work after any styling change. Components and modifiers reference semantic tokens (e.g. `--text-error`) — those tokens get redefined by these classes, so variants automatically render correctly in every theme.

---

## 3. Component CSS-Variable Manifest

Every variantizable component declares a manifest of local vars at the top of its main rule, drawn from this canonical slot list:

| Axis           | Var                  | Default fallback         | Flipped by              |
| -------------- | -------------------- | ------------------------ | ----------------------- |
| **Color**      | `--color`            | `var(--text-primary)`    | `[data-variant]`        |
|                | `--background-color` | `var(--bg-surface)`      | `[data-variant]`        |
|                | `--border-color`     | `var(--border-default)`  | `[data-variant]`        |
| **Layout**     | `--padding`          | `var(--p-md)`            | `[data-size]`           |
|                | `--gap`              | `var(--space-3)`         | `[data-size]`           |
|                | `--radius`           | `var(--radius-md)`       | `[data-size]`           |
|                | `--height`           | (component-specific)     | `[data-size]`           |
|                | `--width`            | (component-specific)     | `[data-size]`           |
|                | `--border-width`     | `1px`                    | (rarely flipped)        |
| **Typography** | `--font-size`        | `var(--font-size-base)`  | `[data-size]`           |
|                | `--font-weight`      | `400`                    | (rarely flipped)        |
|                | `--line-height`      | `1.4`                    | (rarely flipped)        |
| **State**      | `--opacity`          | `1`                      | (rarely flipped)        |

Components opt into a subset — they only use the slots they need.

---

## 4. The `var(--name, fallback)` Pattern (the load-bearing rule)

**Do not declare local vars inside the component rule.** Read them with the fallback syntax instead:

```css
/* ✅ Correct — component reads vars with fallbacks */
.btn {
  color: var(--color, var(--text-primary));
  background-color: var(--background-color, var(--bg-surface));
  padding: var(--padding, var(--p-md));
  border-radius: var(--radius, var(--radius-md));
}

/* ❌ Wrong — declaring the var inside the component rule */
.btn {
  --color: var(--text-primary);   /* this declaration wins against modifiers */
  color: var(--color);
}
```

**Why:** CSS Modules scope class names, not custom properties. A component class (e.g. `.btn`) and an attribute selector (e.g. `[data-variant="error"]`) have equal specificity `(0,1,0)`. The cascade resolves equal-specificity rules by source order, and component CSS imports **after** `tokens.css` — so a `--color` declaration *inside* `.btn` would override the one set by `[data-variant="error"]` and every variant would silently be a no-op.

The `var(--name, fallback)` pattern sidesteps the fight entirely: the component never *declares* the var. If a modifier set it, that value is used; otherwise, the fallback (the default token) is used.

---

## 5. Modifier Vocabulary (defined once in `tokens.css`)

Components consume their variant/size/mode by reading vars. Modifiers set those vars via `data-*` attributes on the element. Apply them with React props or directly in JSX.

### `data-variant` — color triplet

Sets `--color`, `--background-color`, `--border-color`. Guaranteed-contrast because each variant uses the matched `--text-*` / `--bg-*` / `--border-*` triple from `tokens.css`.

| `data-variant=` | Use for                       |
| --------------- | ----------------------------- |
| `default`       | Neutral / surface elements    |
| `error`         | Destructive, failure states   |
| `success`       | Confirmations, completion     |
| `warning`       | Cautions, pending actions     |
| `info`          | Informational, neutral accent |
| `brand`         | Primary CTAs, brand emphasis  |

### `data-size` — layout + typography

Sets `--padding`, `--font-size`, `--radius`, `--gap`.

| `data-size=` | Padding   | Font          | Radius          |
| ------------ | --------- | ------------- | --------------- |
| `xs`         | `--p-xxs` | `--font-size-xs`   | `--radius-sm`   |
| `sm`         | `--p-sm`  | `--font-size-xs`   | `--radius-md`   |
| `md`         | `--p-md`  | `--font-size-base` | `--radius-md`   |
| `lg`         | `--p-lg`  | `--font-size-lg`   | `--radius-lg`   |

### `data-mode` — style modes

Composes with whatever `data-variant` set.

| `data-mode=` | Effect                                                              |
| ------------ | ------------------------------------------------------------------- |
| `outline`    | Transparent fill, border picks up current `--color`                 |
| `ghost`      | Transparent fill and border                                         |

### Native state attributes (no modifier needed)

Use the platform attributes — components style them directly via `:disabled`, `[aria-disabled="true"]`, `[aria-selected="true"]`, `[aria-pressed="true"]`, etc.

---

## 6. Compositional Payoff

Because each modifier flips only its own subset, they stack without combinatoric blowup:

```tsx
<Btn variant="error" size="sm" mode="outline">
  Delete
</Btn>
```

Renders as: error-red text, small padding/font, transparent background, red border. No CSS rule had to enumerate that combination — `data-variant="error"` set the color triple, `data-size="sm"` set the layout triple, `data-mode="outline"` overrode background and pointed the border at `--color`.

---

## 7. Example: Btn (after refactor)

### `BtnTypes.ts`

```ts
export type BtnVariant =
  | "default"
  | "error"
  | "success"
  | "warning"
  | "info"
  | "brand";
export type BtnSize = "xs" | "sm" | "md" | "lg";
export type BtnMode = "outline" | "ghost";
export type BtnShape = "default" | "round" | "pill";
```

### `Btn.tsx` (excerpt)

```tsx
const Btn = ({ variant = "default", size = "md", mode, ... }: BtnProps) => (
  <button
    data-variant={variant}
    data-size={size}
    data-mode={mode}
    className={[styles.btn, shape !== "default" && styles[shape]]
      .filter(Boolean)
      .join(" ")}
  >
    {children}
  </button>
);
```

### `Buttons.module.css` (excerpt)

```css
.btn {
  color: var(--color, var(--text-primary));
  background-color: oklch(
    from var(--background-color, var(--bg-surface)) l c h / 20%
  );
  border-color: var(--border-color, currentcolor);
  padding: var(--padding, var(--p-md));
  border-radius: var(--radius, var(--radius-lg));
  font-size: var(--font-size, var(--font-size-md));

  /* Component-specific shape — module class, not a global modifier. */
  &.pill {
    border-radius: var(--radius-full);
  }
}
```

Notice what the component **doesn't** have anymore: per-variant rule blocks (`&.error`, `&.success`, ...), per-size rule blocks (`&.sm`, `&.md`, ...). Those live in `tokens.css` once and apply to any element wearing the data attributes.

---

## 8. Decision Guide

When you reach for a styling change, ask:

1. **Is it a color recoloring?** → use or add a `data-variant`.
2. **Is it a sizing change?** → use or add a `data-size`.
3. **Is it a style-mode like outline/ghost?** → use or add a `data-mode`.
4. **Is it a native interactive state (disabled/hover/focus/checked)?** → use the platform attribute / pseudo-class (`:disabled`, `:hover`, `aria-pressed`).
5. **Is it component-specific layout (shape, slot positioning)?** → a module class on the component, like `.pill` on `Btn`.

If a change feels like it doesn't fit any of those, it might be reaching for a new global concept — open an issue / PR before inventing a one-off pattern.

---

## 9. Migration Status

| Component         | State            | Notes                                                     |
| ----------------- | ---------------- | --------------------------------------------------------- |
| `Btn`             | ✅ Migrated      | Reference example                                         |
| `IconBtn`         | ✅ Migrated      | Shares `data-size` vocabulary but locally overrides height/width/padding to icon-appropriate dimensions (see `&[data-size="..."]` blocks in `Buttons.module.css`). |
| `Card`            | ✅ Migrated      | Card now accepts `variant` + `size` props that flow through data-attributes. |
| `Toast`           | ✅ Migrated      | Per-component status blocks removed; `data-variant` on the toast element. |
| `Modal`           | ✅ Migrated      | Added missing `--color`; dialog accepts an optional `variant` prop. |
| `NavBar`          | ✅ Migrated      | Sextet hover-vars retained as a component-local extension; base triplet variantizable via global `[data-variant]`. |
| `DeckEditor` | ✅ Migrated      | Same sextet pattern as NavBar.                            |
| `Badge`           | ✅ Migrated      | Drops per-component status blocks; default variant stays `info`. |
| `Input`           | ✅ Partial       | `<input>` border now respects `data-variant`; error message auto-sets `data-variant="error"`. Other form primitives (checkbox/radio/toggle/dropdown/file/huepicker) still hardcode tokens — fine, they don't need variants. |
| `Forms`           | ➖ Skipped       | Layout container, not a variantizable primitive — left alone. |
| Page-level / rest | ⏳ Pending       | Full sweep — low urgency                                  |

---

## 10. Naming Conventions Summary

- **CSS Module classes:** lowerCamelCase (`iconBtn`, `withBackground`). Stylelint enforces this.
- **Local CSS vars:** generic, unprefixed (`--color`, `--padding`). Required for portable modifiers.
- **`data-*` attribute values:** lowercase, no prefix (`data-variant="error"`, `data-size="sm"`).
- **Theme classes:** kebab-case (`theme-dark`, `theme-custom`) — these are the exception, set by JS and require `/* stylelint-disable-next-line selector-class-pattern */` in `tokens.css`.

---

## 11. Why Not Class-Based Variants?

Earlier exploration considered `:global(.variantError)` utility classes instead of `[data-variant="error"]` attribute selectors. Both work; this codebase chose `data-*` because:

- TypeScript polices the variant vocabulary via the React prop type — typos can't reach the DOM.
- The DOM self-documents: `<button class="btn_abc" data-variant="error">` makes the structural class and semantic axis visually distinct.
- Variants stack with native HTML state (`[data-variant="error"][aria-disabled="true"]`) without combinatoric class concatenation.
- No need for `:global()` indirection in CSS Modules.

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
.display { container-type: inline-size; container-name: display; }

/* descendant, anywhere below */
@container display (min-width: 50rem) { .prompt { font-size: var(--font-size-2xl); } }
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

| Region                                | Container?                        | Why                                                                                            |
| ------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------- |
| `innerDisplay` (`container-name: display`) | ✅                                | `flex: 1` (layout-owned width); no inline fixed descendants — the board sizes to it.           |
| `canvasBody`, `mainBodyDashboard`     | ⏳ deferred                       | Layout-owned, but hold inline `position: fixed` overlays (e.g. `SessionChat`) — §12.6. Gated on portaling overlays first. |
| `leftSidebar`, `rightSidebar`         | ❌ not yet                        | Content-sized — need a defined width token first (§12.2).                                       |

When overlays are portaled, promote `canvasBody` / `mainBodyDashboard` to named containers; when sidebars get a width token, make them `container-name: sidebar`.
