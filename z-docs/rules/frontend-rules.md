# Frontend Rules

Rules for the React + TypeScript frontend under `frontend/`. Styling and icons have their own files — see [styling-rules.md](styling-rules.md) and [icons-rules.md](icons-rules.md).

1. **TypeScript first** — All new code is TypeScript with strict typing; avoid `any`.
2. **Semantic HTML & accessibility** — Use semantic elements; build every component with ARIA and keyboard navigation in mind.
3. **React 19 & React Compiler** — Write code compatible with React 19 and its Compiler.
4. **Lint clean** — ESLint and Stylelint must report zero errors before commit (`scripts/pre-commit` runs `lint:all`); CI also lints every push/PR to `main`.
5. **CSS Modules & tokens** — Use lowerCamelCase selectors and tokens from `tokens.css`. See [styling-rules.md](styling-rules.md).
6. **TanStack Router** — Do all client-side routing via the file-based convention in `frontend/src/routes/`.
7. **State management** — Minimize Redux core store for generic global state; prefer RTK Query's cache as the primary mechanism for server data and associated UI state. Mutations reconcile the cache from their own response (no invalidate + refetch) and components reach the cache only through intent-level hooks. — [details](frontend/rtk-query-cache.md)
8. **Auto-generated artifacts** — The API client, validation constants, and enum constants are generated from OpenAPI; never hand-edit them, and never hardcode validation bounds in components. — [details](frontend/generated-artifacts.md)
9. **Testing** — Use Vitest + jsdom + React Testing Library + MSW. Co-locate tests with the component, query by accessible role/name first, drive interactions with `userEvent`. Never change a test to pass without fixing the underlying issue. — see [testing-rules.md](testing-rules.md)
10. **File structure** — All code adheres to the four-layer architecture blueprint. — [details](frontend/file-structure.md)
11. **Component design** — Arrow consts with bottom exports, pages hold no logic, logic extracted to hooks, one CSS module per directory, and more. — [details](frontend/component-design.md)
12. **Shared conventions** — `ProblemDetail` error helpers (branch on `code`/`status`, never `detail`); derive types from the generated schema via indexed access; typed Redux hooks; `filter(Boolean).join(" ")` for classNames (no clsx); polymorphic `as`; promise-based dialogs. — [details](frontend/conventions.md)
13. **Document exceptions** — Any exception to these rules must be documented.
