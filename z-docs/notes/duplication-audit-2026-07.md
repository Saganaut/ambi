# Duplication audit (2026-07)

A repo-wide sweep for duplication and near-duplication — cases where two or more places
implement structurally similar logic that should be generalized into a shared helper,
base class, hook, or component. Ranked by value within each half of the stack. Nothing
here has been fixed yet; this is a findings list to work from.

## Backend (Java / Spring)

1. **Ownership/permission logic tripled across `DeckService`, `GalleryService`,
   `ThemeService`.** Each independently implements the same ~60-80 line shape:
   `orgRoleFor(orgId, userId)`, `orgRoleFor(entity, principal)`, the
   `userId`/`level`/`isPlatformAdmin` static helpers, `permissionsFor(entity, principal)`,
   `requireView/Edit/Manage(entity, principal)`, and `load(id)`. A full access-control
   mini-framework copy-pasted three times — a fix to one org-role edge case has to be
   applied in three places or it silently drifts. **Highest value.** Extract a shared
   `OwnershipAccessControl<T>` (or `PermissionEvaluator<T>`) taking the entity's
   `canBeViewedBy/canBeEditedBy/canBeManagedBy` predicates plus an error-code prefix, and
   a `PrincipalOrgResolver`/`AmbiPrincipals` utility bean for the static helpers.
2. **`requireSession`/`requireHost` duplicated 5-6x** across the live-session package:
   `LiveSessionPresenceService`, `LiveSessionLobbyService`, `LiveSessionOrchestrator`,
   `LiveSessionHostService`, `LiveSessionSnapshotService`, `LiveSessionAnswerService`.
   Extract a shared `LiveSessionAccess` component wrapping the repository + participant
   resolver, injected into all six.
3. **`requireUserId(AmbiPrincipal)`** copy-pasted verbatim — including the same
   "defence-in-depth" javadoc — in `ThemeController`, `UserController`, `DeckController`,
   and inlined without extraction in `OrgController`. Small in line count but
   security-relevant; belongs in exactly one place (a static utility or shared base
   controller method).
4. **Idempotent PUT-to-create pattern** (`DeckController.createDeck`,
   `ThemeController.createTheme`): try create → on `DuplicateKeyException` → return the
   existing resource via `toResponse`. Only two occurrences today; worth extracting if a
   third resource needs the same semantics, otherwise low priority.
5. **Test-only: `principal(userId)` builder** duplicated byte-for-byte across ~9 test
   classes (`GalleryServiceTest`, `ThemeServiceTest`, `DeckServiceTest`,
   `CommentThreadServiceTest`, the live-session service tests, `ParticipantResolverTest`,
   `DeckReviewServiceTest`, plus variants in `AuthServiceTest`/`RedisTokenSessionServiceTest`).
   Lower priority than production code — extract to a shared `TestPrincipals` test-support
   util if touched again.

Not flagged — already well-factored: `GlobalExceptionHandler`/`ApiException`/`ApiErrors`
(single source of truth for exception translation), `ValidationConstants` (centralizes all
`@Size`/`@Pattern` values), the `ViewerPermissions`/`Ownership` value types, and
`CommentThreadService`/`DeckReviewService` (correctly delegate to `DeckService.permissionsFor`
rather than reimplementing it).

## Frontend (React / TypeScript)

1. **Optimistic-update "patch → await → reconcile → undo-on-reject" hand-rolled 3+
   times, never shared.** `features/deck/store/enhancements/deck.ts` (`reconcilingDeckMutation`),
   `.../slide.ts` (`reconcilingSlideMutation`), and `.../promote.ts` (the same shape
   inlined 4x, not even reusing the `deck.ts` factory). `shared/store/apiEnhancements.ts`
   is currently an empty import barrel despite comments acknowledging the repetition.
   Extract a generic `reconcilingMutation<Api, Endpoint, Arg, Data>(cacheKey, patchTuples)`
   into `apiEnhancements.ts`.
2. **"Sweep all materialized queries, filter by arg, patch" duplicated 4x**: deck delete
   (`deck.ts`), `gallery.ts`, `theme.ts`, `comment.ts` each reimplement
   `Object.values(state.api.queries)` filter + `updateQueryData` + a manual undo array.
   Extract a `patchAllMatching` helper. Related: `upsertById` (findIndex+splice-or-push)
   is separately duplicated 3x (`slide.ts`, `theme.ts`, `comment.ts`).
3. **Label/error wrapper markup copy-pasted across ~10-13 form-input components**
   (`shared/components/Forms/Input/{Input,TextArea,NumberInput,Dropdown,Checkbox,Radio,
   RadioGroup,Toggle,FileUpload,InputWithButton}.tsx`, `AvatarSelector.tsx`). Four of
   these (`Dropdown`, `RadioGroup`, `FileUpload`, `AvatarSelector`) locally redeclare
   `errorMessage?`/`infoMessage?` instead of extending the shared `InputBaseProps`.
   Extract a `<FieldMessage errorMessage infoMessage />` subcomponent and make all of
   them extend `InputBaseProps`.
4. **Debounced-draft-then-commit pattern hand-rolled 3x, twice in the same file.**
   `features/deck/hooks/useSlideEditor.ts` and — worse — duplicated twice within
   `useSlideSettings.ts` (once for `pointSettings`, once for `answerSettings`, including
   duplicated draft-reset/flush/cancel logic). Extract `useDraftedDebouncedPatch<T>(current,
   commit, delay)`. `useDebouncedCommit` itself is otherwise the sole, correctly-reused
   primitive elsewhere.
