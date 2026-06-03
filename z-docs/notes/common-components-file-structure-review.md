# Common Components — File-Structure Review

Audit of `frontend/src/shared/components/Common/` against the updated
[Architecture Blueprint](../rules/FRONTEND-FILE-STRUCTURE.md) and
[Frontend Rules](../rules/FRONTEND-RULES.md). Captures the gaps introduced (or
left untouched) by the recent frontend restructuring.

_Reviewed: 2026-06-03 · 22 component folders + 3 loose root files._

---

## TL;DR — priority list

| #   | Issue                                                                                    | Rule                                             | Severity |
| --- | ---------------------------------------------------------------------------------------- | ------------------------------------------------ | -------- |
| 1   | `Common/` itself isn't in the blueprint — it's a legacy catch-all                        | [Blueprint](../rules/FRONTEND-FILE-STRUCTURE.md) | High     |
| 2   | `TagPicker` is a data-fetching (RTK Query) component living in the props-only base layer | Rules 7, 32                                      | High     |
| 3   | Hooks used in `Common` components (Avatar, Tabs, Tooltip, Toast, TagPicker)              | Rule 32                                          | High     |
| 4   | `Badge` lives as loose files at the `Common/` root, sharing `Common.module.css`          | Blueprint, Rule 5                                | Medium   |
| 5   | `Analytics/` is an empty directory                                                       | —                                                | Medium   |
| 6   | Deck-domain components (`DeckCard`, `DeckActionButton`) in the domain-agnostic layer     | Rule 27, Blueprint L4                            | Medium   |
| 7   | `TagPicker` has no storybook                                                             | Rule 34                                          | Medium   |
| 8   | `ErrorBoundary` uses an inline `export class`                                            | Rule 23                                          | Low      |
| 9   | Sparse co-located tests (only 3 of 22 folders)                                           | Rule 19                                          | Low      |

---

## 1. `Common/` is not part of the blueprint

The [blueprint](../rules/FRONTEND-FILE-STRUCTURE.md) defines the shared design
system under three groupings:

```
shared/components/
├── Layout/        # Navbars, Sidebars, Grids
├── Forms/         # Buttons, TextFields, Switches
└── [UI-Element]/  # Modals, Dropdowns, etc.
```

There is **no `Common/` folder** in the model. `Common/` is a pre-restructuring
catch-all, and the codebase is now mid-migration — `shared/components/` already
has blueprint-conformant `Layout/` and `Forms/` siblings next to `Common/`:

```
shared/components/  →  AuthenticatedLayout/ Common/ ConfirmDialog/ Containers/
                       DeckEditor/ Forms/ Graphic/ Layout/ Leaderboard/ Media/
                       Menus/ Modal/ Nav/ PlayerInfo/
```

**Recommendation:** treat `Common/` as a holding pen to be drained. Its contents
map cleanly onto the blueprint buckets:

- **→ `Forms/`**: `Buttons/` (Btn, IconBtn, CollapseBtn, ColorOptionBtn, SplitBtn), `TagPicker` (after the data split — see §2), `StarRating`, `FavoriteHeart`, `SelectableTile`.
- **→ a UI-Element bucket** (Modals/Dropdowns/feedback): `Alert`, `Toast`, `Tooltip`, `Badge`, `Tag`, `Divider`, `Skeleton`, `Loader`, `ProgressBar`, `Pagination`, `Tabs`, `EmptyState`, `Cards/`, `Avatar`, `ErrorBoundary`.
- **→ `features/decks/`** (domain-specific — see §6): `Cards/DeckCard`, `Buttons/DeckActionButton`.

Note this is a larger lift than the items below; the rest of this report is
actionable independently of whether the full re-bucketing happens now.

---

## 2. `TagPicker` is a data-bound component in the props-only layer

`TagPicker.tsx` is the single worst fit for `shared/components`. The blueprint's
Layer 4 is the "universal **domain-agnostic** base layer" of "Pure Design System
components (**Driven strictly by props**)". `TagPicker` instead:

- Calls `useListTagsQuery`, `useCreateTagMutation`, and dispatches
  `Ambi.util.updateQueryData(...)` — it owns network I/O and cache mutation
  (violates **Rule 7**: server state via RTK Query, and the props-only contract).
