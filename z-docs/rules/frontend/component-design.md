# Component Design

**Rule:** Components are declared as arrow consts with a bottom export, carry no business logic, and live at the lowest folder that owns them.

- Declare as `const ComponentName = ({ prop }: ComponentNameProps) => {}` with a standalone `export { ComponentName }` at the bottom. No default exports, no inline `export const`.
- Route files are for routing only — they delegate to a `RouteNamePage` component, which lives either in `src/pages/` (a handful of static pages: About, Error, Landing, LoginError, Pricing, Terms) or under `features/<name>/views/<RouteNamePage>/` (most pages).
- Page components are titled `...Page` and aim to be thin assemblers. Not absolute: a page may call a small hook or hold light local state.
- A component used in more than one parent belongs in common; otherwise it lives under its page/feature folder (sub-folders are fine).
- All logic is extracted into a hook (WIP logic may sit in a component with a `TODO` to extract). A hook used by more than one parent belongs in `/hooks`; otherwise in the page/feature parent.
- Component data (e.g. JSON) goes in a `data.ts` beside the component.
- **Never use `index.tsx` files** — use explicit names. The sole exception is `src/routes/`, where TanStack Router's file-based convention *requires* `index.tsx` to denote a directory's index route.
- Favor `interface` over `type`. Props interfaces are named `ComponentNameProps`.
- `components/UIElements` are simple enough that styling logic fits inline. They may use local presentational hooks (`useId`, `useState`, `useEffect`) for generated ids, open/closed state, or measuring — but never data or store hooks (no RTK Query, no `useAppSelector`/`useAppDispatch`).
- A `components` item with its own directory (e.g. a modal) may have hooks.
- One CSS module file per directory. More than one means a component needs its own directory.
- Components SHOULD have a story where practical — see [storybook-stories.md](storybook-stories.md).
- **Route params stay at the top level.** Only top-level route components (pages) read route params (`deckId`, `slideId`, `liveSessionId`) from the router; children receive them as props and hooks accept them as parameters. Aspirational: the deck editor pervasively violates this today, with non-page descendants calling `getRouteApi(...).useParams()` directly. Treat the prop-drilled form as the rule for new code.
