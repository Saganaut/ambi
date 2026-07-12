# Auto-generated Frontend Artifacts (never hand-edit)

**Rule:** The API client, validation constants, and enum constants are generated from the backend's OpenAPI schema. Never hand-edit them; regenerate with `npm run generate` (backend must be running).

## API client

Per-feature RTK Query clients at `frontend/src/features/<feature>/store/<api>Api.gen.ts` (e.g. `features/deck/store/deckApi.gen.ts`, `features/gallery/store/galleryApi.gen.ts`). They inject their endpoints into the shared base `frontend/src/shared/store/emptyApi.ts`. Regenerate via `npm run generate-api` after backend API changes; the split is configured in `openapi-config.cts`.

## Validation constants

The per-feature `frontend/src/features/<feature>/store/<feature>ValidationConstants.ts` files (plus `shared/store/sharedValidationConstants.ts` for DTOs used by 2+ features) hold form bounds (lengths/patterns/min-max) lifted from the backend's `ValidationConstants` via OpenAPI. Each exports `<feature>Validation` / `sharedValidation`. Regenerate via `npm run generate-validation`.

Form inputs source their bounds from these through the `@utils/fieldValidation` helpers (`validateText`, `inputAttrs`) — **never hardcode** lengths/patterns in components. Client validation is UX-only; the backend stays authoritative.

## API enum constants

Backend enum-derived string literal unions (e.g. `publishStatus`, `slideType`, `difficulty`) are extracted as named `as const` objects into per-feature `frontend/src/features/<feature>/store/<feature>Enums.gen.ts` files (e.g. `features/deck/store/deckEnums.gen.ts`) — never re-declared locally. Each enum emits a plain literal string-union type (e.g. `export type PublishStatus = "ARCHIVED" | "DRAFT" | "PUBLISHED";`) — not an indexed access into a DTO, since inline OpenAPI enums carry no name to anchor to — plus a same-named `as const` object validated with `satisfies Record<T, T>` so a backend enum change produces a compile error. Regenerate via `npm run generate-enums`; the enum→feature registry lives in `frontend/scripts/generate-enums.mjs` (add a line there for a new enum). See existing `*Enums.gen.ts` entries for the pattern.

## How the single source of truth flows

`npm run generate` runs all three generators at once (API client + validation constants + enums); the individual `generate-api` / `generate-validation` / `generate-enums` scripts run each in isolation. The backend must be running so the generators can read `http://localhost:8080/v3/api-docs`.

**Known gotcha:** `npm run generate` (and `generate-api` alone) currently **aborts** on the `dev-auth-controller` OpenAPI tag (from `DevAuthController`, the `DEV`-profile-only auth shortcuts). It has no entry in `openapi-config.cts`'s `tagToFeatureMap`, so `generateOutputFiles()` resolves an output path under `features/undefined/...` and the generator crashes — which, because `npm run generate` chains the steps with `&&`, also aborts the validation and enums steps that would otherwise have run. Workaround: add a `"dev-auth-controller": "auth"` entry to `tagToFeatureMap`, or run `generate-validation` / `generate-enums` individually to skip the broken step. While fixing this, note `generate-validation.mjs`'s own `TAG_TO_FEATURE` map (meant to be kept in sync with `openapi-config.cts` per its comment) has drifted too: it still has a dead `"slide-controller": "deck"` entry (no such controller/tag exists) and is missing `"review-controller": "deck"` (present in `openapi-config.cts`).

The `*ValidationConstants.ts` files are the frontend half of the validation single source of truth: bounds are authored once in the backend (`ValidationConstants`), surfaced into OpenAPI via Jakarta annotations, and lifted into TS by the generator. Each request DTO is routed to a feature by its controller tag (mirroring `openapi-config.cts`) and exported as `<feature>Validation`; DTOs shared by 2+ features (e.g. `Pageable`) land in `sharedValidationConstants.ts` as `sharedValidation`.

The `*Enums.gen.ts` files work the same way for enums: the backend emits each enum inline into OpenAPI, and `scripts/generate-enums.mjs` lifts the values into typed TS. Since inline enums carry no name, that script holds a small registry mapping each enum to its canonical name + feature folder — add a line there to generate a new enum.
