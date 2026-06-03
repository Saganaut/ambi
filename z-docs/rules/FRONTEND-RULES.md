# Frontend Rules (React / TypeScript)

Rules specific to the React + TypeScript frontend under `frontend/`.

> Styling and icon-specific conventions live in their own files — see [STYLE-RULES.md](STYLE-RULES.md) and [ICONS-RULES.md](ICONS-RULES.md).

1.  **TypeScript First:** All new frontend code MUST be TypeScript, prioritizing strict typing over `any`.
2.  **Semantic HTML/JSX & Accessibility:** Use semantic HTML/JSX elements where possible and ensure all components are built with accessibility in mind (proper ARIA attributes, keyboard navigation).
3.  **React 19 & React Compiler:** Develop code that is compatible with React 19 and its Compiler.
4.  **ESLint & Stylelint:** Strictly adhere to configured ESLint and Stylelint rules. Both must report zero errors before committing — enforced by the `scripts/pre-commit` hook (`npm run lint:all`). CI also runs lint on every push/PR to `main`.
5.  **CSS Modules & Custom Properties:** Use lower camelCase for selector names. Utilize tokens defined in `frontend/src/tokens.css` for colors, spacing, font sizes, borders, etc.
6.  **TanStack Router:** Implement all client-side routing using TanStack Router's file-based convention (`frontend/src/routes/`).
7.  **State Management:**
    - **Avoid RTK for Global State:** Minimize the use of Redux Toolkit's core store for generic global state.
    - **Prefer Cached RTK Query:** Leverage RTK Query's caching and data fetching capabilities as the primary mechanism for managing server-side data and associated UI state.
8.  **Auto-generated API Client:** **NEVER manually edit** `frontend/src/shared/store/AmbiApi.ts`. Regenerate it via `npm run generate-api` after backend API changes (the backend must be running).
9.  **Testing:** Use **Vitest + jsdom + React Testing Library** for all frontend tests.
    - Stack: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `msw` (for network-layer API mocks).
    - Co-locate test files with the component (`Btn.test.tsx` alongside `Btn.tsx`).
    - Query by accessible role/name first; fall back to `data-testid` only when no semantic query applies.
    - Never change a test to make it pass without addressing the underlying issue. Always fix the code or the test to ensure correctness.
10. **File Structure:** All code must strictly adhere to the project [Architecture Blueprint](./FRONTEND-FILE-STRUCTURE.md).
11. **Component Design:**
    - Always declare components as `const ComponentName = ({ prop }: ComponentNameProps) => {}` with a standalone `export { ComponentName }` at the bottom of the file. Avoid default exports and inline `export const`.
    - Route files are for routing only — they must delegate to a `RouteNamePage` component in `src/pages/`.
    - Page components are always titled Page... They assemble components, but are not responsible for any logic and do not use any hooks
    - If a component is used in more than one parent component it belongs in common, otherwise it belongs under its page/feature component folder (sub folders are acceptable).
    - All logic should be extracted into a hook. Work in progress logic can be placed in a component with a TODO to extract. If a hook is used in more than in one parent component it belons in /hooks otherwise it belongs in the page/feature parent component.
    - Data such as JSON used in a component should be placed in a `data.ts` file in the same directory as the component.
    - Never use `index.tsx` files; use explicit file names.
    - Favor `interface` over `type`. Props interfaces should be named `ComponentNameProps`.
    - Anything in components/Common should only carry props, no hooks. The components should be simple enough that any styling logic fits within the component.
    - Anything in components that has its own directory can have hooks, such as modals.
    - _Reconciling the two above:_ `components/Common` is a legacy props-only holding pen being drained into the [blueprint](./FRONTEND-FILE-STRUCTURE.md) buckets — it stays strictly props-only. A shared widget that genuinely needs its own local UI state (hover/focus visibility, ARIA ids, roving tabindex, image-load fallback) does **not** earn a hook exception inside `Common`; it moves out into a UI-Element bucket (`Layout/`, `Forms/`, or a `[UI-Element]/` folder), where the per-directory hook allowance applies. Data fetching (RTK Query), cache mutation, and store dispatch never belong in any shared design-system component, in or out of `Common`.
    - Anything in components should carry its own storybook

12. **Exceptions:**
    - Any exceptions to the rules must be documented
