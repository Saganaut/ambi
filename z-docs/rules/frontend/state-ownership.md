# State ownership: slice vs context vs local vs cache

Where a piece of state lives is not a style choice — three of the four homes have a hard constraint that rules the others out. Pick the home by the **nature of the value**, in this priority order.

## The decision rule

1. **RTK Query cache** — *all* server data. It owns fetching, caching, and reconciliation; nothing about server entities belongs in a slice or context. See [rtk-query-cache.md](rtk-query-cache.md). The one documented exception is `features/liveSession/store/liveSessionSlice.ts`: it holds server-owned view models (participants, scoreboard, round phase, …) that are seeded once from a REST snapshot and then incrementally patched by inbound STOMP events — RTK Query owns fetch/cache/reconcile-from-response, but has no mechanism for a socket to patch a query's cached data event-by-event, so this live read model is a deliberate slice instead.
2. **Redux slice** — client state that is **serializable** *and* **genuinely global** (one value for the whole app / a whole feature). A slice is the least-boilerplate home for this category — reach for it before a context. Examples: `features/deck/store/panelSlice.ts` (which panel is open), `features/auth/store/authPromptSlice.ts` (the 401 login-prompt flag).
3. **React context** — when the value is **any** of:
   - **(a) non-serializable** — functions, `ReactNode`, refs, timers, or live I/O handles. Redux's `serializableCheck` middleware rejects these, so the store is structurally off the table.
   - **(b) scoped per-subtree or per-instance** — Redux is a singleton global; a single slice cannot hold "one value *per* X". If two of the component could mount at once, a slice collapses their state into one shared (buggy) value.
   - **(c) dependency injection** — supplying an *implementation/capability* down a subtree (e.g. an I/O client), not storing *data*.
4. **Local `useState`** — used by one component or a small subtree with no sharing need. Don't promote to a slice or context until something outside actually reads it.

> The boilerplate you feel from context is the cost of *hand-rolling* the `createContext` + `Provider` + `useX` trio — not of context itself. Keep that trio tiny with a small access hook (see `useImageSlot` / `useSlideCanvas` under `features/deck/contexts/` — `useImageSlot` throws if used outside its provider, while `useSlideCanvas` falls back to a default value so it renders in isolation; pick per consumer's needs), and the comparison with a slice is close to even — at which point the rule above, not boilerplate, decides.

## How the existing contexts map to the rule

Every context in the codebase exists for a reason a slice cannot satisfy — none of them is "serializable global state that should have been a slice". This inventory isn't exhaustive, but every context in the codebase fits one of categories (a)/(b)/(c):

| Context | Why it's a context, not a slice |
| --- | --- |
| `shared/context/ModalProvider` | (a) holds `openModal(content: ReactNode)` — JSX isn't serializable; (c) injects the modal-opening capability |
| `shared/context/ToastProvider` | (a) holds a `Map` of `setTimeout` refs + `addToast`/`dismissToast` functions |
| `shared/context/LayoutProvider` | (a) control functions (`toggleFullScreen`) + an ESC-key effect owned by the provider |
| `features/liveSession/.../SessionConnectionContext` | (a)/(c) a thin REST adapter — `send*`/`upload*` functions that each call one `useLiveSessionMutate` command — injected into the session subtree. (STOMP is only the *incoming* event stream, read via `liveSessionSlice`/`useLiveSessionQuery`; this context never sends over the socket.) |
| `shared/components/Menus/DropdownMenu` (`DropdownMenuContext`) | (a) floating-ui `getItemProps` + `closeMenu`; (b) `activeIndex` is **per dropdown** |
| `shared/components/Popover/PopoverNavContext` | (a) floating-ui `getItemProps`; (b) `activeIndex` is **per popover instance** (null when the host popover doesn't wire navigation) |
| `features/deck/contexts/SlideCanvasContext` | (b) one `hasBackgroundImage` flag **per canvas** — a global would clobber across instances |
| `features/deck/contexts/ImageSlotContext` | (a) a `setPreviewPlacement` setter; (b) transient hover preview scoped to the active editor |
| `features/deck/contexts/ResultsPreviewContext` | (a) a `setPreviewVisualization` setter; (b) transient results-viz preview scoped to the active slide's editor |
| `McqSlideContext` / `useMcqSlideContext` (`McqSlideContent/McqSlideProvider`) | (a)/(c) injects the MCQ editor's hook result (handlers, gallery picker) plus transient `activeOption` state down the MCQ slide subtree |

Contrast with the slices (`panelSlice`, `authPromptSlice`): both are plain serializable flags read app-wide — the correct home is a slice, and using one there is *less* code than a context, not more. (`liveSessionSlice` is the third slice in the codebase, but it's the documented server-data exception above, not this category.)

Not every context follows the throw-if-no-provider pattern above: `useSlideCanvas` (`features/deck/contexts/useSlideCanvas.tsx`) instead falls back to the context's default value (`{ hasBackgroundImage: false }`) when used outside a provider, so consumers stay renderable in isolation. `useImageSlot` is the throw-if-no-provider example.
