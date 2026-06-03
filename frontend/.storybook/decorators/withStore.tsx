import type { Decorator } from "@storybook/tanstack-react";
import { Provider } from "react-redux";
import { store } from "@store/store";
// Opt-in Redux wrapper for the data-bound tier. Apply per story via
// `decorators: [withStore]` ONLY on components that read the RTK Query cache or
// app slices — keep it off the pure presentational tier (Btn, Badge, Avatar,
// Alert, Input, DeckCard) so those stay dependency-free. For components that
// fetch on mount, prefer feeding data through props, or mock the endpoints with
// MSW (already a dependency) rather than hitting a live backend from a story.
export const withStore: Decorator = (Story) => (
  <Provider store={store}>
    <Story />
  </Provider>
);
