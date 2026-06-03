# Icons & Images — Rules

> How SVGs are organized, named, and consumed in this repo. Read this before adding a new icon or illustration.

## TL;DR

- All SVGs live under `frontend/src/assets/`.
- **Icons** (small monochrome UI marks) go in `assets/icons/<category>/`.
- **Images** (illustrations, mascots, logos, anything multi-color or large) go in `assets/images/<category>/`.
- Filenames are kebab-case.
- Consume every SVG as a React component via `vite-plugin-svgr`:

  ```tsx
  import TrashIcon from "@assets/icons/action/trash.svg?react";

  <TrashIcon className={styles.btnIcon} aria-hidden='true' />;
  ```

- Heroicons (`@heroicons/react`) are placeholders. As designer-shipped icons land, replace heroicon usages one at a time.

## Folder layout

```
frontend/src/assets/
├── icons/                  monochrome UI iconography
│   ├── action/             plus, minus, trash, edit, copy, send, save, share
│   ├── navigation/         chevron-down, chevron-up, chevron-left, arrow-left, arrow-up-right
│   ├── status/             check, x-mark, info, warning, error, check-filled
│   ├── content/            star, heart, thumb-up, flag (often with -solid variants)
│   ├── interface/          menu, search, settings, ellipsis-vertical, filter
│   ├── user/               user, user-circle, user-plus, lock
│   ├── theme/              sun, moon, contrast (mode toggles)
│   ├── media/              play, pause, stop, skip, volume
│   └── social/             github, discord, bluesky (brand-colored icons live here)
└── images/                 multi-color illustrations, mascots, brand artwork
    ├── mascots/            error-page art, story characters
    ├── slide-types/        decorative graphics keyed by DeckElement.kind
    ├── brand/              logos, wordmarks
    ├── backgrounds/        large illustrations used as backgrounds (svg or png)
    └── unsorted/           inbox for pre-existing assets awaiting triage —
                            DO NOT reference from code; sort into the categories
                            above as you encounter ones you actually need
```

## Naming convention

### Filenames

- **kebab-case, lowercase**. `chevron-down.svg`, never `ChevronDown.svg` or `chevron_down.svg`.
- **noun first, modifier after** — matches Heroicons. `chevron-down`, not `down-chevron`. `arrow-up-right`, not `up-right-arrow`.
- **no `-icon` / `-image` suffix**: the folder communicates that. `trash.svg`, not `trash-icon.svg`.
- **variant suffixes** for style/state:
  - default = outline / stroked: `star.svg`
  - `-solid` = filled mirror of the outline version: `star-solid.svg`
  - `-filled` = an alternate filled treatment when both `-solid` and a softer fill coexist: `check-filled.svg`
- **direction in the name when meaningful**: `chevron-down`, `arrow-left`.
- **no size or color in the filename** — those are runtime concerns.

### Component names

PascalCase, with the `Icon` suffix for icons and no suffix for images. This matches Heroicons so swaps are one-line:

```tsx
import TrashIcon from "@assets/icons/action/trash.svg?react";
import StarSolidIcon from "@assets/icons/content/star-solid.svg?react";
import CephadexLogo from "@assets/images/brand/cephadex-logo.svg?react";
import LostFish from "@assets/images/mascots/lost-fish.svg?react";
```

## Colors

- **Icons** are monochrome and themable. Designer-shipped icons should use `fill="currentColor"` (or `stroke="currentColor"`) so consumers control color with regular CSS `color`. Run designer SVGs through a one-off "replace hardcoded hex with `currentColor`" pass if needed.
- **Brand/social icons** (`icons/social/`) are allowed to hard-code their brand colors — Discord blurple, GitHub black, etc.
- **Images** keep the designer's colors. No `currentColor` discipline required.

## Sizing

- Don't hard-code `width=` / `height=` at the consumer unless you mean it. Override via `className` + CSS so the icon respects the surrounding type/spacing scale.
- For per-instance overrides, pass `width` / `height` props — svgr forwards them to the root `<svg>`.

## Consuming an SVG (the only pattern)

```tsx
import TrashIcon from "@assets/icons/action/trash.svg?react";

const Toolbar = () => (
  <button type='button' aria-label='Delete'>
    <TrashIcon className={styles.btnIcon} aria-hidden='true' />
  </button>
);
```

- The `?react` suffix flips the import into component mode (handled by `vite-plugin-svgr` in `vite.config.ts`). Without it, the import resolves to a URL string — don't use that path.
- The generated component is typed `React.FC<SVGProps<SVGSVGElement>>`. You can pass any standard SVG prop: `className`, `role`, `aria-label`, `width`, `height`, etc.
- **Do not write inline `<svg>` markup** for new artwork. Drop the file in `assets/` and import it.

## Workflow: adding a new icon

1. Designer hands you `trash.svg` (or you author one).
2. If the SVG hard-codes a fill/stroke, edit it to `currentColor` so it themes correctly. (Social/brand icons are exempt.)
3. Drop it into the matching `assets/icons/<category>/` folder with a kebab-case noun-first name. If no category fits, add a new one and document it here.
4. At the call site: `import TrashIcon from "@assets/icons/action/trash.svg?react"`.
5. If you're replacing a Heroicon, search the codebase for that Heroicon import and swap each call site. Component names stay the same — only the import path changes.

## Workflow: adding an illustration / mascot / brand asset

1. Drop the file into `assets/images/<category>/` using kebab-case.
2. Import via `?react` and render as a component. Don't `<img src=...>` these — you lose styling control and accessibility hooks.
3. Leave the artwork's colors as the designer authored them.

## Heroicons phase-out

`@heroicons/react` is still in `package.json` and used in ~25 components. It is a placeholder set, not a permanent dependency. As designer-shipped icons land, replace heroicons one site at a time using the workflow above. Do not remove the package wholesale until parity is reached.

## Things NOT to do

- **No inline `<svg>` markup** for new artwork. Existing inline SVGs in tiny functional chrome (Loader spinner, Dropdown chevron, Input clear button, LoginModal close X) are fine to leave; new artwork goes through this pipeline.
- **No URL-imported SVGs** (`import x from "./x.svg"` without `?react`). That path renders via `<img>` and you lose `currentColor`, className, and per-instance styling.
- **No SVGs in `public/`** unless they need to be browser-fetched by URL (e.g. a favicon). Files in `public/` don't go through svgr and won't be optimized by Vite.
- **No new files in `assets/images/unsorted/`** — that's a one-time inbox of pre-existing assets awaiting triage.
- **No PascalCase or `_underscored` filenames.** kebab-case only.

## Glossary

- **svgr** — `vite-plugin-svgr`; transforms a `.svg?react` import into a React component at build time. Wired in `frontend/vite.config.ts`.
- **`?react` suffix** — opts a single import into component mode. Without it, the import is a URL string.
- **`SVGProps<SVGSVGElement>`** — the React type for props that propagate to the root `<svg>`. svgr-generated components accept any of them.
