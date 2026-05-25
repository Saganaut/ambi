# Features

Per-feature design docs. One subfolder per feature; each owns its `README.md` plus any supporting notes, mockups, or migration scripts.

## Existing

- [Auth](auth/README.md) — Google OAuth + guest sessions, cookie + Redis session store.
- [Games](games/README.md) — InteractiveSessions & decks implementation checklist and notes.
- [Deck Editor](deck-editor/README.md) — `/decks/$deckId/view` authoring dashboard architecture (commit pattern, cache sync, RichText, fullscreen).
- [Data Models](data-models.md) — User / PlayerStats / Organization / Theme MongoDB documents, DTOs, image processing tiers.
- [Membership](membership/README.md) — Organization membership semantics and flows.
- [Email](email/README.md) — Outbox-backed dispatch for transactional / system / marketing email; design sketch for the v1 module + future Lambda+SQS swap.
- [Exception Handling](exceptions.md) — Centralized RFC 9457 ProblemDetail error contract, ApiException hierarchy, 5xx disclosure policy, tiered 404-vs-403.

## Adding a new feature

1. Create `z-docs/features/<feature-name>/` with a `README.md` describing scope, models, endpoints, and an implementation checklist.
2. Add a row above so the linter can reach it.
3. Drop any supporting docs into the same folder and link them from that feature's `README.md`.
