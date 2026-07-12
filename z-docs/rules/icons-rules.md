# Icons & Images Rules

How SVGs are organized, named, and consumed. Most SVGs live under `frontend/src/shared/assets/` (aliased as `@assets`); some feature-local artwork lives next to its feature instead, e.g. `frontend/src/features/deck/assets/`.

1. **Icons vs images** — Monochrome UI marks go in `assets/icons/<category>/`; multi-color illustrations, mascots, and logos go in `assets/images/<category>/`. Categories: icons by function (`action`, `charts`, `content`, `interface`, `navigation`, `social`, `status`, `theme`, `user`); images by kind (`avatars-to-process`, `backgrounds`, `brand`, `card-types`, `landing-page`, `mascots`, `slide-types`). `images/unsorted/` is a triage inbox — never reference it from code.
2. **Filenames** — kebab-case, lowercase, noun-first (`chevron-down.svg`, not `down-chevron` or `ChevronDown`). No `-icon`/`-image` suffix (the folder says it); no size or color in the name. Variant suffixes: default = outline, `-solid` = filled mirror, `-filled` = alternate fill.
3. **Component names** — PascalCase, `Icon` suffix for icons, no suffix for images (`TrashIcon`, `CephadexLogo`). Matches Heroicons so swaps are one line.
4. **Colors** — Icons are monochrome and themable: use `fill="currentColor"` (or `stroke`) so CSS `color` controls them. Brand/social icons may hard-code brand colors. Images keep the designer's colors.
5. **Consume via `?react` only** — `import DeleteIcon from "@assets/icons/action/delete.svg?react"`, then render `<DeleteIcon className={styles.btnIcon} aria-hidden="true" />`. The `?react` suffix (via `vite-plugin-svgr`) makes it a component; without it the import is a URL string — don't use that. Never write inline `<svg>` for new artwork, and don't put SVGs in `public/` unless they must be fetched by URL.
6. **Sizing** — Don't hard-code `width`/`height` at the consumer; override via `className` + CSS. Pass `width`/`height` props only for genuine per-instance overrides.
7. **Heroicons are placeholders** — `@heroicons/react` is temporary. As designer-shipped icons land, replace heroicon usages one site at a time (component names stay the same, only the import path changes). Don't remove the package until parity is reached.

**Adding an asset:** if the SVG hard-codes a fill/stroke and isn't brand/social, change it to `currentColor`; drop it in the matching category folder with a kebab-case noun-first name (add a category if none fits); import via `?react` at the call site.
