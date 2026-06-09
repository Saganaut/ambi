# Auto-generated Frontend Artifacts (never hand-edit)

**Rule:** The API client, validation constants, and enum constants are generated from the backend's OpenAPI schema. Never hand-edit them; regenerate with `npm run generate` (backend must be running).

## API client

Per-feature RTK Query clients at `frontend/src/features/<feature>/store/<api>Api.gen.ts` (e.g. `features/deck/store/deckApi.gen.ts`, `features/gallery/store/galleryApi.gen.ts`). They inject their endpoints into the shared base `frontend/src/shared/store/emptyApi.ts`. Regenerate via `npm run generate-api` after backend API changes; the split is configured in `openapi-config.cts`.

## Validation constants

The per-feature `frontend/src/features/<feature>/store/<feature>ValidationConstants.ts` files (plus `shared/store/sharedValidationConstants.ts` for DTOs used by 2+ features) hold form bounds (lengths/patterns/min-max) lifted from the backend's `ValidationConstants` via OpenAPI. Each exports `<feature>Validation` / `sharedValidation`. Regenerate via `npm run generate-validation`.

Form inputs source their bounds from these through the `@utils/fieldValidation` helpers (`validateText`, `inputAttrs`) — **never hardcode** lengths/patterns in components. Client validation is UX-only; the backend stays authoritative.

## API enum constants

Backend enum-derived string literal unions (e.g. `publishStatus`, `slideType`, `difficulty`) are extracted as named `as const` objects into per-feature `frontend/src/features/<feature>/store/<feature>Enums.gen.ts` files (e.g. `features/deck/store/deckEnums.gen.ts`) — never re-declared locally. Each constant is anchored to the generated types via indexed access (`DeckResponse["publishStatus"]`) and validated with `satisfies Record<T, T>` so a backend enum change produces a compile error. Regenerate via `npm run generate-enums`; the enum→feature registry lives in `frontend/scripts/generate-enums.mjs` (add a line there for a new enum). See existing `*Enums.gen.ts` entries for the pattern.