- Holds local state with `useState` / `useRef` / `useMemo` (violates **Rule 32**).
- Is coupled to the `/api/tags` domain — not domain-agnostic.

It's consumed in 3 places, all decks/design-system:
`features/decks/components/DeckEditor/RightSidebar/DeckCategorizePanel.tsx`,
`.../EditSlideSections/ElementTagsSection.tsx`, and
`pages/DesignSystemPage/FormsSection.tsx`.

**Recommendation:** split it. Keep a presentational `TagPicker` (props only:
`tags`, `value`, `onChange`, `onCreate`, `isLoading`) in `Forms/`, and move the
data-binding (query + create + cache upsert) into a `features/`-level container
or hook. This also unblocks the storybook (§7) — the presentational shell is
trivially story-able without MSW.

---

## 3. Hooks inside `Common` components (Rule 32)

> Rule 32: "Anything in `components/Common` should only carry props, no hooks.
> The components should be simple enough that any styling logic fits within the
> component."

Five components break this:

| Component   | Hooks                                       | Notes                                                                                    |
| ----------- | ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `TagPicker` | `useState`, `useRef`, `useMemo` + RTK Query | See §2 — the egregious case.                                                             |
| `Toast`     | `useEffect`                                 | Auto-dismiss timer. Could be lifted to the `ToastProvider`/container so `Toast` is pure. |
| `Tooltip`   | `useState`, `useId`                         | Hover/focus visibility + a11y id.                                                        |
| `Tabs`      | `useId`, `useRef`                           | Roving-tabindex keyboard nav + ARIA ids.                                                 |
| `Avatar`    | `useState`                                  | Single `errored` flag for image-load fallback.                                           |

The Rule 32 / Rule 33 tension is worth flagging to the team: Rule 33 says
"anything in components that has its own directory **can** have hooks, such as
modals," but Rule 32 carves `Common` out as props-only. As written, **Rule 32
wins for `Common`**, so the table above are violations.

Realistically `Avatar`, `Tooltip`, and `Tabs` need _some_ local state (image
fallback, hover, roving focus) to do their job accessibly. Two paths:

1. **Move them out of `Common`** into a blueprint UI-Element bucket where the
   per-directory hook allowance (Rule 33) applies, or
2. **Amend the rules** to permit purely-local, non-network UI state (no data
   fetching) for self-contained `Common` widgets, and document the exception
   per **Rule 12**.

Either way, `Toast`'s timer and `TagPicker`'s data layer should be lifted
regardless — those aren't intrinsic-UI state.

### Resolution (2026-06-03)

**Decision: move out of `Common` (path 1).** Rule 32 stays literal — `Common`
remains strictly props-only and is treated as a holding pen to be drained (§1).
A shared widget that legitimately needs its own intrinsic UI state (`Avatar`'s
image-fallback flag, `Tooltip`'s hover/focus + `useId`, `Tabs`' roving tabindex)
does **not** get a `Common` hook exception; it relocates into a blueprint
UI-Element bucket (`Layout/`, `Forms/`, or a `[UI-Element]/` folder) where Rule
33's per-directory hook allowance already applies. This avoids forking the rules
and keeps the resolution aligned with the §1 direction.

Recorded in [FRONTEND-RULES](../rules/FRONTEND-RULES.md) as a reconciling clause
between the two Component-Design bullets, which also restates the hard line that
holds in either bucket: data fetching (RTK Query), cache mutation, and store
dispatch never belong in any shared design-system component (§2's `TagPicker`
split, already done). The widget relocations themselves are mechanical follow-up
tracked under the §1 `Common`-drain re-bucketing, not a rules question.

---

## 4. `Badge` — loose files at the `Common/` root

`Badge.tsx` and `Badge.stories.tsx` sit directly in `Common/` rather than in a
`Badge/` folder, and `Badge` is the **only** consumer of the root
`Common.module.css` (78 lines, all `.badge` variants/sizes).

Violations:

- No per-component directory (every other component has one).
- **Rule 5 / co-location**: styles should be a sibling `Badge.module.css`, not a
  shared catch-all stylesheet. `Common.module.css` is effectively dead weight
  once Badge is folderized.
- No test.

**Recommendation:** create `Badge/`, move `Badge.tsx` + `Badge.stories.tsx` in,
rename `Common.module.css` → `Badge/Badge.module.css`, delete the root stylesheet.