5. **No shared query loading/error boundary** — 8+ components hand-roll it
   inconsistently. `DeckEditor.tsx` and `DeckPanel/Reviews.tsx` check only `isLoading`
   with no error branch, and `Reviews.tsx`'s empty branch renders no text at all (an
   actual bug, not just style). `SessionConnectionProvider.tsx`, `SlideDisplay.tsx`, and
   `DeckDiscussionPanel.tsx` all use raw `<div>`/`<p>` instead of the existing
   `Loader`/`ErrorDisplay`/`EmptyState` components. Worth a `useQueryState`/`<QueryState>`
   wrapper.
6. **No shared `<OptionsSection>` wrapper — hand-copied 9x** across
   `features/deck/components/DeckEditor/RightSidebar/EditSlideSections/*` (`FollowUpAttachSection`,
   `FollowUpOptionsSection`, `McqOptionsSection`, `NumberOptionsSection`,
   `QAndAOptionsSection`, `RankingOptionsSection`, `SlideOptionsSection`,
   `TextOptionsSection`, `McqResultsSection`), all repeating the same `<section><h4>`
   shell. Extract `<OptionsSection title>`.
7. **`imageValidation.ts` is dead code, and the real upload path disagrees with it —
   a real bug, not just duplication.** `shared/utils/imageValidation.ts`
   (`IMAGE_TIERS`, `validateImageFile`) has zero import sites.
   `shared/components/Media/GalleryPicker/UploadTab.tsx` hardcodes a 10 MB limit where
   `IMAGE_TIERS.gallery` specifies 5 MB. Wire the upload path to `IMAGE_TIERS` or delete
   the orphaned module.
8. **Pill/badge CSS — mostly a false positive; addressed (2026-07).** The original finding
   was largely inaccurate on inspection: the design system already factors this deliberately
   into `Badge` (semantic status, string label), `Tag` (neutral metadata pill, ReactNode
   children — explicitly "distinct from Badge"), and `.indexPill` (numeric index marker,
   which lives in `_shared/_shared.module.css`, *not* `OptionControls`). Of the four named
   slide-content modules, three backed no live code: `AllocationSlideContent` and
   `NumberSlideContent` are `not implemented` stubs with their pills (`.poolBadge`,
   `.targetPreview`) in commented-out impls, and `RankingSlideContent`'s `.rankBadge` was a
   pure orphan (never referenced, and not even a pill — no radius/background). Scales'
   `.scaleTick` is live but a genuinely distinct element (a repeated tick in a track,
   `bg-surface`), not a status badge. The one real duplication was the two divergent live
   `.indexPill` declarations (`_shared.module.css` circle avatar vs `McqOptionEditable`
   bare pill). **Done:** extracted a shared `_shared/IndexPill.tsx` with `solid`/`bare`
   variants (both consumers migrated, old declarations removed, zero visual change) and
   deleted the orphan `.rankBadge`. The staged `.poolBadge`/`.targetPreview` should move to
   `Tag`/`Badge` when those editors are un-stubbed, not before.
9. **Two independent bespoke drawer implementations bypass the centralized
   `Modal`/`useModal` system.** `SidePanelDrawer.tsx` and `SpeakerNotesDrawer.tsx` each
   hand-roll an edge-pinned panel with open/close state, neither supporting Escape/backdrop
   dismissal like `Modal.tsx`. Extract a shared `Drawer` primitive.
10. **`ActionCard` is dead code duplicating `SelectableTile`** — a strict subset of
    `SelectableTile.tsx` with zero real call sites. Candidate for deletion.
11. **"syncedId" resync idiom duplicated 4x+**: `McqOptionsSection.tsx`,
    `NumberOptionsSection.tsx`, `QAndAOptionsSection.tsx`, `TextOptionsSection.tsx` (plus
    `McqSlideContentView.tsx`, `FollowUpSlideContent.tsx`) — "mirror slide state locally,
    reset on id change." Extract `useSyncedState`.

### Medium/nit-level (frontend)

- `useDeckSettingsMutate.ts` repeats merge-and-PUT for 4 settings objects — a
  table-driven loop would collapse this.
- `useGalleryPicker.tsx`/`useAvatarPicker.tsx` — identical `openModal({title, content})`
  shape → `usePickerModal`.
- Context-accessor throw-if-null boilerplate x4 (`useModal.tsx`, `useToast.tsx`,
  `useFullScreen.tsx`, `useMcqSlideContext.ts`) → `createRequiredContextHook`.
- `PricingCard.tsx` rebuilds `Card`'s header/body/footer shell instead of composing it.
- `ThemeEditor.tsx` hand-rolls a required-name check instead of `validateText`, and omits
  the generated `maxLength` bound that every other form applies — a server-side-only
  failure risk for long names.
- `useDeckImageMutate.ts`/`useSlide.ts` duplicate "pick cover vs background mutation by
  slot."
- `Modal.tsx` lacks a `footer` slot, so `GalleryPicker.tsx` and `ThemeModal.tsx` each
  build their own action row.

Not flagged — verified clean: inline `style={{}}` usage (all dynamic, no repeated static
layout), most TypeScript type shapes (already generalized via `_shared/`,
`Enhancements.types.ts`, `SessionConfig.types.ts`), socket/polling logic (single
implementation), and `fieldValidation.ts` usage elsewhere (consistently applied).

## Method

Produced by two parallel agent sweeps (backend, frontend), each reading broadly across
`backend/src/{main,test}/java` and `frontend/src` rather than sampling a few files, and
grepping for repeated method/hook/component shapes. Generated artifacts (API client,
validation constants, enums under `frontend/src`) were excluded, since they're
regenerated via `npm run generate` and must not be hand-edited.
