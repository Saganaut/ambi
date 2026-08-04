# Duplication audit (2026-07)

A repo-wide sweep for duplication that should be generalized into a shared helper, hook, or
component. Ranked by value. Essentially all of it is still open — work from here, carding each item
you pick up.

## Backend (`backend/src/.../java`)

1. **Live-session access guards** — `com/cephadex/ambi/session/`: `LiveSessionLobbyService` has
   both `requireSession` and `requireHost`; `LiveSessionPresenceService` and
   `LiveSessionOrchestrator` have `requireSession`; `LiveSessionHostService` has `requireHost` —
   extract a shared `LiveSessionAccess` component (repository + participant resolver) injected into
   all four.
2. **Idempotent PUT-to-create** — `DeckController.createDeck`, `ThemeController.createTheme` —
   extract on the third occurrence, not before.
3. **Test `principal(userId)` builder** — duplicated byte-for-byte across ~12 test classes —
   extract a shared `TestPrincipals` test-support util.

## Frontend (`frontend/src`)

1. **Optimistic patch→await→reconcile→undo** — `deck/store/enhancements/{deck,slide,promote}.ts`
   (inlined 4x in `promote.ts`) — extract a generic
   `reconcilingMutation<Api, Endpoint, Arg, Data>` into `shared/store/apiEnhancements.ts` (a
   documented barrel today, with no such helper in it).
2. **"Sweep materialized queries, filter by arg, patch"** — `deck.ts`, `gallery.ts`, `theme.ts`,
   `comment.ts` — extract `patchAllMatching`; separately `upsertById` is duplicated 3x
   (`slide.ts`, `theme.ts`, `comment.ts`).
3. **Label/error wrapper markup** — ~10-13 components under `shared/components/Forms/Input/` plus
   `AvatarSelector.tsx`, four of which redeclare `errorMessage?`/`infoMessage?` locally — extract
   `<FieldMessage>` and make all of them extend `InputBaseProps`.
4. **Debounced-draft-then-commit** — `deck/hooks/useSlideEditor.ts` and twice inside
   `useSlideSettings.ts` — extract `useDraftedDebouncedPatch<T>(current, commit, delay)`.
5. **No shared query loading/error boundary** — 8+ components hand-roll it; `DeckEditor.tsx` and
   `DeckPanel/Reviews.tsx` have no error branch and Reviews' empty branch renders no text (a real
   bug) — extract `useQueryState`/`<QueryState>` over the existing
   `Loader`/`ErrorDisplay`/`EmptyState`.
6. **`<section><h4>` options shell hand-copied 9x** — `DeckEditor/RightSidebar/EditSlideSections/*`
   — extract `<OptionsSection title>`.
7. **`imageValidation.ts` is dead and the live path disagrees with it — a bug, not a refactor** —
   `shared/utils/imageValidation.ts` (`IMAGE_TIERS`, `validateImageFile`) has zero importers while
   `Media/GalleryPicker/UploadTab.tsx:22` hardcodes `10 * 1024 * 1024` against `IMAGE_TIERS.gallery`'s
   5 MB — wire the upload path to `IMAGE_TIERS` or delete the module.
8. **Pill/badge CSS reimplemented 3x** — `{Allocation,Number,Scales}SlideContent.module.css` —
   reuse `_shared/IndexPill` (or `Badge`).
9. **Two bespoke drawers bypass `Modal`/`useModal`** — `SidePanelDrawer.tsx`,
   `SpeakerNotesDrawer.tsx`, neither supporting Escape/backdrop dismissal — extract a `Drawer`
   primitive.
10. **`ActionCard` is dead code** — a strict subset of `SelectableTile.tsx` with no real call sites
    — delete it.
11. **"syncedId" resync idiom 4x+** — `{Mcq,Number,QAndA,Text}OptionsSection.tsx`,
    `McqSlideContentView.tsx`, `FollowUpSlideContent.tsx` — extract `useSyncedState`.

### Nits

- `useDeckSettingsMutate.ts` repeats merge-and-PUT for 4 settings objects — table-driven loop.
- `useGalleryPicker.tsx`/`useAvatarPicker.tsx` — identical `openModal` shape → `usePickerModal`.
- Context throw-if-null boilerplate x4 (`useModal`, `useToast`, `useFullScreen`,
  `useMcqSlideContext`) → `createRequiredContextHook`.
- `PricingCard.tsx` rebuilds `Card`'s shell instead of composing it.
- `ThemeEditor.tsx` hand-rolls a required-name check instead of `validateText` and omits the
  generated `maxLength` — a server-side-only failure risk.
- `useDeckImageMutate.ts`/`useSlide.ts` duplicate "pick cover vs background mutation by slot."
- `Modal.tsx` lacks a `footer` slot, so `GalleryPicker.tsx` and `ThemeModal.tsx` each build their
  own action row.
