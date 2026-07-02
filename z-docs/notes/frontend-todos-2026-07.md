# Frontend TODO audit (2026-07)

A sweep of all `TODO`/`FIXME` comments in `frontend/src` (excluding `.test.*` and
`.stories.*`). 31 markers found. Most are **blocked** on backend work (the
element→slide / liveSession model migration, missing endpoints) or require a
**design decision**, so they are not quick fixes. The genuinely self-contained
ones were completed as part of this audit and are listed first.

## ✅ Fixed in this pass

Each fix was committed on its own.

| File | TODO | Resolution |
| ---- | ---- | ---------- |
| `features/auth/store/authPromptSlice.ts` | `Is this deprecated?` | **Not deprecated** — the slice is actively used by `store.ts`, `emptyApi.ts` (401 handler), and `AuthPromptBridge`. Removed the stale question comment. |
| `.../EditSlideSections/useSlideOptionsForm.ts` | `This form hook is unused after the slide model migration. Remove or repurpose.` | Deleted the file. It contained only `export {};` and had zero importers. |

## ⛔ Blocked on backend / migration (not quick fixes)

These are placeholders or stubs waiting on backend model/endpoint work; leave
until the corresponding API lands.

- `routes/_authenticated/achievements.tsx` — page not yet implemented (migration).
- `routes/invite/$token.tsx` — page not yet implemented (migration).
- `routes/_authenticated/scheduled.tsx` — page not yet implemented (migration).
- `routes/_authenticated/my-favorites.tsx` — page not yet implemented (migration).
- `features/account/useAccount.ts` (×2) — no account-closure endpoint on the new backend yet.
- `.../EditSlideSections/RankingOptionsSection.tsx` — old `shuffleItemsForPresentation` gone.
- `.../EditSlideSections/ProvenanceFooter.tsx` — needs `useGetUserProfileQuery` (by userId) endpoint.
- `.../EditSlideSections/SlideOptionsSection.tsx` — old fields (`resultsDisplayType`, `multipleSelectionsEnabled`, …) gone.
- `.../EditSlideSections/FollowUpAttachSection.tsx` — enable only for scorable slides once model supports it.
- `.../EditSlideSections/BehaviorSection.tsx` — old `showResponses` field gone.
- `.../EditSlideSections/ElementTagsSection.tsx` — slide-level tags (`chrome.tagIds`) no longer exist.
- `.../EditSlideSections/CommonOptionsSection.tsx` — old `chrome.mediaCaption` / `chrome.altText` gone.
- `.../ParticipantPanel/ParticipantsPanel.tsx` — per-slide reactions override needs new model support.
- `.../SlideContent/SlideContent/MediaSlots.tsx` — stubbed pending slide-block migration.
- `.../SlideContent/SlideContent/Block.types.ts` — replace bespoke type once backend models slide layout.
- `.../SlideContent/_shared/ImageBackingEditor.tsx` — stubbed pending slide-block migration.
- `shared/components/PlayerInfo/PlayerInfo.tsx` (×2) — needs a player-state API; image caching decision.
- `shared/types/Elements.types.ts` — needs full rework once backend updates land.

## 🧭 Needs a design decision (not quick fixes)

- `.../SlideContent/_shared/OptionControls/Menu.tsx` — `MAGIC_NUMBER = 2` fallback
  for `resolveOptionColor`; needs a proper index→color mapping now that index is a string.
- `.../SlideContent/_shared/McqOptionEditable/McqOptionEditable.tsx` — "find ways to add this in here".
- `shared/components/Charts/BarChart/BarChart.tsx` — better fallback or discriminated union for the type.
- `features/deck/hooks/useCreateDeck.ts` — consider awaiting the persisted deck id.
- `.../ImagePlacementPicker/ImagePlacementPicker.tsx` — performance cost review.

## 🖼️ Placeholder assets / content (not code fixes)

- `.../RightSidebar/shared/ImagePicker.tsx` — replace lorem-picsum with a real placeholder for prod.
- `.../Slides/SlideTypeGraphics/slideTypeGraphics.ts` — needs real images for TITLE, MEDIA, FOLLOW_UP.

## 🔒 Security review needed (deferred — file already has uncommitted changes)

- `shared/components/Forms/Input/RichTextDisplay/RichTextDisplay.tsx` (×2) — sanitization
  needs verification. Left untouched: this file has in-progress uncommitted edits and the
  concern is non-trivial (deserves its own security-focused change).
