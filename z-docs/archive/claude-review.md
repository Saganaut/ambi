# Frontend Code Review — `frontend/src`

A focused audit of the React 19 + TypeScript codebase, covering duplication,
missed component reuse, convention drift, and design-token violations. Findings
within each section are ordered by impact (most worth a developer's time first).

---

## 1. Duplication

### 1.1 Slide-content editor boilerplate (highest impact, applies to ~9 files)

Every kind-specific editor in
`frontend/src/components/CreateDashboard/SlideContentTypes/` rewrites the
same four-step pattern:

1. Call `useElementEditor<TKind>(isKind)`.
2. Declare a `useState` for every editable field.
3. Run a "derive state during render" resync (`if (element && syncedFromId !== element.id) { ... }`).
4. Define a `buildPatch(overrides): TKind => ({ ...element, ...allLocalFields, ...overrides })`.

Concrete instances (file:line ranges of the duplicated block):

- `SlideContent.tsx:32-64`
- `TextSlideContent.tsx:35-74`
- `NumberSlideContent.tsx:25-65`
- `GridSlideContent.tsx:43-86`
- `PlaceOnImageSlideContent.tsx:35-72`
- `ScalesSlideContent.tsx:35-76`
- `QAndASlideContent.tsx:24-58`
- `RankingSlideContent.tsx:30-62`
- `ImageChoiceSlideContent.tsx:44-74`

Each file roughly 120–250 LOC, and ~60–80 of those are mechanical. **Suggestion:**
extend `useElementEditor` with a generic field-mirror helper (e.g.
`useElementFields<T>(defaults)`) that takes a typed defaults object, returns
`{ values, setField, buildPatch }`, and centralises the resync + patch-builder
contract. The kind-specific files would shrink to JSX + per-field handlers.

### 1.2 Identical `option/item add/remove/edit` handlers across MCQ-shaped editors

`RankingSlideContent.tsx:64-84`, `ScalesSlideContent.tsx:78-98`,
`ImageChoiceSlideContent.tsx:76-107`, and `useElementEditor.useMcqOptionEditor`
all re-implement the same pattern of "validate count bound → flush() →
splice/map → commit". Each file inlines its own `MIN`/`MAX` constants too
(`MIN_ITEMS`, `MIN_STATEMENTS`, `MIN_OPTIONS`).

**Suggestion:** extract a `useCollectionEditor<TItem>({ items, setItems, min, max, commit, flush })`
hook that exposes `add(blank: TItem)` / `remove(id)` / `updateById(id, partial)`,
mirroring what `useMcqOptionEditor` already does. The custom hook already
handles `MIN_MCQ_OPTIONS`/`MAX_MCQ_OPTIONS` — generalise it.

### 1.3 Image-field-with-URL-+-Gallery-picker block

`GridSlideContent.tsx:145-210`, `PlaceOnImageSlideContent.tsx:95-133`, and
`ImageChoiceSlideContent.tsx:170-249` each contain a three-piece block:
`<img>` placeholder + raw URL `<Input>` + `<Btn>Gallery</Btn>`. The
`placeholderImageUrl()` helper is also redefined three times (Grid 28-29,
PlaceOnImage 27-28, ImageChoice 36-37) with subtly different sizes (640×360 vs
240×240).

**Suggestion:** create a `components/Common/Input/ImageUrlPicker/ImageUrlPicker.tsx`
that wraps the `<img preview> + <Input url> + <Btn>Gallery</Btn>` group and
owns the placeholder helper. Each editor would pass `{ value, seed, size, onPick }`.

### 1.4 `SpeakerNotesDrawer` reimplements `useElementEditor` inline

`SpeakerNotesDrawer.tsx:34-71` re-creates the
`useGetDeckQuery + useUpdateElementMutation + useDebouncedCommit + syncedFromId`
pipeline from scratch even though the existing `useElementEditor` would work
with a `selectKind: (e) => true` predicate (or a tiny variant that doesn't
narrow by kind).

**Suggestion:** export a `useAnyElementEditor()` variant from
`useElementEditor.ts` that skips the kind narrowing — speaker notes apply to
every element kind, so the type discriminant should just be `DeckElement`.

DONE ### 1.5 "Confirm by toggling a `confirmId` state" pattern repeated

Three places open-code the same "click → confirmId state → render `<Confirm> <Cancel>` row" flow:

- `pages/AccountPage/AccountPage.tsx:54, 218-243` (close account)
- `pages/AccountPage/OrgSection.tsx:28-29, 119-141` (leave org)
- `pages/AccountPage/GallerySection.tsx:136, 217-251` (delete image)

`MyDecksPage.tsx:129-139` already uses the shared `useConfirm()` hook
(`components/Common/ConfirmDialog/useConfirm.tsx`) and is the canonical
example.

**Suggestion:** migrate all three to `useConfirm()` and delete the local
`*ConfirmId` state. The hook already exists, has a dedicated CSS module, and
supports `variant: "danger"`.

DONE ### 1.6 Identical "data → form-state mirror" `data` error-message extraction

The block

```ts
const msg =
  err && typeof err === "object" && "data" in err ? String(err.data) : null;
```

appears verbatim in `AccountPage.tsx:97-100`, `ThemeEditor.tsx:240-244`,
`OrgSection.tsx:44-49, 65-71`, and `GallerySection.tsx:56-61`. A
`utils/utils.ts:extractErrorMessage` helper already exists and is used in
`CreateGamePage.tsx:358` — it should replace every inline copy.

---

## 2. Missed Component Reuse

DONE ### 2.1 `pages/AccountPage/ThemeEditor.tsx` reimplements multiple Common inputs

This single file rebuilds primitives that already exist as Common components:

- **Custom `HueSlider` (lines 57-101)** — raw `<input type="color">`, `<input type="range">`, `<input type="number">`, plus a 19-line `hexToOklchHue()` conversion. The existing `components/Common/Input/HuePicker/HuePicker.tsx` is the canonical picker (used correctly by `ThemePicker.tsx`).
- **Raw `<input type="text">` (line 257)** instead of `Common/Input/Input/Input.tsx`.
- **Raw `<input type="file" style={{ display: "none" }}>` + manual `useRef().click()` (lines 308-322, 345-363)** instead of `Common/Input/FileUpload/FileUpload.tsx`.
- **Custom three-button mode selector (lines 278-291)** that's a hand-rolled radio group — should be `Common/Input/RadioGroup/RadioGroup.tsx` or `Common/Tabs/Tabs.tsx`.

**Suggestion:** rewrite ThemeEditor using `HuePicker`, `Input`, `FileUpload`,
and `RadioGroup`. Delete the local `HueSlider`, `hexToOklchHue`, and `.hueRow`/`.hueSlider`/`.hueNumber`/`.colorPickerInput` rules in `ThemeSection.module.css`.

### 2.2 `pages/AccountPage/AccountPage.tsx` rolls its own tabs and file input

- **Tab strip (lines 136-150)** — raw `<button role="tab">`s with custom `tabs/tab/tabActive` classes. `Common/Tabs/Tabs.tsx` already provides keyboard-navigable, ARIA-correct tabs (InteractiveSessiond in DesignSystemPage `1106-1175`).
- **Hidden `<input type="file">` + ref pattern (lines 163-172)** — identical to the ThemeEditor pattern; should use `Common/Input/FileUpload/FileUpload.tsx`.
- **72×72 `.avatar` img (AccountPage.module.css:62-68)** — the project has `Common/Avatar/Avatar.tsx` with `size` variants up to `xl` and an `src` prop.

### 2.3 `pages/AccountPage/ThemeSection.tsx` duplicates `Card` markup it could share

The preset card block (`ThemeSection.tsx:52-92`) is structurally identical to
the custom `<ThemeCard />` (same file → ThemeCard.tsx). Both render a swatch +
body + actions inside `.card`. Only the data source differs (preset vs.
ThemeResponse). **Suggestion:** unify under `ThemeCard` with an `onActivate`
callback that accepts either shape, or extract a `ThemeCardShell` that both
preset and custom rows reuse.

### 2.4 Custom `.badge` in `ThemeSection.module.css` instead of `Common/Badge.tsx`

`ThemeSection.module.css:81-96` defines `.badge`/`.badgeActive`/`.badgeOrg` and
`ThemeCard.tsx:46, 51` uses them as `<span className={styles.badge}>...`. The
project has a `Common/Badge.tsx` component with `variant` and `size` props
(InteractiveSessiond in `DesignSystemPage.tsx:382-392`).

### 2.5 `RichTextInput.tsx` hardcodes hex colors instead of design tokens

`COLOR_CHOICES` (`RichTextInput.tsx:57-64`) lists `#e53e3e`, `#dd6b20`,
`#38a169`, `#3182ce`, `#805ad5` — none of these come from
`tokens.css`/`index.css`. This is the toolbar inside the project's most-reused
formatted-text widget; the colors should reference the named-color tokens
(`var(--red-500)`, `var(--orange-500)`, etc.) that the design system
specifically maintains.

### 2.6 `CreateDashboard.tsx` inline `<input>` for the deck title

`CreateDashboard.tsx:63-79` uses a raw `<input>` for the deck title instead of
`Common/Input/Input/Input.tsx`. The Input component already supports the same
onBlur/onKeyDown flow and would be the canonical "type, then commit on Enter/blur" surface.

### 2.7 `IconBtn` + `<XIcon style={{ width: "1rem", height: "1rem" }}>` everywhere instead of letting IconBtn size the icon

`CreateDashboard.tsx:58, 89, 100` (and elsewhere) wrap heroicons in
`<Btn shape="pill">` with explicit `style={{ width: "1rem", height: "1rem" }}`.
`IconBtn` already handles icon sizing per its `size` prop. Either use `IconBtn`,
or have `Btn` style its first SVG child via CSS (see how `IconBtn.module.css`
already does this).

### 2.8 `routes/decks/$deckId/present.tsx` is the only route with inline JSX

`routes/decks/$deckId/present.tsx:7-10` declares `function RouteComponent()` and
returns `<div>Hello "/decks/$deckId/present"!</div>`. Every other route file
delegates to a `*Page` component in `src/pages/`. **Suggestion:** either delete
this placeholder route or create `pages/PresentPage/PresentPage.tsx` and stub
it consistently.

---

## 3. Convention Drift

### 3.1 `React.FC` arrow-component declarations (AGENTS.md violation)

AGENTS.md mandates `const ComponentName = ({ prop }: ComponentNameProps) => {}`.
Eight components still use the older `React.FC<Props>` form:

- `components/Forms/RegistrationForm.tsx:15`
- `components/Containers/Accordion.tsx:10`
- `components/Containers/PageContainer.tsx:9`
- `components/Layout/Layout.tsx:7`
- `components/Layout/CanvasBody.tsx:8`
- `components/Layout/InnerDisplay.tsx:8`
- `components/Layout/MainHeader.tsx:9`
- `components/CreateDashboard/LeftSidebar/SlideThumbnail.tsx:33`
- `components/CreateDashboard/LeftSidebar/SlideThumbnailContent.tsx:11`

### 3.2 `function ComponentName()` declarations (AGENTS.md violation)

AGENTS.md forbids `function`-declared components. Five offenders:

- `routes/decks/$deckId/present.tsx:8` — `function RouteComponent()`
- `pages/ErrorPage/ErrorPage.tsx:67, 72, 77` — `export function NotFoundPage/ServerErrorPage/ServiceUnavailablePage()`
- `pages/ErrorPage/BrainMascot.tsx:5` — `export function BrainMascot(...)`
- `pages/DesignSystemPage/DesignSystemPage.tsx:91, 151, 169` — `function ColorSwatch`, `function TokenRow`, `function WsErrorBannerDemo`

The ErrorPage exports also violate the rule against inline `export function` — they should be `const X = () => {}; export { X }`.

### 3.3 Stale default export

`store/gameSlice.ts:247` — `export default gameSlice.reducer;` is the only
default export in the app outside the generated `routeTree.gen.ts`. Consider
swapping to a named `gameReducer` export for consistency.

### 3.4 `Flex.tsx` is dead code

`components/Containers/Flex.tsx` is entirely commented-out source. Delete the
file rather than leaving it as a stub that suggests "Flex container coming soon".

### 3.5 Empty `Containers/` and `Forms/` directory naming

`components/Forms/` holds a single component (`RegistrationForm`); per
AGENTS.md, this is fine, but it's worth noting that `useRegister.ts` lives
_next to_ it in `components/Forms/` while AGENTS.md says component-local hooks
should be co-located. That's actually correct — flagging only because if the
folder grows the per-component-folder convention from `Common/` should be applied here too.

### 3.6 Console logs left in production code

- `pages/RegisterPage/RegisterPage.tsx:9` — `console.log("search", search);`
- `CreateDashboard.tsx:87, 98` — `console.log("preview deck", serverName)` / `console.log("start InteractiveSession", ...)` next to TODOs

These look like debug breadcrumbs that should be removed or replaced with the real handlers tied to the TODO.

---

## 4. Token / Style Violations

### 4.1 Inline `oklch()` strings constructed from hue values (8 sites)

Eight components inline `` `oklch(55% 0.2 ${hue}deg)` `` / `` `oklch(65% 0.22 ${hue}deg)` ``
into `style={{ background: ... }}`:

- `pages/AccountPage/ThemeSection.tsx:59, 65`
- `pages/AccountPage/ThemeEditor.tsx:67`
- `pages/AccountPage/ThemeCard.tsx:33, 37`
- `pages/DesignSystemPage/ThemePicker.tsx:42`
- `components/CreateDashboard/RightSidebar/ThemePanel.tsx:35, 39`
- `components/Common/Input/HuePicker/HuePicker.tsx:61, 108`

**Suggestion:** these are all variations of the same "preview swatch from a
hue" widget. Extract a `<HueSwatch hue={number} variant="primary|accent" />`
component that owns the oklch math (or moves it to a single CSS rule via
`--swatch-hue`). The lightness/chroma combos vary slightly per site
(`55% 0.2` vs. `65% 0.22`) which is itself a sign these should be unified.

### 4.2 Hardcoded SVG fills in SlideTypeGraphics (`#54FFF1`, `#6019FF`)

Every file in `components/Common/Slides/SlideTypeGraphics/` hardcodes the
brand-teal/violet pair as `fill="#54FFF1"` / `fill="#6019FF"`:

- `RankingGraphic.tsx`, `ImageChoiceGraphic.tsx`, `NumberGraphic.tsx`,
  `PlaceOnImageGraphic.tsx`, `McqGraphic.tsx`, `ScalesGraphic.tsx`,
  `GridGraphic.tsx`, `QAndAGraphic.tsx`, `TextGraphic.tsx`, `SlideGraphic.tsx`
  (~80 hex literals across the directory).

These colors don't respect theme changes. **Suggestion:** swap to
`currentColor` on the strokes/fills you want themed, or use CSS-var-driven
fills (`fill: var(--brand-teal)` / `fill: var(--brand-violet)`) defined per-SVG via a className.

### 4.3 Hardcoded `oklch()` literals in HuePicker rainbow gradient

`Common/Input/HuePicker/HuePicker.module.css:70-76, 165-180` hardcodes the
12-stop rainbow gradient. Same gradient is duplicated in
`pages/AccountPage/ThemeSection.module.css:226-232` for the custom HueSlider
(which itself should be deleted — see 2.1). When ThemeSection is migrated to
HuePicker, the duplicate gradient also dies.

### 4.4 `#ffffff` default in McqOptionEditable color input

`components/CreateDashboard/SlideContentTypes/McqSlideContent/McqOptionEditable.tsx:306`
— `value={option.color ?? "#ffffff"}`. Should be a token (`var(--bg-canvas)`) or
derived. Same file uses a raw `<input type="color">` (line 302) which is
acceptable because the platform color picker has its own UI, but the fallback
literal is still token-violating.

### 4.5 Hex literal `#fff` in PricingCard

`components/Pricing/PricingCard/PricingCard.module.css:34-35`:

```css
linear-gradient(#fff 0 0) content-box,
linear-gradient(#fff 0 0);
```

This is the only `#xxx` literal in any `.module.css` file. Replace with a token
or a transparent gradient if it's a masking trick.

DONE ### 4.6 Inline `display: "none"` on hidden file inputs

`pages/AccountPage/ThemeEditor.tsx:313, 350` use `style={{ display: "none" }}`
on `<input type="file">`. There's already a `.fileInputHidden` class in
`AccountPage.module.css:122-124`. Either way, the right fix is 2.1 — use
`FileUpload`.

DONE ### 4.7 Inline `style={{ width: 240 }}` / `{ width: 80, height: 80 }` on image previews

`PlaceOnImageSlideContent.tsx:100`, `GridSlideContent.tsx:150`,
`ImageChoiceSlideContent.tsx:184` set image dimensions inline instead of via
the `.imagePlaceholder` / `.optionImagePlaceholder` rules in
`SlideContentTypes.module.css` (which already exist). Move the size into the CSS rule, or — better — let the proposed `<ImageUrlPicker>` (see 1.3) own a `size` prop.

### 4.8 Inline structural styles in JSX (`display: flex`, `gap`, `flex-direction`)

`DesignSystemPage.tsx` has 30+ inline `style={{ display: "flex", flexDirection: "column", gap: "var(--space-X)" }}` blocks. Even a single `<Flex direction="column" gap={3}>` primitive (the commented `Containers/Flex.tsx` ghost) would collapse hundreds of lines of inline styles across the design-system page. Outside DesignSystemPage:

- `pages/AccountPage/OrgSection.tsx:112` — `style={{ display: "flex", gap: "var(--space-3)" }}`
- `pages/AccountPage/GallerySection.tsx:67-71, 111` — inline flex layouts
- `components/Common/GalleryPicker/GalleryPicker.tsx:234, 350` — inline flex
- `components/Nav/NavBar/NavBar.tsx:12` — `style={{ padding: "1rem" }}` on the loading state

Either revive `Flex.tsx` (it would pay back its own footprint in this codebase) or push the layouts into the appropriate `.module.css`.

---

## Highest-Leverage Recommendations (Recap)

1. **Extract a `useElementFields<T>(defaults)` helper** on top of `useElementEditor` to drain ~600 LOC of repeated boilerplate across the nine slide-content editors (1.1).
2. **Build `Common/Input/ImageUrlPicker`** to replace the URL-+-Gallery block in three editors (1.3).
3. **Rewrite `ThemeEditor.tsx` to use `HuePicker`, `Input`, `FileUpload`, and `RadioGroup`** — single biggest "missed reuse" payback (2.1).
4. **Migrate three confirmation flows to the existing `useConfirm()` hook** — code already exists, just isn't being consumed (1.5).
5. **Extract a `<HueSwatch>` primitive** to consolidate eight inline `oklch()` swatches across the theming UI (4.1).
6. **Drop `React.FC` and `function ComponentName()` in the 13 files listed in 3.1/3.2** to bring everything to AGENTS.md spec.
