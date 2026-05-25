# Route protection — `_authenticated` layout route

> Companion doc to [auth/README.md](README.md). Assumes you've read the
> identity-model and request-authorization sections of the main auth doc.

**Status: implemented.** This page was originally an evaluation of whether
to adopt the TanStack Router `_authenticated` pattern. It's now the
description of how the gate actually works in the codebase, plus the
rationale for the shape we landed on.

## TL;DR

We adopted the pattern **narrowly**. Strictly registered-only routes live
under `src/routes/_authenticated/` behind a single layout route. The
existing 401 bridge and `useRequireLogin` are untouched — they do different
jobs and are still load-bearing.

## What's gated by `_authenticated`

| Route                  | File                                                 |
| ---------------------- | ---------------------------------------------------- |
| `/account`             | `src/routes/_authenticated/account.tsx`              |
| `/my-favorites`        | `src/routes/_authenticated/my-favorites.tsx`         |
| `/decks/`              | `src/routes/_authenticated/decks/index.tsx`          |
| `/my-decks/collections`| `src/routes/_authenticated/my-decks/collections.tsx` |
| `/games/create`        | `src/routes/_authenticated/games/create.tsx`         |

These are the routes that have a **binary** answer to "is this person
registered?" — there is no useful UI to show a visitor or a guest at any
of them.

URLs are unchanged. The `_authenticated` segment is pathless (TanStack
Router strips segments whose name starts with `_`), so `/account` still
resolves the way users expect.

## How it works

```mermaid
flowchart TD
    A[User navigates to /account] --> B[/_authenticated layout mounts]
    B --> C{useCurrentUser}
    C -- loading --> D[Render nothing, wait]
    C -- registered --> E[Render Outlet → AccountPage]
    C -- guest / visitor / error --> F[navigate to /]
    F --> G["search: { authPrompt:true, returnUrl:'/account' }"]
    G --> H[MainPage mounts]
    H --> I{authPrompt + not registered?}
    I -- yes --> J[openLoginModal with returnUrl]
    J --> K[Strip params from URL via navigate.replace]
```

Key files:

| File                                                                 | Role                                                                                |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `frontend/src/routes/_authenticated.tsx`                             | Pathless layout route. Component is just `<AuthenticatedLayout />`.                 |
| `frontend/src/components/Common/AuthenticatedLayout/AuthenticatedLayout.tsx` | The actual gate. Reads `useCurrentUser` and redirects on settle.            |
| `frontend/src/routes/__root.tsx`                                     | Switched to `createRootRouteWithContext<{ auth: CurrentUserState }>()`.             |
| `frontend/src/AppRouter.tsx`                                         | Wraps `<RouterProvider>` and feeds `auth` from `useCurrentUser` into the context.   |
| `frontend/src/main.tsx`                                              | Constructs the router with an initial `auth: { state: "loading" }`.                 |
| `frontend/src/routes/index.tsx`                                      | `validateSearch` accepts `authPrompt: boolean` and `returnUrl: string`.             |
| `frontend/src/pages/MainPage/MainPage.tsx`                           | Reads those search params and auto-opens the LoginModal once on mount.              |

### Loading-state handling

`beforeLoad` was the textbook choice for this gate, but it runs to a
synchronous decision and would have either redirected during the initial
`/api/auth/me` probe or required async context plumbing. The component-based
gate sidesteps that: while `userState.state === "loading"` the layout
renders `null`, and once the query settles it either lets `<Outlet />`
through or fires the redirect. No flash of "sign in to see..." UI on the
target page.

### Why a separate `AuthenticatedLayout.tsx` instead of inline in the route?

`react-refresh/only-export-components` fails when a file exports both a
component and a non-component (like the route's `Route` object). Splitting
the component into its own file under `components/Common/AuthenticatedLayout/`
keeps Fast Refresh on the gated subtree working. Same reasoning for
`AppRouter.tsx` — pulling it out of `main.tsx` keeps HMR alive for the
auth-context wrapper.

### The auth-prompt round-trip

When the layout redirects, it tags the URL with `authPrompt=true` and the
original `returnUrl`. The home route's `validateSearch` recognises these,
and `MainPage` calls `openLoginModal({ returnUrl })` once, then strips both
params with a `replace` navigation so a refresh doesn't reopen the modal.

`returnUrl` flows from there into the existing OAuth round-trip exactly the
way `LoginModal` already passed it — see the [main auth README](README.md#oauth-sign-in-flow).

## What we deliberately left alone

These layers do work that route gating cannot subsume:

| Layer                       | Why it stays                                                                                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 401 bridge (`AuthPromptBridge` + `baseQueryWithAuthPrompt`) | Sessions expire mid-page (30 min idle). The user is already on a protected page when the next request fails. Route gates only fire on navigation. |
| `useRequireLogin` action wrapper | Public pages (deck preview, explore, leaderboard) gate individual buttons (favorite, edit, create-game). The page itself is fine for visitors.                |
| Guest-allowed routes (`/games/$roomCode/play`, `/games/$roomCode/lobby`, `/games/join`) | These accept guests-or-registered, which doesn't fit a binary `_authenticated` gate. Page-level `useCurrentUser` still covers them. |
| Backend authorization (`SecurityConfig.java`, `@PreAuthorize`) | The real gate. Route protection is UX; you can't "skip" it client-side to read anything that matters. |

## What changed in the page components

Each page under `_authenticated/` had its `useCurrentUser` redirect or
`isRegistered` fallback removed. The page can now assume a registered
caller. Specifically:

- **`AccountPage`** — dropped the `useEffect(() => navigate({ to: "/" }))`
  block, the loading skeleton, and the `if (userState.state !== "registered") return null` guard. Kept `useCurrentUser` purely to pull
  `userState.user` for the avatar / username rendering.
- **`FavoritesPage`** — dropped the "Sign in to see your favorited decks"
  fallback panel and the `skip: !isRegistered` arg on the favorites query.
- **`CollectionsPage`** — dropped the equivalent fallback panel and `skip` arg.
- **`MyDecksPage`** — dropped the wrapping `{isRegistered && <section>...}`
  branches; the New Deck button and the deck-tab UI are now unconditional.
  Removed `useCurrentUser` import entirely.
- **`CreateGamePage`** — dropped the "You must be signed in" fallback and
  the `skip: !isRegistered` arg on `useListMyDecksQuery`. Removed
  `useCurrentUser` import.

## Adding a new gated route

1. Drop the route file at `src/routes/_authenticated/<path>.tsx`.
2. The TanStack Router Vite plugin will auto-update its
   `createFileRoute("/_authenticated/<path>")` declaration and regenerate
   `routeTree.gen.ts` on the next dev-server tick.
3. Don't call `useCurrentUser` for a redirect inside the page — the layout
   already guarantees registered. Use it only for accessing user fields.

## What this is _not_ a path to

This pattern is not a path to "remove backend authorization" or "stop
checking auth in components." It removes the duplicated _page-level_ "is
this person registered?" check on the routes that have a binary answer.
Everything else in the auth picture stays the way [auth/README.md](README.md)
describes it.
