# TODO: Storybook stories for stale Common components

Most components in `frontend/src/components/Common/` now have Storybook stories
(`*.stories.tsx`) with sample data in sibling `*.mocks.ts` files. A handful were
**skipped** because they don't currently compile against the regenerated
`@/store/AmbiApi` client — they import types/hooks that no longer exist after the
in-progress deck/slide API migration. Add stories for these once the components
are migrated and type-check clean.

## Skipped — blocked on API migration

| Component | File | Missing exports it depends on |
| --------- | ---- | ----------------------------- |
| CommentThread | `Common/CommentThread/CommentThread.tsx` | `useListRepliesQuery`, `DeckCommentResponse` |
| GalleryPicker | `Common/GalleryPicker/GalleryPicker.tsx` | `GalleryImageResponse`, `Image`, `useListImagesQuery`, `useUploadImageMutation`, `@/hooks/useCurrentUserOrgs` |
| MediaPicker | `Common/MediaPicker/MediaPicker.tsx` | `useListMediaQuery`, `useUploadMediaMutation`, `useCreateMediaEmbedMutation`, `MediaAssetResponse`, `@/hooks/useCurrentUserOrgs` |
| MediaAssetChip | `Common/MediaPicker/MediaAssetChip.tsx` | `useGetMediaQuery`, `MediaAssetResponse` |
| TagPicker | `Common/TagPicker/TagPicker.tsx` | `useCreateTagMutation`, `useListTagsQuery`, `TagResponse` |

These are data-bound (RTK Query) components, so their stories will need the
`withStore` decorator (`.storybook/decorators/withStore.tsx`) and likely MSW to
mock the endpoints, rather than hitting a live backend.

## Skipped — not story-able in isolation

| Component | File | Reason |
| --------- | ---- | ------ |
| AuthPromptBridge | `Common/LoginModal/AuthPromptBridge.tsx` | Pure side-effect bridge; renders `null`, only reacts to live 401 / auth-prompt slice state |
| AuthReplayBridge | `Common/LoginModal/AuthReplayBridge.tsx` | Pure side-effect bridge; renders `null`, only fires on OAuth-return state transition |

No action needed unless these gain renderable UI.

## Conventions for new stories

Follow the existing stories (e.g. `Common/Cards/DeckCard.stories.tsx`,
`Common/Alert/Alert.stories.tsx`): `@storybook/tanstack-react` `Meta`/`StoryObj`
with `satisfies Meta<typeof X>`, `tags: ["autodocs"]`, `title` mirroring the
folder path under `Common/`, `fn()` from `storybook/test` for callbacks, and any
sample data extracted to a sibling `<Component>.mocks.ts`.
