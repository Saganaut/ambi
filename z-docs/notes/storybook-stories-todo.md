# TODO: Storybook stories for stale Common components

Most components in `frontend/src/shared/components/` now have Storybook stories
(`*.stories.tsx`) with sample data in sibling `*.mocks.ts` files. A handful were
**skipped** because they don't currently compile against the regenerated
`@store/AmbiApi` client — they import types/hooks that no longer exist after the
in-progress deck/slide API migration. Add stories for these once the components
are migrated and type-check clean.

## Skipped — blocked on API migration

| Component      | File                                     | Status                                                                                                                           |
| -------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| CommentThread  | `features/deck/components/DeckEditor/RightSidebar/DiscussionPanel/CommentThread.tsx` | No longer blocked — the old blocking imports (`useListRepliesQuery`, `DeckCommentResponse`) are gone; the component is now props-driven (takes `CommentThreadResponse`/`CommentResponse` data via props, not its own queries). May be story-able now; no story exists yet. |
| GalleryPicker  | `shared/components/Media/GalleryPicker/GalleryPicker.tsx`              | Still no story. The old blocking imports are gone — it now uses `useGetMyGalleryQuery`/`useListImagesQuery`/`useUploadImageMutation` and `AppImage` from `@features/gallery/store/galleryApi.gen`, not the old `GalleryImageResponse`/`Image`/`@hooks/useCurrentUserOrgs`. Would still need the `withStore` decorator + MSW to mock those endpoints. |
| ~~MediaPicker~~ | ~~`shared/components/Media/MediaPicker/MediaPicker.tsx`~~ | **Deleted** — the `Media/MediaPicker/` directory no longer exists. |
| ~~MediaAssetChip~~ | ~~`shared/components/Media/MediaPicker/MediaAssetChip.tsx`~~ | **Deleted** along with `MediaPicker/`. |
| ~~TagPicker~~  | ~~`shared/components/UIElements/TagPicker/TagPicker.tsx`~~ | **Deleted**, superseded by `shared/components/UIElements/Tag/Tag.tsx` — a new, simpler component with `Tag.stories.tsx` already in place. |

Data-bound (RTK Query) components still needing stories will need the
`withStore` decorator (`.storybook/decorators/withStore.tsx`) and likely MSW to
mock the endpoints, rather than hitting a live backend.

## Skipped — not story-able in isolation

| Component        | File                                     | Reason                                                                                     |
| ---------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| AuthPromptBridge | `shared/components/Modal/LoginModal/AuthPromptBridge.tsx` | Pure side-effect bridge; renders `null`, only reacts to live 401 / auth-prompt slice state |

No action needed unless these gain renderable UI.

## Conventions for new stories

Follow the existing stories (e.g. `features/deck/components/DeckCard/DeckCard.stories.tsx`,
`UIElements/Alert/Alert.stories.tsx`): `@storybook/react-vite` `Meta`/`StoryObj`
with `satisfies Meta<typeof X>`, `tags: ["autodocs"]`, `title` mirroring the
folder path under `UIElements/` or `Decks/`, `fn()` from `storybook/test` for callbacks, and any
sample data extracted to a sibling `<Component>.mocks.ts`.
