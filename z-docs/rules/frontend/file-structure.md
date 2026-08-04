# Frontend File Structure — Architecture Blueprint

**Rule:** All code adheres to this four-layer structure. Routes match, pages orchestrate, features encapsulate domain logic, shared holds domain-agnostic base components.

```text
src/
├── AppRouter.tsx          # Global routing setup & provider matching
├── index.css              # Global baseline styles
├── main.tsx               # React application mount entry point
├── routeTree.gen.ts       # Auto-generated routing tree
├── tokens.css             # Global design tokens
├── styles/                # Global reusable layout utility classes
│
├── routes/                # Layer 1 — route matching & middleware
│ ├── __root.tsx           # Root layout shell wrapper
│ ├── index.tsx            # Public home route (/)
│ ├── [route-name].tsx     # Standard public pages (pricing, about, …)
│ └── _authenticated/      # Layout group forcing authorization checks
│   ├── [feature-name].tsx
│   └── [feature-name]/    # Nested protected paths
│
├── pages/                 # Layer 2 — visual page orchestrators
│ └── [PageName]/
│   ├── components/        # Local UI components unique to this page
│   ├── data.ts            # Local static data
│   ├── use[PageName].ts   # Page state coordinator hook
│   ├── [PageName].tsx
│   └── [PageName].module.css
│
├── features/              # Layer 3 — domain-driven business machinery
│ └── [feature-name]/
│   ├── components/        # Smart UI blocks used internally across this feature
│   ├── hooks/             # CQRS hooks (query / mutate / view-model)
│   ├── store/             # Generated RTK Query client + any feature-scoped slice
│   ├── [Feature].types.ts # Domain models — flat *.types.ts files, not a types/ dir
│   ├── utils/             # Pure helpers specific to this domain
│   ├── views/             # Large screen modules and page components
│   └── index.ts           # Public-API barrel
│
└── shared/                # Layer 4 — universal, domain-agnostic base
  ├── assets/              # Fonts, icons, brand images
  ├── components/          # Pure design-system components (props-driven)
  │ ├── Layout/            # Navbars, sidebars, grids
  │ ├── Forms/             # Inputs
  │ ├── UIElements/        # Buttons, Tabs, Avatar, Tooltip, StarRating, …
  │ └── [UI-Element]/      # Modals, dropdowns
  ├── context/             # App-wide UI providers (ToastProvider, ModalProvider)
  ├── hooks/               # Generic domain-agnostic hooks (useTheme, useFitText)
  ├── store/               # Store configuration + typed hooks
  ├── types/               # Application-wide generic TS types
  └── utils/
```

- Seven features exist today: `account`, `auth`, `deck`, `gallery`, `liveSession`, `org`, `theme`.
- The `index.ts` barrel is the norm only for `auth`; most features are imported via deep path aliases (`@features/deck/...`).
- `shared/store/` holds **no** slices — slices are feature-scoped (e.g. `features/deck/store/panelSlice.ts`). See [state-ownership.md](state-ownership.md).
- Buttons live under `shared/components/UIElements/`, not `Forms/`.
- Hook kinds and naming: [hook-roles.md](hook-roles.md).
