# Frontend Architecture

React 19 + TypeScript SPA. Feature-sliced modules, TanStack file-based routing,
Redux Toolkit for UI chrome, and RTK Query (injected from an empty base API) as
the primary server-state cache. API clients, validation bounds, and enums are
**generated** from the backend OpenAPI schema — never hand-edited.

Conventions: [frontend-rules](../rules/frontend-rules.md). Cache mechanics:
[rtk-query-cache](../rules/frontend/rtk-query-cache.md). Auth backend:
[Authentication](authentication.md).

## Module & store composition

```mermaid
flowchart TB
    subgraph feats["features/*  (account · auth · deck · gallery · liveSession · org · theme)"]
        direction LR
        API[".../store/<feature>Api.gen.ts<br/>injectEndpoints (generated)"]
        SLICE[".../store/*Slice.ts<br/>authPrompt · panel · liveSessionSlice"]
        HOOKS[".../hooks/*"]
        VIEWS[".../views + components"]
    end

    EMPTY["shared/store/emptyApi.ts<br/>emptySplitApi + baseQueryWithReauth"]
    STORE["shared/store/store.ts<br/>configureStore"]
    ENH["shared/store/apiEnhancements.ts<br/>onQueryStarted cache-sync (side-effect import)"]

    API -->|inject into| EMPTY
    EMPTY --> STORE
    SLICE --> STORE
    ENH -.->|patches mutations| API
    HOOKS --> VIEWS
    API --> HOOKS
```

## Request pipeline & re-auth

```mermaid
flowchart LR
    COMP["Component hook<br/>useGetXQuery / useXMutation"] --> BQ["fetchBaseQuery<br/>+ X-XSRF-TOKEN · X-Request-Id<br/>+ multipart auto-formdata"]
    BQ --> API["/api/** (cookies)"]
    API -->|"401 (except /auth/me)"| REAUTH["baseQueryWithReauth<br/>single-flight refreshSession()"]
    REAUTH -->|ok| BQ
    REAUTH -->|fail| PROMPT["dispatch authPromptRequested<br/>→ LoginModal"]
    API -->|"RFC 9457 error"| LOG["log with server traceId"]
```

## Auth state machine (client)

`useCurrentUser()` branches on the discriminated `state` field returned by
`GET /api/auth/me` (a probe that always returns 200).

```mermaid
stateDiagram-v2
    [*] --> loading
    loading --> visitor
    loading --> guest
    loading --> preRegistration
    loading --> registered
    loading --> error
    guest --> registered : OAuth / register
    preRegistration --> registered : register
    registered --> visitor : logout
    note right of registered
        me · userLevel · effectiveTier
        (guards.requireRegistered gates
        the _authenticated route subtree)
    end note
```

## Routing tree (TanStack, file-based)

```mermaid
flowchart TB
    ROOT["__root.tsx<br/>ErrorBoundary · Layout/Toast/Modal providers · NavBar"]
    ROOT --> PUB["index · about · pricing · terms-and-conditions ·<br/>register · invite/$token"]
    ROOT --> JOIN["join — SessionJoinPage<br/>(public player entry point)"]
    ROOT --> AUTH["_authenticated.tsx<br/>beforeLoad: requireRegistered"]
    AUTH --> ACC["account · achievements · my-favorites · scheduled"]
    AUTH --> DECKS["decks/index (MyDecks)"]
    DECKS --> DID["decks/$deckId/"]
    DID --> EDIT["edit — DeckViewPage → DeckEditor"]
    DID --> VIEW["view — DeckViewPage → DeckEditor<br/>(same component; no separate read-only view)"]
    DID --> PRES["present — unimplemented placeholder stub"]
    AUTH --> SESS["sessions/$sessionId/index — SessionPage"]
```

Plus `login-error` at the root level. The editor write path is drawn in
[Deck Authoring](deck-authoring.md#optimistic-create--edit-round-trip).

## Deck mutation cache reconcile

The base API defines no `tagTypes`, so deck-level edits don't invalidate and
refetch — each mutation's `onQueryStarted` reconciles the caches by hand from its
own `DeckResponse` (`features/deck/store/enhancements/deck.ts`). Two caches hold
the same deck and **both** must be patched, or the untouched one goes stale until
a refetch:

- **`getDeck`** — backs the editor. Optimistically patched first for an instant
  preview, then whole-object replaced from the response.
- **`listMyDecks`** — backs the My Decks grid. The matching card is patched with
  the same response; `updateQueryData` is a no-op if the grid was never visited.
- `listDecksForOrg` / `listPublicDecks` have no consumer today and are not
  patched. `deleteDeck` is the mirror case (`optimisticDeleteDeck` splices the
  deck out of the same list caches) — extend both paths together when a consumer
  appears.

## Generated artifacts pipeline

```mermaid
flowchart LR
    VC["backend ValidationConstants + Jakarta annotations"] --> OAPI["OpenAPI /v3/api-docs"]
    ENUMS["backend enums (inline)"] --> OAPI
    ROUTES["controllers"] --> OAPI
    OAPI -->|npm run generate-api| A["<feature>Api.gen.ts"]
    OAPI -->|npm run generate-validation| B["<feature>ValidationConstants.ts<br/>+ sharedValidationConstants.ts"]
    OAPI -->|npm run generate-enums| C["<feature>Enums.gen.ts"]
    A -. do not edit .-> A
```
