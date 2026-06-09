# Component Design

**Rule:** Components are declared as arrow consts with a bottom export, carry no business logic, and live at the lowest folder that owns them.

- Declare as `const ComponentName = ({ prop }: ComponentNameProps) => {}` with a standalone `export { ComponentName }` at the bottom. No default exports, no inline `export const`.
- Route files are for routing only — they delegate to a `RouteNamePage` component in `src/pages/`.
- Page components are titled `...Page`. They assemble components but hold no logic and use no hooks.
- A component used in more than one parent belongs in common; otherwise it lives under its page/feature folder (sub-folders are fine).
- All logic is extracted into a hook (WIP logic may sit in a component with a `TODO` to extract). A hook used by more than one parent belongs in `/hooks`; otherwise in the page/feature parent.
- Component data (e.g. JSON) goes in a `data.ts` beside the component.
- Never use `index.tsx` files — use explicit names.
- Favor `interface` over `type`. Props interfaces are named `ComponentNameProps`.
- `components/UIElements` carry props only, no hooks — simple enough that styling logic fits inline.
- A `components` item with its own directory (e.g. a modal) may have hooks.
- Everything in `components` carries its own Storybook.
- One CSS module file per directory. More than one means a component needs its own directory.
