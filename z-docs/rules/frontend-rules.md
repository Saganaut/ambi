# Frontend Rules

Rules for the React + TypeScript frontend under `frontend/`. Styling and icons have their own files — see [styling-rules.md](styling-rules.md) and [icons-rules.md](icons-rules.md).

1. **TypeScript first** — All new code is TypeScript with strict typing; avoid `any`.
2. **Semantic HTML & accessibility** — Use semantic elements; build every component with ARIA and keyboard navigation in mind.
3. **React 19 & React Compiler** — Write code compatible with React 19 and its Compiler.
4. **Lint and typecheck clean** — zero errors, per [testing-and-ci](../infrastructure/testing-and-ci.md).
5. **CSS Modules & tokens** — Use lowerCamelCase selectors and tokens from `tokens.css`. See [styling-rules.md](styling-rules.md).
6. **TanStack Router** — Do all client-side routing via the file-based convention in `frontend/src/routes/`.
7. **State management** — Minimize Redux core store for generic global state; prefer RTK Query's cache as the primary mechanism for server data and associated UI state. Mutations reconcile the cache from their own response (no invalidate + refetch) and components reach the cache only through intent-level hooks. — [details](frontend/rtk-query-cache.md)
    - For non-server client state, choose the home by the nature of the value: Redux slice (serializable + genuinely global), React context (non-serializable / per-subtree / dependency injection), or local `useState` (single-component) — [details](frontend/state-ownership.md)
8. **Auto-generated artifacts** — The API client, validation constants, and enum constants are generated from OpenAPI; never hand-edit them, and never hardcode validation bounds in components. — [details](frontend/generated-artifacts.md)
9. **Testing** — Vitest + jsdom + React Testing Library + MSW, co-located with the component. — see [testing-rules.md](testing-rules.md)
   - Some components have a Storybook story where practical.Only create this when specifically instructed to do so — [details](frontend/storybook-stories.md)
10. **File structure** — All code adheres to the four-layer architecture blueprint. — [details](frontend/file-structure.md)
11. **Component design** — Arrow consts with bottom exports, pages hold no logic, one CSS module per directory, route params read only at the top-level page. — [details](frontend/component-design.md)
12. **Shared conventions** — One sanctioned idiom each for API errors, type derivation, typed Redux hooks, className merging, polymorphic `as`, and promise-based dialogs. — [details](frontend/conventions.md)
13. **Hook roles & naming** — Every hook is one of three kinds, legible from its name: read-only `use<Entity>Query`, write-only `use<Entity><Slice>Mutate`, or composing `use<Workflow>` view-model (CQRS over the RTK Query cache). — [details](frontend/hook-roles.md)
    - Methods returned by hooks use plain verbs (`present`, `share`, `schedule`). Reserve `handle*` exclusively for methods whose signature takes a framework event object (e.g. `handleDragEnd(event: DragEndEvent)`). Debounced-write surfaces follow `commit` (immediate) / `schedule*` (debounced) / `flush` (fire pending) / `cancel` (discard pending).
14. **Document exceptions** — Any exception to these rules must be documented.
15. **Figma references** — If provided a figma reference then use that as the source of truth.