---

## 5. `Analytics/` is empty

`Common/Analytics/` contains no files — a placeholder left by the restructuring.
Remove it (or populate it if something is planned). Empty dirs read as "in
progress" and clutter the tree.

---

## 6. Deck-domain components in the domain-agnostic layer (Rule 27)

> Rule 27: "If a component is used in more than one parent component it belongs
> in common, otherwise it belongs under its page/feature component folder."

Two components are both single-parent **and** deck-domain-specific, so they fail
Rule 27 and the "domain-agnostic" intent of Layer 4:

| Component                  | Sole consumer                                           |
| -------------------------- | ------------------------------------------------------- |
| `Cards/DeckCard`           | `features/decks/views/MyDecksPage/DeckCardWithMenu.tsx` |
| `Buttons/DeckActionButton` | `features/decks/views/MyDecksPage/DeckCardWithMenu.tsx` |

**Recommendation:** relocate both under `features/decks/` (e.g. a
`features/decks/components/` folder). `DeckCard` also transitively pulls in
`FavoriteHeart` (its only consumer) — decide whether `FavoriteHeart` stays a
shared primitive or moves with it.

---

## 7. `TagPicker` has no storybook (Rule 34)

> Rule 34: "Anything in components should carry its own storybook."

`TagPicker` is the only `Common` component with no `*.stories.tsx`. This is
already tracked in [storybook-stories-todo](storybook-stories-todo.md) as
blocked on the deck/slide API migration (it's data-bound). The §2 presentational
split is the clean unblock — a props-only `TagPicker` stories without MSW.

(That TODO note still references the pre-restructuring path
`frontend/src/components/Common/`; it should be updated to
`frontend/src/shared/components/Common/`.)

---

## 8. `ErrorBoundary` — inline `export class` (Rule 23)

> Rule 23: "Avoid default exports and inline `export const`," with a standalone
> `export { ComponentName }` at the bottom.

`ErrorBoundary.tsx:24` declares `export class ErrorBoundary extends Component`.
The class component itself is unavoidable (error boundaries require
`componentDidCatch`/`getDerivedStateFromError`) and should be documented as a
**Rule 12** exception — but the _export style_ is still fixable: drop the inline
`export` and add `export { ErrorBoundary }` at the bottom for consistency.

It also has no test, despite being the app's last line of defense against a
blank-screen crash (§9).

---

## 9. Sparse co-located tests (Rule 19)

Only **3 of 22** component folders carry a `*.test.tsx`: `Alert`, `Buttons/Btn`,
`Pagination`. Rule 19 mandates co-located tests; while it doesn't force a test
for _every_ trivial presentational component, the higher-logic ones are worth
covering — priority candidates: `Tabs` (keyboard nav), `Tooltip` (focus/hover
a11y), `Avatar` (fallback chain), `Toast` (auto-dismiss timer), and
`ErrorBoundary` (catch + fallback render). Lower priority for pure pass-through
visuals (`Divider`, `Skeleton`, `Badge`, `Tag`).

---

## Quick-win checklist

These are mechanical and independent of the larger §1 re-bucketing:

- [x] Folderize `Badge` + rename `Common.module.css` → `Badge/Badge.module.css` (§4).
- [x] Delete the empty `Analytics/` directory (§5).
- [x] Convert `ErrorBoundary` to a bottom-of-file `export { ErrorBoundary }` and document the class-component exception (§8).
- [x] Fix the stale path in [storybook-stories-todo](storybook-stories-todo.md) (§7).
- [x] Lift `Toast`'s `useEffect` timer into its container (§3).

Larger, coordinated work:

- [x] Split `TagPicker` into a props-only shell + feature-level data container (§2, §3, §7). `useTagPickerData` hook in `shared/hooks/`; `TagPicker.stories.tsx` added.
- [x] Relocate `DeckCard` / `DeckActionButton` (and decide on `FavoriteHeart`) into `features/decks/` (§6). All three moved to `features/decks/components/`; `FavoriteHeart` moved with them (deck-specific).
- [x] Resolve the Rule 32 vs Rule 33 hook tension for self-contained UI widgets and document the outcome (§3). Outcome: keep `Common` props-only, move hook-bearing widgets out into UI-Element buckets; recorded in [FRONTEND-RULES](../rules/FRONTEND-RULES.md).
