# TODO: Storybook stories for stale Common components

Most components in `frontend/src/shared/components/` now have Storybook stories
(`*.stories.tsx`) with sample data in sibling `*.mocks.ts` files. A handful were
**skipped** because they don't currently compile against the regenerated
`@store/AmbiApi` client — they import types/hooks that no longer exist after the
in-progress deck/slide API migration. Add stories for these once the components
are migrated and type-check clean.

## Skipped — blocked on API migration

| Component      | File                                     | Missing exports it depends on                                                                                                   |
| -------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| CommentThread  | `features/decks/components/DeckEditor/CommentThread/CommentThread.tsx` | `useListRepliesQuery`, `DeckCommentResponse`                                                                                    |
| GalleryPicker  | `shared/components/Media/GalleryPicker/GalleryPicker.tsx`              | `GalleryImageResponse`, `Image`, `useListImagesQuery`, `useUploadImageMutation`, `@hooks/useCurrentUserOrgs`                    |
| MediaPicker    | `shared/components/Media/MediaPicker/MediaPicker.tsx`                  | `useListMediaQuery`, `useUploadMediaMutation`, `useCreateMediaEmbedMutation`, `MediaAssetResponse`, `@hooks/useCurrentUserOrgs` |
| MediaAssetChip | `shared/components/Media/MediaPicker/MediaAssetChip.tsx`               | `useGetMediaQuery`, `MediaAssetResponse`                                                                                        |
| ~~TagPicker~~  | ~~`shared/components/UIElements/TagPicker/TagPicker.tsx`~~              | ~~`useCreateTagMutation`, `useListTagsQuery`, `TagResponse`~~ — **resolved**: split into props-only component + `useTagPickerData` hook; `TagPicker.stories.tsx` added. |

These are data-bound (RTK Query) components, so their stories will need the
`withStore` decorator (`.storybook/decorators/withStore.tsx`) and likely MSW to
mock the endpoints, rather than hitting a live backend.

## Skipped — not story-able in isolation

| Component        | File                                     | Reason                                                                                     |
| ---------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| AuthPromptBridge | `shared/components/Modal/LoginModal/AuthPromptBridge.tsx` | Pure side-effect bridge; renders `null`, only reacts to live 401 / auth-prompt slice state |
| AuthReplayBridge | `shared/components/Modal/LoginModal/AuthReplayBridge.tsx` | Pure side-effect bridge; renders `null`, only fires on OAuth-return state transition       |

No action needed unless these gain renderable UI.

## Conventions for new stories

Follow the existing stories (e.g. `features/decks/components/DeckCard/DeckCard.stories.tsx`,
`UIElements/Alert/Alert.stories.tsx`): `@storybook/tanstack-react` `Meta`/`StoryObj`
with `satisfies Meta<typeof X>`, `tags: ["autodocs"]`, `title` mirroring the
folder path under `UIElements/` or `Decks/`, `fn()` from `storybook/test` for callbacks, and any
sample data extracted to a sibling `<Component>.mocks.ts`.
