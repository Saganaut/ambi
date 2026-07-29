# Dev login & app screenshots

How to log in as the local dev account and capture screenshots of the running app — including the behind-login pages (decks, editor, present, live sessions).

There is **no frontend route or button** for dev login. It is a single backend endpoint that mints a real registered session; tooling (and, if you want, your own browser) calls it directly.

## The endpoint

```text
POST http://localhost:8080/api/dev/login
```

- **DEV profile only.** The controller (`DevAuthController`) and its filter chain (`DevSecurityConfig`) are gated by `@Profile("DEV")`, so the beans **do not exist under `PROD`** — the route 404s in production.
- **Self-seeding.** On first call it find-or-creates a fixed registered user (username `devuser`, provider `INTERNAL`, subject `dev-login`, email `dev@ambi.local`); later calls reuse it. No OAuth credentials and no seed run required.
- **What it returns.** `200` with a registered `MeResponse` body and two `Set-Cookie` headers — `AMBI_AT` (access JWT) and `AMBI_RT` (refresh) — exactly like a real login. A registered `USER` satisfies the `hasRole("USER")` guard, so all behind-login pages open.
- It cannot be triggered by typing a URL in the address bar: that's a `GET`, and the cookies are `HttpOnly` (JS can't set them, the browser must receive them from the response).

## Prerequisites

1. Infra up: `docker compose up -d` (Mongo, Redis, Garage S3).
2. Backend running on the **DEV** profile: `cd backend && ./mvnw spring-boot:run` (local dev is DEV by default; `scripts/ambi.sh` sources `dev.env` for the S3/OAuth values the app needs to boot).
3. Frontend running: `cd frontend && npm run dev` (http://localhost:5173).

## Taking screenshots (headless — the common case)

One-time browser install:

```bash
cd frontend
npx playwright install chromium
```

Then capture routes into `frontend/.screenshots/` (git-ignored):

```bash
npm run screenshot                        # default routes: / and /decks
npm run screenshot -- /decks /account     # explicit routes
npm run screenshot -- /decks/<id>/edit    # id-bearing routes need a real id
```

The script (`frontend/scripts/screenshot.mjs`) POSTs to `/api/dev/login`, keeps the returned cookies in Playwright's context cookie jar, then screenshots each route as the logged-in dev user. Full-page PNGs are named after the route (`/decks/x/edit` → `decks_x_edit.png`).

Override the targets with env vars when running against non-default ports:

```bash
SCREENSHOT_BACKEND=http://localhost:8095 SCREENSHOT_FRONTEND=http://localhost:5185 npm run screenshot
```

## Logging in as dev in your own browser (manual clicking)

To browse the app as the dev user yourself, open the frontend (http://localhost:5173), open DevTools → Console, and run:

```js
await fetch("http://localhost:8080/api/dev/login", { method: "POST", credentials: "include" });
location.reload();
```

`credentials: "include"` lets the browser store the `HttpOnly` cookies from the response; after the reload the SPA's `/api/auth/me` probe sees a registered session and you land on `/decks`. Log out from the normal account menu (or `POST /api/auth/logout`) to drop the session.

## API testing with curl

```bash
# Log in, saving cookies to a jar, then call a protected endpoint with them:
curl -s -X POST http://localhost:8080/api/dev/login -c /tmp/dev-cookies.txt | jq
curl -s http://localhost:8080/api/auth/me -b /tmp/dev-cookies.txt | jq
```

## Notes & gotchas

- **Empty library at first.** The dev user starts with no decks, so `/decks` renders the empty "My Decks" state. Create decks in-app (or seed data) to screenshot populated views and to get real ids for the editor/present/session routes.
- **`/` redirects to `/decks`** for a registered user, so a screenshot of `/` captures the decks page, not the marketing landing page. Screenshot the landing page from a fresh (logged-out) context if you need it.
- **Prod safety.** Because the beans are `@Profile("DEV")`, none of this exists in production — confirm by checking that `POST /api/dev/login` 404s there.
- Design/implementation background lives in [Testing & CI → Screenshot verification](../infrastructure/testing-and-ci.md#screenshot-verification-dev-only).
