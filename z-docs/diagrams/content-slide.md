# Content Slide (non-scorable, block-based)

The **Content slide** is the first non-scorable slide type — a PowerPoint-style
display slide whose body is an ordered, polymorphic list of *blocks* (heading,
body text, bullet list, image, callout). It reuses the exact discriminated-union
pattern the MCQ content already uses, one level deeper: a slide's `content` is a
`SlideContent` union keyed by `contentType`, and a content slide's body is a
nested `SlideBlock` union keyed by `kind`.

It is surfaced in the editor as the **"Content"** tile (backed by the `TITLE`
`SlideType`); `MEDIA` and `FOLLOW_UP` are hidden from the picker.

Prose/data companions: [deck-authoring](deck-authoring.md),
[Domain Model](domain-model.md),
[deck-editor](../features/deck-editor/README.md),
[generated-artifacts](../rules/frontend/generated-artifacts.md).

## Content & block model

Two nested discriminated unions. Cross-cutting authoring knobs (points,
difficulty, shuffle) are **not** here — they live on `Slide` / `SlideSettings`.

```mermaid
classDiagram
    direction LR
    class SlideContent {
        <<sealed interface>>
        +contentType
    }
    class NonScorableContent { <<interface>> }
    class ScorableContent { <<interface>> }
    class TitleContent {
        <<record>>
        +List~SlideBlock~ blocks
    }
    class McqContent { <<record>> }
    class SlideBlock {
        <<sealed interface>>
        +String id
        +kind
    }
    class HeadingBlock {
        <<record>>
        +String text
        +Integer level
    }
    class BodyBlock {
        <<record>>
        +String richBody
    }
    class BulletListBlock {
        <<record>>
        +List~String~ items
    }
    class ImageBlock {
        <<record>>
        +AppImage image
        +String caption
    }
    class CalloutBlock {
        <<record>>
        +CalloutTone tone
        +String richBody
    }
    class CalloutTone {
        <<enum>>
        INFO
        WARN
        SUCCESS
    }

    SlideContent <|-- NonScorableContent
    SlideContent <|-- ScorableContent
    NonScorableContent <|.. TitleContent
    ScorableContent <|.. McqContent
    TitleContent "1" o-- "0..*" SlideBlock : blocks
    SlideBlock <|.. HeadingBlock
    SlideBlock <|.. BodyBlock
    SlideBlock <|.. BulletListBlock
    SlideBlock <|.. ImageBlock
    SlideBlock <|.. CalloutBlock
    ImageBlock ..> AppImage
    CalloutBlock ..> CalloutTone
```

## End-to-end type flow (backend → generated client → editor)

The block types are **backend-owned and generated**; the frontend never
hand-writes them. `OpenApiConfig` is generic — the same customizers that flatten
`SlideContent` also flatten the nested `SlideBlock` union with no extra code.

```mermaid
flowchart TB
    subgraph be["Backend (Java)"]
        TC["TitleContent<br/>List&lt;SlideBlock&gt; blocks"]
        SB["SlideBlock union<br/>content/parts/block/*"]
        OAC["OpenApiConfig<br/>flattenPolymorphicUnions()<br/>markRecordComponentsRequired()<br/>(+block pkg in scan list)"]
        TC --> SB
        SB --> OAC
        OAC --> DOC["/v3/api-docs<br/>flat oneOf + discriminator"]
    end
    subgraph gen["Codegen (npm run generate)"]
        API["generate-api → deckApi.gen.ts<br/>SlideBlock union · TitleContent.blocks"]
        ENUM["generate-enums → deckEnums.gen.ts<br/>SlideBlockKind · CalloutTone"]
        DOC --> API
        DOC --> ENUM
    end
    subgraph fe["Frontend (TS)"]
        BT["Block.types.ts<br/>re-exports generated types<br/>+ createSlideBlock / narrowSlideBlock"]
        HOOK["useTitleEditor(deckId, slideId)<br/>on useSlideEditor&lt;'TITLE'&gt;"]
        VIEW["TitleSlideContent<br/>BlockAdder + BlockCard[]"]
        EDIT["*BlockEditor (per kind)"]
        API --> BT
        ENUM --> BT
        BT --> HOOK
        HOOK --> VIEW
        VIEW --> EDIT
    end
```

## Authoring & persistence round-trip

Every block edit funnels through one debounced draft and lands as a single
whole-slide `PUT` — the same path MCQ uses. Structural ops (add/remove/move)
flush immediately; field typing debounces.

```mermaid
sequenceDiagram
    actor Author
    participant Card as BlockCard / *BlockEditor
    participant TE as useTitleEditor
    participant SE as useSlideEditor (draft + debounce)
    participant S as useSlide
    participant API as PUT /api/decks/{id}/slides/{slideId}
    participant DS as DeckService.updateSlide
    participant DB as MongoDB (deck doc)

    Author->>Card: add / edit / reorder block
    Card->>TE: addBlock / updateBlock / moveBlock / removeBlock
    TE->>SE: updateSlideContent((prev) => ({ blocks: … }))
    Note over SE: functional patch merges onto freshest draft<br/>so concurrent edits compound
    alt structural (add/remove/move) or blur
        SE->>S: flush → updateSlide(patch)
        S->>API: PUT whole slide (content + title)
        API->>DS: replace slide.content
        DS->>DB: save deck (@Version optimistic lock)
    else typing a field
        SE-->>SE: debounce, coalesce into one PUT
    end
    Note over DB: reload → GET returns TitleContent.blocks<br/>(null legacy body normalized to List.of())
```

## Editor dispatch & non-scorable gating

Adding a slide type touches two `switch`es and the picker; a content slide also
suppresses the answer-settings form (it has no score/answer).

```mermaid
flowchart LR
    NSM["NewSlideModal<br/>hides MEDIA + FOLLOW_UP<br/>TITLE labelled 'Content'"]
    NSM -->|pick| BDC["buildDefaultContent('TITLE')<br/>seeds one HeadingBlock"]

    subgraph canvas["SlideDisplay.renderBody"]
        SW{"content.contentType"}
        SW -->|TITLE| TSC["TitleSlideContent"]
        SW -->|MCQ| MSC["McqSlideContent"]
    end

    subgraph sidebar["AnswerPanel"]
        SC{"isScorableSlideType?"}
        SC -->|no · TITLE/MEDIA/Q_AND_A| HIDE["hide answer-settings form<br/>(only per-kind section shows)"]
        SC -->|yes| SHOW["time limit · multi-select · reveal-results"]
    end
```

## Adding another block kind

Mirrors the `SlideContent` ritual, scoped to `SlideBlock`:

1. New record implementing `SlideBlock` + a `@JsonSubTypes.Type` and a
   `oneOf`/`@DiscriminatorMapping` entry on `SlideBlock` (`content/parts/block`).
2. `npm run generate` — the generic flattener + codegen produce the new TS arm.
3. Frontend: a `*BlockEditor`, a `BlockCard` dispatch arm, and a
   `BLOCK_KIND_OPTIONS`/`BLOCK_KIND_LABEL`/`createSlideBlock` entry in
   `Block.types.ts`.
