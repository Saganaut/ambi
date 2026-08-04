# Dev login & app screenshots

How to log in as the local dev account and screenshot the running app, including behind-login pages
(decks, editor, present, live sessions).

There is **no frontend route or button** for dev login — it is a single backend endpoint that mints
a real registered session; tooling (or your own browser) calls it directly.

## The endpoint

```text
POST http://localhost:8080/api/dev/login
```

`DevAuthController` and its filter chain `DevSecurityConfig` are `@Profile("DEV")`, so the beans do
not exist under PROD and the route 404s there. On first call it find-or-creates a fixed registered
user (username `devuser`, provider `INTERNAL`, subject `dev-login`, email `dev@ambi.local`); later
calls reuse it — no OAuth credentials and no seed run needed. It returns `200` with a registered
`MeResponse` and the `AMBI_AT` / `AMBI_RT` `Set-Cookie` headers, exactly like a real login, so
every `hasRole("USER")` page opens.

## Prerequisites

1. Infra up: `docker compose up -d`.
2. Backend on the **DEV** profile (the local default): `set -a; source dev.env; set +a` then
   `cd backend && ./mvnw spring-boot:run` — see [Running the project](running-the-project.md).
3. Frontend: `cd frontend && npm run dev` (<http://localhost:5173>).

## Screenshots (headless — the common case)

One-time: `cd frontend && npx playwright install chromium`. Then capture into
`frontend/.screenshots/` (git-ignored):

```bash
npm run screenshot                        # default routes: / and /decks
npm run screenshot -- /decks /account     # explicit routes
npm run screenshot -- /decks/<id>/edit    # id-bearing routes need a real id
```

`frontend/scripts/screenshot.mjs` POSTs to `/api/dev/login`, keeps the cookies in Playwright's
context jar, then screenshots each route as the dev user. Full-page PNGs are named after the route
(`/decks/x/edit` → `decks_x_edit.png`). Override targets for non-default ports:

```bash
SCREENSHOT_BACKEND=http://localhost:8095 SCREENSHOT_FRONTEND=http://localhost:5185 npm run screenshot
```

## Logging in as dev in your own browser

Open the frontend, then DevTools → Console:

```js
await fetch("http://localhost:8080/api/dev/login", { method: "POST", credentials: "include" });
location.reload();
```

`credentials: "include"` lets the browser store the `HttpOnly` cookies. Log out from the account
menu (or `POST /api/auth/logout`) to drop the session.

## API testing with curl

```bash
curl -s -X POST http://localhost:8080/api/dev/login -c /tmp/dev-cookies.txt | jq
curl -s http://localhost:8080/api/auth/me -b /tmp/dev-cookies.txt | jq
```

## Notes

- The dev user starts with no decks, so `/decks` renders the empty state — create or seed decks to
  screenshot populated views and get real ids.
- `/` redirects to `/decks` for a registered user; screenshot the landing page from a logged-out
  context.
- Background: [Testing & CI → Screenshot verification](../infrastructure/testing-and-ci.md#screenshot-verification-dev-only).
