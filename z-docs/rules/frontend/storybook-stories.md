# Storybook stories

**Only create storybook stories if explicitely requested,otherwise skip this step**
**Rule:** A component should have a co-located `*.stories.tsx` where one is practical — aspirational, not yet universal. New stories follow the shape of the existing ones (`features/deck/components/DeckCard/DeckCard.stories.tsx`, `shared/components/UIElements/Alert/Alert.stories.tsx`).

- `@storybook/react-vite` `Meta` / `StoryObj`, with `satisfies Meta<typeof X>`.
- `tags: ["autodocs"]`.
- `title` mirrors the component's folder path (e.g. under `UIElements/` or `Decks/`).
- Callbacks are `fn()` from `storybook/test`.
- Sample data lives in a sibling `<Component>.mocks.ts`, shared with the component's tests.
- A store- or API-bound component needs the `withStore` decorator (`.storybook/decorators/withStore.tsx`) and MSW to mock its endpoints — never a live backend.

A component that renders `null` and only reacts to live app state (e.g. a side-effect bridge) isn't story-able in isolation; skip it.
