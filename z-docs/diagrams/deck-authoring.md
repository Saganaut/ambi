# Deck Authoring

The deck editor (`/decks/$deckId/edit`) and its backend. A `Deck` is the
aggregate root; slides are embedded, so most writes go through `DeckService`
and rewrite the deck under an `@Version` optimistic lock (targeted `$set`/`$unset`
updates for settings promotion).

Prose companions: [deck-editor](../features/deck-editor/README.md),
[follow-up-slides](../features/follow-up-slides/README.md). Data shapes:
[Domain Model](domain-model.md). Frontend cache mechanics:
[Frontend Architecture](frontend-architecture.md).

## Backend layering

```mermaid
flowchart TB
    subgraph ctrl["Controller"]
        DC["DeckController<br/>/api/decks — 40+ endpoints<br/>CRUD · slides · images · settings · shares"]
    end
    subgraph svc["Service"]
        DS["DeckService<br/>permission checks + orchestration"]
        SR["SlideRankService<br/>LexoRank reordering"]
        US["UserService<br/>org-role lookups"]
    end
    subgraph repo["Repository"]
        DR["DeckRepository (Mongo)<br/>+ DeckRepositoryImpl.promoteFieldToDeck"]
    end
    subgraph model["Model"]
        DECK["Deck (aggregate root)<br/>canBeViewedBy / EditedBy / ManagedBy"]
        SLIDE["Slide[] (embedded)"]
    end

    DC --> DS
    DS --> SR
    DS --> US
    DS --> DR
    DR --> DECK
    DECK --> SLIDE
```

## Permission resolution

`DeckService` delegates authorization to pure predicates on the `Deck` aggregate.

```mermaid
flowchart TB
    REQ["request + AmbiPrincipal"] --> Q{"required capability"}
    Q -->|read| V["canBeViewedBy"]
    Q -->|edit| E["canBeEditedBy"]
    Q -->|manage| M["canBeManagedBy"]

    V --> VR{"owner? · ACL editor?<br/>PUBLIC+PUBLISHED? · org member?"}
    E --> ER{"owner? · ACL EDITOR?<br/>org OWNER/ADMIN?"}
    M --> MR{"owner? · org OWNER/ADMIN?"}

    VR -->|no| D404["404 (hide existence)"]
    ER -->|no| D403["403"]
    MR -->|no| D403
    VR -->|yes| OK["proceed"]
    ER -->|yes| OK
    MR -->|yes| OK
```

## Optimistic create & edit round-trip

The frontend mints ids and seeds the cache before the network call; the backend
treats create as idempotent.

```mermaid
sequenceDiagram
    autonumber
    participant U as Author
    participant R as TanStack route<br/>/my-decks/create
    participant Q as RTK Query cache
    participant API as DeckController

    U->>R: click "New deck"
    R->>R: mint UUID
    R->>Q: upsertQueryData(getDeck, empty deck)
    R->>U: navigate /decks/{id}/edit (replace)
    R->>API: PUT /api/decks/{id} (same id)
    API-->>Q: DeckResponse (idempotent create)

    Note over U,Q: editing a slide field
    U->>Q: type (local useState mirror)
    Q->>Q: useDebouncedCommit(500ms) schedule
    Q->>API: PATCH mutation (on debounce / blur flush)
    API-->>Q: response folded into getDeck cache<br/>(apiEnhancements onQueryStarted)
```

## Frontend editor composition

```mermaid
flowchart TB
    ROUTE["/decks/$deckId/edit"] --> DE["DeckEditor.tsx<br/>3-column shell + navbar title"]
    DE --> HOOK["useDeckEditor(deckId)"]
    HOOK --> RQ["useDeckQuery — single read boundary"]
    HOOK --> RM["useDeckMutate — write boundary"]
    HOOK --> SL["useSlide — add/remove/reorder"]

    DE --> LEFT["LeftSidebarContent<br/>slide rail · dnd-kit reorder · NewSlideModal"]
    DE --> CANVAS["SlideDisplay<br/>switch on element.kind"]
    DE --> RIGHT["RightSidebarContent<br/>SidePanelDrawer"]

    CANVAS --> SC["SlideContent/*SlideContent<br/>13 kind editors"]
    SC --> UEE["useElementEditor(isKind)<br/>schedule · flush · commit · markSynced"]
    RIGHT --> PANELS["EditSlidePanel · AnswerPanel<br/>DiscussionPanel · InviteSettingsPanel …"]
    SC --> RTI["RichTextInput (TipTap)"]
```

## Settings resolution hierarchy

Slides override a subset of deck defaults; a null field falls through.
"Apply to deck" promotes a slide value and clears every slide's override.

```mermaid
flowchart TB
    HARD["1 · Hardcoded frontend defaults"] --> DECKD
    DECKD["2 · Deck.settings<br/>point · answer · audience · invite"] --> SLIDED
    SLIDED["3 · Slide.settings (override)<br/>point · answer only"] --> RESOLVED["resolved value"]

    SLIDED -. null → inherit deck .-> DECKD
    note1["audience + invite are deck-only"]:::n -.-> DECKD
    PROMOTE["'Apply to deck' →<br/>PUT .../settings/promote<br/>$set deck · $unset all slides"] -.-> DECKD
    classDef n fill:#f6f6f6,stroke:#bbb,color:#333
```

### Slide background — three states

```mermaid
stateDiagram-v2
    [*] --> Inherit
    Inherit --> OwnImage : PUT slides/{id}/background-image
    Inherit --> Hidden : PUT .../background-image/hide
    OwnImage --> Inherit : DELETE .../background-image
    Hidden --> Inherit : DELETE .../background-image
    OwnImage --> Hidden : PUT .../background-image/hide

    note left of Inherit
        image=null, hide=false
        → shows deck default
    end note
    note right of OwnImage
        image set (hide ignored)
    end note
    note right of Hidden
        image=null, hide=true
        → shows nothing
    end note
```
