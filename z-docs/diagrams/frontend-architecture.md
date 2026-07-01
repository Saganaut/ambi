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
        SLICE[".../store/*Slice.ts<br/>authPrompt · panel"]
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
    ROOT --> PUB["index · about · pricing · terms · register · invite/$token"]
    ROOT --> AUTH["_authenticated.tsx<br/>beforeLoad: requireRegistered"]
    AUTH --> ACC["account · achievements · my-favorites · scheduled"]
    AUTH --> DECKS["decks/index (MyDecks)"]
    DECKS --> DID["decks/$deckId/"]
    DID --> EDIT["edit — DeckEditor"]
    DID --> VIEW["view — DeckViewPage"]
    DID --> PRES["present"]
    AUTH --> SESS["sessions/$sessionId/index — SessionPage"]
```

## Deck editor commit flow

See [Deck Authoring](deck-authoring.md#frontend-editor-composition) for the full
component tree; the write path is:

```mermaid
flowchart LR
    IN["field edit"] --> LOCAL["useState mirror<br/>(re-sync only on element.id change)"]
    LOCAL --> DC["useDebouncedCommit(500ms)"]
    DC -->|"schedule (debounce)"| MUT
    DC -->|"flush (on blur / structural change)"| MUT
    MUT["RTK Query mutation"] --> ENH["apiEnhancements<br/>upsert into getDeck cache"]
    ENH --> RERENDER["subscribed components re-render"]
```

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
