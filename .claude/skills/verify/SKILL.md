---
name: verify
description: Drive the running Ambi app with Playwright to verify frontend changes end-to-end (dev login, fresh deck, editor flows, persisted-content assertions).
---

<!-- doc-lint-ignore -->

# Verify a frontend change against the running app

Backend (`:8080`) and Vite (`:5173`) are normally already running — check with
`curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/v3/api-docs` before
spawning anything.

## Handle

Playwright is available at `frontend/node_modules/playwright` (chromium already
installed). ESM scripts outside the frontend dir must import it by absolute path:

```js
import { chromium } from "/path/to/repo/frontend/node_modules/playwright/index.mjs";
```

## Session + CSRF (DEV only)

Cookies are host-scoped (`localhost`), so one Playwright context serves both the
API (`:8080`) and the app (`:5173`):

```js
await context.request.post("http://localhost:8080/api/dev/login"); // no body, no CSRF
await context.request.get("http://localhost:8080/api/decks/mine"); // mints XSRF-TOKEN cookie
const xsrf = (await context.cookies("http://localhost:8080"))
  .find((c) => c.name === "XSRF-TOKEN").value;
// send { "X-XSRF-TOKEN": xsrf } on every POST/PUT/DELETE
```

Note: `GET /api/decks` without params is a 400 — use `/api/decks/mine`.

## Stage state

- Fresh deck: `PUT /api/decks/<random-uuid>` (create-by-PUT, idempotent).
  Always stage fresh decks — old dev-DB decks can carry schema drift.
- Slides: prefer creating through the real UI (editor → "New Slide" → pick a
  type tile) so `buildDefaultContent` is exercised. Via API
  (`POST /api/decks/{id}/slides`) send only `title`/`content` — never `sortOrder`.
- Assert persistence by re-reading `GET /api/decks/{id}/slides` after UI edits
  (slide PUTs are debounced ~600ms — wait ≥700ms after blur).

## Driving the editor

- Route: `/decks/{deckId}/edit`.
- Hide the TanStack devtools bubble via `addInitScript` CSS or bottom-edge
  clicks time out.
- Item-row label fields have ids `item-label-<entityId>`; focusing one opens its
  popover menu. Menu entries ("Delete", "Upload an image") are NOT reachable via
  `getByRole("button", …)` — use `page.getByText("Delete", { exact: true })`.
- Dismiss a focus-opened menu with `Escape` before touching another row.
- Screenshots land in `frontend/.screenshots/`.

## Cleanup

Delete only the exact deck ids you created: `DELETE /api/decks/{id}` with the
XSRF header. Never pattern-match by title.
