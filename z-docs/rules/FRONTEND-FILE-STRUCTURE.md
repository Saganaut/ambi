src/
├── AppRouter.tsx # Global routing setup & provider matching
├── index.css # Global baseline styles / Tailwind imports
├── main.tsx # React application mount entry point
├── routeTree.gen.ts # Auto-generated routing tree
├── tokens.css # Global design tokens (variables, theme scales)
│
├── routes/ # ── LAYER 1: ROUTE MATCHING & MIDDLEWARE
│ ├── \_\_root.tsx # Root layout shell wrapper
│ ├── index.tsx # Public home route (/)
│ ├── [route-name].tsx # Standard public pages (e.g., pricing, about)
│ └── \_authenticated/ # Layout group forcing authorization checks
│ ├── [feature-name].tsx # Protected feature routes
│ └── [feature-name]/ # Sub-directories for nested protected paths
│
├── pages/ # ── LAYER 2: VISUAL PAGE ORCHESTRATORS
│ ├── [StaticPage]/ # Simple marketing/informational screen folder
│ │ ├── [StaticPage].tsx # Main page layout
│ │ └── [StaticPage].module.css
│ └── [DynamicPage]/ # Heavy dashboard/application screen folder
│ ├── components/ # Local UI components unique strictly to this page
│ ├── data.ts # Local static data matrices or mock structures
│ ├── use[DynamicPage].ts # Dedicated page state coordinator hook
│ └── [DynamicPage].tsx # High-level feature orchestration view
│
├── features/ # ── LAYER 3: DOMAIN-DRIVEN ENCAPSULATED BUSINESS MACHINERY
│ └── [feature-name]/ # Self-contained slice of business value (e.g., auth, decks)
│ ├── api/ # Localized network query handlers & cache mutations
│ ├── components/ # Smart UI blocks used internally across this feature
│ ├── hooks/ / stores/ # Localized state engines (e.g., editor canvas tracking)
│ ├── types/ # Standard domain entity data models and type interfaces
│ ├── utils/ # Pure helper functions specific to this domain data
│ ├── views/ # Large screen modules (e.g., EditorCanvas, DisplayGrid)
│ └── index.ts # 🌟 THE PUBLIC API (Strictly exports shared items)
│
└── shared/ # ── LAYER 4: UNIVERSAL DOMAIN-AGNOSTIC BASE LAYER
├── assets/ # Global foundations (fonts, icons, brand images)
├── styles/ # Global reusable layouts and layout utility classes
├── components/ # Pure Design System components (Driven strictly by props)
│ ├── Layout/ # Visual framework helpers (Navbars, Sidebars, Grids)
│ ├── Forms/ # Atomic design inputs (Buttons, TextFields, Switches)
│ └── [UI-Element]/ # Reusable presentational layouts (Modals, Dropdowns)
├── context/ # Environment UI providers wrapping application tree roots
│ ├── [Env]Provider.tsx # App-wide UI event nodes (e.g., ToastProvider, ModalProvider)
├── hooks/ # Generic domain-agnostic hooks (useTheme, useFitText)
├── store/ # Core global network backbone (Global state registry & API setup)
│ ├── store.ts # Primary store configuration
│ ├── hooks.ts # Fully typed UseAppSelector and UseAppDispatch hooks
│ └── [global]Slice.ts # Global state slices (e.g., auth tokens, global settings)
├── types/ # Application-wide generic TypeScript configurations
└── utils/
