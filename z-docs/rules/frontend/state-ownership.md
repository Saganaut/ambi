# State ownership: slice vs context vs local vs cache

**Rule:** Where a piece of state lives is not a style choice. Pick the home by the **nature of the value**, in this priority order — the first three each have a hard constraint that rules the others out.

1. **RTK Query cache** — *all* server data. It owns fetching, caching, and reconciliation; nothing about server entities belongs in a slice or context. See [rtk-query-cache.md](rtk-query-cache.md).
2. **Redux slice** — client state that is **serializable** *and* **genuinely global** (one value for the whole app or a whole feature). A slice is the least-boilerplate home for this category — reach for it before a context. Examples: `features/deck/store/panelSlice.ts`, `features/auth/store/authPromptSlice.ts`.
3. **React context** — when the value is **any** of:
   - **(a) non-serializable** — functions, `ReactNode`, refs, timers, or live I/O handles. Redux's `serializableCheck` middleware rejects these, so the store is structurally off the table.
   - **(b) scoped per-subtree or per-instance** — Redux is a singleton global; if two of the component could mount at once, a slice collapses their state into one shared (buggy) value.
   - **(c) dependency injection** — supplying an *implementation/capability* down a subtree (e.g. an I/O client), not storing *data*.
4. **Local `useState`** — used by one component or a small subtree with no sharing need. Don't promote until something outside actually reads it.

## Notes

- **The one documented exception to rule 1** is `features/liveSession/store/liveSessionSlice.ts`: a server-owned live read model, seeded from a REST snapshot and then patched event-by-event by inbound STOMP events — something RTK Query has no mechanism for.
- **Keep the context trio small.** Pair `createContext` + `Provider` with a small access hook. Two patterns are in use, chosen per consumer: `useImageSlot` throws when used outside its provider; `useSlideCanvas` falls back to the context default so consumers stay renderable in isolation (both under `features/deck/contexts/`).
