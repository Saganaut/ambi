# Component Design

**Rule:** Components are declared as arrow consts with a bottom export, carry no business logic, and live at the lowest folder that owns them.

- Declare as `const ComponentName = ({ prop }: ComponentNameProps) => {}` with a standalone `export { ComponentName }` at the bottom. No default exports, no inline `export const`.
- Route files are for routing only — they delegate to a `RouteNamePage` component, which lives either in `src/pages/` (a handful of static pages: About, Error, Landing, Pricing, Terms) or under `features/<name>/views/<RouteNamePage>/` (most pages — e.g. `RegisterPage`, `AccountPage`, `DeckViewPage`, `MyDecksPage`, `SessionJoinPage`, `SessionPage`).
- Page components are titled `...Page`. They aim to be thin assemblers — composing components rather than owning business logic — though this isn't absolute: a page may call a small hook or hold light local state (e.g. `AccountPage`, `RegisterPage`).
- A component used in more than one parent belongs in common; otherwise it lives under its page/feature folder (sub-folders are fine).
- All logic is extracted into a hook (WIP logic may sit in a component with a `TODO` to extract). A hook used by more than one parent belongs in `/hooks`; otherwise in the page/feature parent.
- Component data (e.g. JSON) goes in a `data.ts` beside the component.
- Never use `index.tsx` files — use explicit names.
- Favor `interface` over `type`. Props interfaces are named `ComponentNameProps`.
- `components/UIElements` are simple enough that styling logic fits inline. They may use local presentational hooks (`useId`, `useState`, `useEffect`) for things like generated ids, open/closed state, or measuring — but never data or store hooks (no RTK Query, no `useAppSelector`/`useAppDispatch`).
- A `components` item with its own directory (e.g. a modal) may have hooks.
- Components SHOULD have a story where practical — this is aspirational, not yet universal (many components, e.g. `Layout`, `DropdownMenu`, `PlayerInfo`, `NavBar`, and most of `Charts/*`, currently have none).
- One CSS module file per directory. More than one means a component needs its own directory.
- **Route params stay at the top level (aspirational — not yet followed).** The intended rule: only top-level route components (pages) read route params (e.g. `deckId`, `slideId`, `liveSessionId`) from the router, and all child components receive these IDs as props with hooks accepting them as parameters. In practice this is pervasively violated in the deck editor, where many non-page descendants (e.g. sidebar sections, `SlideDisplay`, `SpeakerNotesDrawer`, `ImageSlotContext`) call `getRouteApi(...).useParams()` directly. Treat the prop-drilled form as the goal for new code, not a guarantee of the current codebase.
