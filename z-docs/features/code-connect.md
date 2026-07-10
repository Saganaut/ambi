# Figma Code Connect

Maps the design-system's Figma components to their code counterparts so Figma's
Dev Mode (and the Figma MCP server) surface the real `Btn` / `IconBtn` snippet
instead of a generic one.

## What's wired

Parser-based mappings (`figma.connect()`), colocated with the components:

| Mapping file | Code component | Figma node |
| ------------ | -------------- | ---------- |
| [`Btn.figma.tsx`](../../frontend/src/shared/components/UIElements/Buttons/Btn.figma.tsx) | `Btn` (`@ui/Buttons/Btn`) | "Button" set, `node-id=142-505` |
| [`IconBtn.figma.tsx`](../../frontend/src/shared/components/UIElements/Buttons/IconBtn.figma.tsx) | `IconBtn` (`@ui/Buttons/IconBtn`) | "IconButton" set, `node-id=147-517` |

Config lives in [`frontend/figma.config.json`](../../frontend/figma.config.json):
`parser: react`; `include` globs all `src` TS/TSX (the parser must reach both the
`.figma.tsx` mapping **and** the component source it imports); and the project's
`@ui/*` etc. path aliases are mirrored under `paths` so the CLI resolves imports
the same way Vite/tsconfig do. The dev dependency is `@figma/code-connect`.

### Property mapping

- **Button** — `Label` (text) → `children`; `Variant` → `variant` (primary/brand/info/success/warning/error); `Fill` → `fill` (default/bordered/ghost). The Figma set covers six of the eight `BtnVariant` values (secondary/disabled aren't drawn there); `size`/`shape` default.
- **IconButton** — `Variant` → `variant` (primary/brand/error); `Shape` → `shape` (square→default, round→round). The icon is a `ReactNode` passed at the call site.

## Activating it (requires a plan upgrade)

Code Connect **publishing is gated by Figma** and is not available on the Free/Starter or Professional plans — it needs **Organization or Enterprise**, and the components must be **published to a team library** first. Until then these files are valid, ready-to-publish artifacts but are not live in Dev Mode.

Once on a qualifying plan with the components published:

```bash
cd frontend
export FIGMA_ACCESS_TOKEN=<token with Code Connect write scope>
npx figma connect publish       # publish the mappings
npx figma connect unpublish     # remove them
```

Add a new mapping by dropping a `<Component>.figma.tsx` next to the component,
following the two existing files, then re-publishing.
