# BrainFlex — Big Rework Plan

Goal: collapse the awkward "Question doubles as Slide" model into a clean, polymorphic element architecture; make answer storage type-safe; carve out the bits that actually want their own collection. Backwards compatibility is **not** preserved — local data + sample seeds will be wiped and re-seeded.

Open questions are marked `❓` — please answer inline (or in chat) before we start executing.

---

## 1. Storage layout

### 1a. Deck elements: embedded vs separate collections

**Proposal: embedded.** A `Deck` document carries its full `elements: List<DeckElement>` inline. The element types form a sealed Java hierarchy with Jackson polymorphic deserialization keyed on `kind`.

Rationale:

- Decks are always read together with their elements (editor, runtime draw, review). One round-trip beats N.
- Element counts are bounded (5–50 typical, 100s worst case) — far below Mongo's 16 MB doc cap.
- Position becomes array index — no separate `position` field to maintain.
- Reordering is one document write, not N.

Trade-off accepted: we lose the ability to query elements globally (e.g., "find all questions tagged X"). When a future "question bank" surface needs it, we can promote a `Question` collection alongside (a question can belong to many decks via reference).

❓ Confirm embedded is the right call, OR you want per-kind collections (Slides / McqQuestions / TextQuestions / etc.) referenced from Deck via `List<ElementRef>`. The runtime cost difference is small; the editor UX is meaningfully simpler with embedded.

### 1b. InteractiveSession runtime state

`InteractiveSession` keeps its own collection (as today). It snapshots the deck's element list at create time so authoring a deck mid-interactive-session doesn't desync clients:

```
InteractiveSession.deckSnapshot: List<DeckElement>   // frozen copy
InteractiveSession.currentRound: int                 // index into deckSnapshot
```

This replaces today's `questionIds: List<String>` indirection — no separate lookups during play.

### 1c. New top-level collections

These don't live inside `InteractiveSession` because they're high-volume per-round and the host moderates them live:

- **`audience_submissions`** — Q&A and Best Answer submissions
- **`best_answer_votes`** — votes in the Best Answer second phase

---

## 2. Proposed Java model

```
cephadex.ambi.model
├── Deck                          (collection: decks)
├── element/                      (embedded sealed hierarchy)
│   ├── DeckElement               (sealed interface)
│   ├── Slide                     (implements DeckElement)
│   ├── McqQuestion               (implements Question)
│   ├── TextQuestion              (implements Question)
│   ├── NumberQuestion            (implements Question)
│   ├── ImageChoiceQuestion       (implements Question)
│   ├── RankingQuestion           (implements Question)
│   ├── ScalesQuestion            (implements Question)
│   ├── QAndAQuestion             (implements Question)
│   ├── GridQuestion              (implements Question)
│   ├── PlaceOnImageQuestion      (implements Question)
│   └── Question                  (sealed sub-interface for scored types — extends DeckElement)
├── InteractiveSession                      (collection: interactive sessions)
├── InteractiveSessionSettings              (embedded)
├── InteractiveSessionPlayer                (embedded)
├── InteractiveSessionResult                (collection: interactive_session_results)
├── PlayerAnswer                  (embedded in InteractiveSessionPlayer)
│   └── responsePayload: AnswerPayload (sealed)
├── answer/                       (sealed answer payloads)
│   ├── AnswerPayload             (sealed interface)
│   ├── McqAnswer                 (selectedOption)
│   ├── TextAnswer                (text)
│   ├── NumberAnswer              (value)
│   ├── RankingAnswer             (orderedItems)
│   ├── ScalesAnswer              (ratings per statement)
│   ├── GridAnswer                (selectedCells)
│   ├── PlaceOnImageAnswer        (x, y)
│   └── TimeoutAnswer             (no response)
├── AudienceSubmission            (collection: audience_submissions)
├── BestAnswerVote                (collection: best_answer_votes)
└── McqShuffle                    (embedded in InteractiveSession, keyed by element id)
```

### 2a. `DeckElement` base contract

```java
public sealed interface DeckElement permits Slide, Question {
    String id();                  // UUID, generated server-side at insert
    ElementKind kind();           // discriminator for Jackson
    String backgroundImageUrl();  // overrides Deck.backgroundImageUrl
    String hostNotes();           // speaker notes, never broadcast to participants
    int displaySeconds();         // 0 = wait for host (slides) or no timer (questions)
}

public sealed interface Question extends DeckElement
        permits McqQuestion, TextQuestion, NumberQuestion, ImageChoiceQuestion,
                RankingQuestion, ScalesQuestion, QAndAQuestion, GridQuestion,
                PlaceOnImageQuestion {
    String prompt();              // body text
    int pointValue();             // 0 = unscored
    Difficulty difficulty();
    boolean bestAnswerMode();     // when true: SUBMIT → VOTE → REVEAL
    int bestAnswerBonus();        // extra points for the voted "best" submission
    String explanation();         // post-answer "Here's why" copy
    // media
    String imageUrl();
    String videoUrl();            // YouTube only for v1
    String audioUrl();
    MediaPosition mediaPosition(); // TOP, BOTTOM, BACKGROUND
}
```

### 2b. Per-type extensions

```java
// Slide
record Slide(
    String id,
    SlideKind slideKind,          // TITLE, SECTION, CALLOUT, CONTENT, END
    String title,                 // optional headline
    String body,                  // markdown
    String backgroundImageUrl,
    String hostNotes,
    String imageUrl,
    String videoUrl,
    String audioUrl,
    MediaPosition mediaPosition,
    int displaySeconds            // auto-advance after N seconds; 0 = host advances
) implements DeckElement {
    public ElementKind kind() { return ElementKind.SLIDE; }
}

// MCQ
record McqQuestion(
    String id,
    String prompt,
    List<McqOption> options,      // 2–6 options; each carries text + optional image
    int correctIndex,             // index into options
    int pointValue,
    int displaySeconds,
    Difficulty difficulty,
    boolean bestAnswerMode,
    int bestAnswerBonus,
    String explanation,
    String imageUrl,
    String videoUrl,
    String audioUrl,
    MediaPosition mediaPosition,
    String backgroundImageUrl,
    String hostNotes
) implements Question {
    public ElementKind kind() { return ElementKind.MCQ; }
}

record McqOption(String id, String text, String imageUrl) {}
// option ids stay stable across shuffles; clients submit option id, not index.
// This removes the need for McqShuffle entirely — see §3.

// TextQuestion (free text)
record TextQuestion(
    String id,
    String prompt,
    String correctAnswer,         // canonical answer
    List<String> acceptedVariants,// case-insensitive trim-equal matches
    boolean caseSensitive,        // off by default
    int pointValue,
    int displaySeconds,
    Difficulty difficulty,
    boolean bestAnswerMode,
    int bestAnswerBonus,
    // ... shared media/host-notes fields
) implements Question {
    public ElementKind kind() { return ElementKind.TEXT; }
}

// NumberQuestion
record NumberQuestion(
    String id,
    String prompt,
    double correctValue,
    double tolerance,             // ±tolerance still counts as correct
    String unitLabel,             // "km", "%", "$" — display only
    int decimalPlaces,
    // shared fields...
) implements Question {
    public ElementKind kind() { return ElementKind.NUMBER; }
}

// ImageChoiceQuestion — same as MCQ but options carry images
// (same record shape as McqQuestion; kind() = IMAGE_CHOICE distinguishes for the renderer)

// RankingQuestion
record RankingQuestion(
    String id,
    String prompt,
    List<RankingItem> items,      // each: { id, label, imageUrl }
    List<String> correctOrder,    // list of item ids in correct order
    RankingScoring scoring,       // EXACT or PARTIAL (per-position credit)
    // shared fields...
) implements Question {
    public ElementKind kind() { return ElementKind.RANKING; }
}

record RankingItem(String id, String label, String imageUrl) {}

// ScalesQuestion (Likert)
record ScalesQuestion(
    String id,
    String prompt,
    List<ScaleStatement> statements,
    int scaleMin,                 // typically 1
    int scaleMax,                 // typically 5 or 7
    String minLabel,              // "Strongly disagree"
    String maxLabel,              // "Strongly agree"
    boolean scored,               // false in Pulse mode; true = "guess the average"
    List<Integer> correctRatings, // optional, one per statement when scored
    // shared fields...
) implements Question {
    public ElementKind kind() { return ElementKind.SCALES; }
}

record ScaleStatement(String id, String text) {}

// QAndAQuestion (Slido-style; no scoring)
record QAndAQuestion(
    String id,
    String prompt,                // "Ask anything"
    int maxSubmissionsPerPlayer,  // default 3
    boolean allowVoting,          // upvote other submissions
    boolean autoApprove,          // false = host moderates; true = visible immediately
    // shared fields (pointValue forced to 0)
) implements Question {
    public ElementKind kind() { return ElementKind.Q_AND_A; }
}

// GridQuestion
record GridQuestion(
    String id,
    String prompt,
    int rows,
    int cols,
    GridCellsConfig cells,        // either labels[] or a single backing image
    Set<Integer> correctCellIndexes,
    boolean multipleCorrect,      // player must select ALL correct cells (vs any one)
    // shared fields...
) implements Question {
    public ElementKind kind() { return ElementKind.GRID; }
}

record GridCellsConfig(List<String> labels, String backingImageUrl) {}

// PlaceOnImageQuestion
record PlaceOnImageQuestion(
    String id,
    String prompt,
    String targetImageUrl,        // the image players click on
    double correctX,              // 0..1 normalized
    double correctY,              // 0..1 normalized
    double tolerance,             // 0..1 — radius around correct point
    PlaceScoring scoring,         // BINARY (in/out) or LINEAR (closer = more points)
    // shared fields...
) implements Question {
    public ElementKind kind() { return ElementKind.PLACE_ON_IMAGE; }
}
```

### 2c. `Deck`

```java
record Deck(
    String id,
    String name,
    String description,
    String creatorUserId,
    String organizationId,        // optional
    boolean system,               // seeded by admin

    // visibility / sharing
    DeckVisibility visibility,    // PRIVATE | UNLISTED | ORG | PUBLIC

    // presentation
    String coverImageUrl,
    String backgroundImageUrl,
    String themeId,               // optional link to a saved Theme
    DeckPreset recommendedPreset, // GAME | PULSE | PRESENTATION (advisory)

    // metadata
    List<String> tags,            // multi-tag categorization
    String category,              // primary (legacy display field; one of tags)
    int estimatedDurationMinutes, // computed or author-supplied

    // content
    List<DeckElement> elements,   // the polymorphic embedded list — order = play order

    // interactive session defaults
    InteractiveSessionSettings defaultSettings,  // copied into InteractiveSession at create time

    // history / lineage
    String parentDeckId,          // null unless this was forked
    int version,                  // increment on save

    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
```

❓ Do we want `category` to remain a separate (legacy) field, or fully replace with `tags` + a first-tag-is-primary convention? Lighter to ship without `category`.

### 2d. `InteractiveSession` + answers

```java
record InteractiveSession(
    String id,
    String roomCode,
    String inviteToken,
    String hostUserId,
    String deckId,
    List<DeckElement> deckSnapshot,    // frozen copy of the deck's elements at create
    InteractiveSessionSettings settings,
    List<InteractiveSessionPlayer> players,
    int currentRound,
    InteractiveSessionStatus status,             // LOBBY | IN_PROGRESS | FINISHED | CANCELLED
    InteractiveSessionPhase phase,               // SUBMIT | VOTE | REVEAL  (new — see §3)
    String deckCoverImageUrl,
    String deckBackgroundImageUrl,
    String themeId,
    Map<String, McqShuffle> mcqShuffles, // dropped if we adopt stable option ids (§2b note)
    LocalDateTime createdAt,
    LocalDateTime startedAt,
    LocalDateTime endedAt,
    LocalDateTime roundStartedAt
) {}

record InteractiveSessionPlayer(
    String userId,
    String userName,
    String pictureUrl,
    boolean guest,
    int score,
    List<PlayerAnswer> answers
) {}

record PlayerAnswer(
    String elementId,
    AnswerPayload payload,        // sealed; see below
    boolean correct,
    int pointsAwarded,
    LocalDateTime answeredAt
) {}

sealed interface AnswerPayload
        permits McqAnswer, TextAnswer, NumberAnswer, RankingAnswer,
                ScalesAnswer, GridAnswer, PlaceOnImageAnswer, TimeoutAnswer {}

record McqAnswer(String optionId) implements AnswerPayload {}
record TextAnswer(String text) implements AnswerPayload {}
record NumberAnswer(double value) implements AnswerPayload {}
record RankingAnswer(List<String> orderedItemIds) implements AnswerPayload {}
record ScalesAnswer(Map<String /*statementId*/, Integer /*rating*/> ratings) implements AnswerPayload {}
record GridAnswer(Set<Integer> selectedCellIndexes) implements AnswerPayload {}
record PlaceOnImageAnswer(double x, double y) implements AnswerPayload {}
record TimeoutAnswer() implements AnswerPayload {} // sentinel for "didn't submit in time"
```

### 2e. New collections

```java
@Document("audience_submissions")
record AudienceSubmission(
    String id,
    String interactiveSessionId,
    String elementId,             // Q&A or Best-Answer-mode question
    String userId,
    String text,                  // primary content; for non-text Best Answer modes we'd extend
    SubmissionStatus status,      // PENDING | PINNED | DISMISSED
    int upvotes,
    LocalDateTime submittedAt
) {}

@Document("best_answer_votes")
record BestAnswerVote(
    String id,
    String interactiveSessionId,
    String elementId,
    String submissionId,          // FK to AudienceSubmission
    String voterUserId,
    LocalDateTime votedAt
) {}
```

### 2f. Settings + enums

```java
// InteractiveSessionSettings — close to today's shape, with the cleanups already in place
record InteractiveSessionSettings(
    int maxPlayers,
    int totalRounds,              // upper bound; clamped to elements.size at create
    int timePerQuestion,          // 0 = unlimited (replaces removed noTimer)
    boolean speedBonus,
    boolean allowGuests,
    GameMode gameMode,            // SIMULTANEOUS | TURN_BASED
    boolean allowLateJoin,
    boolean showScoresImmediately,
    boolean scoringEnabled,       // false = Pulse preset
    boolean shuffleMcqOptions
) {}

enum ElementKind { SLIDE, MCQ, TEXT, NUMBER, IMAGE_CHOICE, RANKING, SCALES,
                   Q_AND_A, GRID, PLACE_ON_IMAGE }
enum SlideKind   { TITLE, SECTION, CALLOUT, CONTENT, END }
enum MediaPosition { TOP, BOTTOM, BACKGROUND, NONE }
enum DeckVisibility { PRIVATE, UNLISTED, ORG, PUBLIC }
enum DeckPreset    { GAME, PULSE, PRESENTATION }
enum InteractiveSessionPhase { SUBMIT, VOTE, REVEAL }
enum SubmissionStatus { PENDING, PINNED, DISMISSED }
enum RankingScoring { EXACT, PARTIAL }
enum PlaceScoring   { BINARY, LINEAR }
```

---

## 3. Side-effects of the rework

### 3a. MCQ shuffling becomes ID-based, not index-based

Today: shuffle stored on `InteractiveSession.mcqShuffles` so server can map shuffled-position-N → original-index. Each option is identified by its position, which is fragile.

After: `McqOption.id` is stable; clients submit `McqAnswer(optionId)`. Server scores by comparing to `correctIndex → options[correctIndex].id`. The shuffle is purely presentational — server sends options in any order; ID identifies them. `McqShuffle` can be deleted entirely.

❓ Worth the model simplification? It removes a whole embedded map from `InteractiveSession` and the lazy-shuffle path in the service.

### 3b. Best Answer mode reuses existing flow

`InteractiveSession.phase` discriminates:

- SUBMIT — current `submitAnswer` flow
- VOTE — new `submitVote` flow (writes to `best_answer_votes`)
- REVEAL — round result broadcast; same shape as today but enriched with submissions + vote tallies

Only Questions with `bestAnswerMode = true` ever enter VOTE phase. Default behavior unchanged.

### 3c. Per-element timer overrides interactive session setting

`DeckElement.displaySeconds` is the round/slide duration. InteractiveSessionSettings.timePerQuestion becomes a hint — used only when the deck author left `displaySeconds = 0` (meaning "use the interactive session default"). Order of precedence:

1. element.displaySeconds > 0 → use that
2. else if settings.timePerQuestion > 0 → use that
3. else → no timer (questions); slides force a sane minimum

❓ Confirm this precedence — current code uses element.timeLimit unconditionally and lets settings.timePerQuestion=0 disable the timer globally. New behavior makes the element value primary which is more intuitive but is a behavior change.

### 3d. Seed data

Will be rewritten to use the new structures. Sample decks:

- "Welcome Tour" — exercises every element kind (slide + each question type with sample content) so the runtime is demoable end-to-end
- "General Knowledge" — pure trivia (MCQ + Text)
- "Audience Pulse" — Pulse preset interactive session (scales + Q&A + ranking)

❓ Want me to design the Welcome Tour explicitly in this doc before we execute, or do you want to author it yourself once the models land?

### 3e. Frontend type generation

OpenAPI will emit the polymorphic types; RTK Query codegen should handle the discriminator if we annotate the Java records correctly with `@JsonTypeInfo(use = Id.NAME, property = "kind")`. May need a manual type union (`type DeckElement = Slide | McqQuestion | ...`) in a hand-edited file if codegen gets confused — let's verify after we generate.

---

## 4. Migration / cleanup

Everything is wiped, nothing migrated. Concretely:

1. **Backend**: delete `Question.java`, `McqShuffle.java`, replace with the new model tree under `model/element/`, `model/answer/`. Rewrite `InteractiveSession.java`, `InteractiveSessionService.java`, `DeckService.java`, `InteractiveSessionReviewDTO.java`. Drop the old DTOs that conflate question types.
2. **DataSeeder**: rewrite. Drops `decks`, `questions`, `interactive sessions`, `interactive_session_results`, `audience_submissions`, `best_answer_votes` collections on startup (dev-only — gated by a `seed.reset=true` property) before re-seeding.
3. **Frontend**: rewrite the gameplay components to consume the discriminated union. Pack editor stays as your work — but I'll update the types so your new authoring screens compile.
4. **GAMES.md**: rewrite §0 to reflect the new shape (it currently describes the field-additions path; after this rework most ☐s become ✅ for "model captures it").

---

## Decisions

- **1a** Embedded element list ✅
- **2c** Drop legacy `category` field — tags only ✅
- **3a** Drop `shuffleMcqOptions` runtime entirely — instead add an editor button "Shuffle answers" that reorders `McqQuestion.options` (and updates `correctOptionId`) in place. Server then sends options in whatever order they're stored. ✅ — `McqOption.id` still stable so scoring is by option-id, but no per-round shuffle state anywhere.
- **3c** Per-element `displaySeconds` always overrides `InteractiveSessionSettings.timePerQuestion` ✅
- **3d** Welcome Tour deck spec'd below ✅

## Scaling note

Mongo's 16 MB document cap means a single embedded deck supports ~10k–15k elements assuming each carries text + an image URL (no inline binaries). If a future deck pushes past that, we promote elements to a separate collection then — for now it's fine.

---

## Welcome Tour deck

Deck id `6650000000000000000001`; name `BrainFlex Welcome Tour`; system + public; preset GAME with `scoringEnabled = true` but several elements set their own `pointValue = 0` so the tour still feels showroom-y, not competitive.

Element order:

1. **Slide / TITLE** — "Welcome to BrainFlex" • body "A quick tour through every kind of element a deck can contain. Press the screen to begin." • `displaySeconds = 6`
2. **Slide / SECTION** — "Trivia round" • `displaySeconds = 4`
3. **MCQ** — "Which planet is known as the Red Planet?" • opts: Venus, Jupiter, **Mars** ✓, Saturn • `displaySeconds = 15`
4. **TextQuestion** — "What is the capital of France?" • correct: `Paris` • variants: `paree` • `displaySeconds = 15`
5. **NumberQuestion** — "How many planets are in our solar system?" • correctValue: `8` • tolerance: `0` • unit: ` planets` • `displaySeconds = 15`
6. **Slide / SECTION** — "Order and rate"
7. **RankingQuestion** — "Order these planets from closest to farthest from the Sun" • items: Mercury, Venus, Earth, Mars • correct order: same • scoring: PARTIAL
8. **ScalesQuestion** — "Rate how excited you are about each feature (1=meh, 5=hyped)" • statements: Real-time gameplay, Pulse polling, Slides + media, Best Answer voting • `scored: false` (Pulse-style; just collect distribution)
9. **Slide / SECTION** — "Audience interaction"
10. **TextQuestion + bestAnswerMode** — "If our next deck had a one-word theme, what would it be?" • `pointValue: 0` (no objective answer) • `bestAnswerBonus: 100` • single VOTE phase
11. **QAndAQuestion** — "Ask anything about how the rest of the platform works" • `allowVoting: true` • `autoApprove: false` (host pins what they want to address)
12. **Slide / SECTION** — "Visual"
13. **GridQuestion** — "Select all the prime numbers" • 3×3 grid • cell labels `1..9` • correct cells `1, 2, 4, 6` (indexes for 2, 3, 5, 7) • `multipleCorrect: true`
14. **PlaceOnImageQuestion** — "Click on Italy" • target image: a Lorem Picsum stand-in (`https://picsum.photos/seed/ambi-welcome-map/1200/800`) since we don't have a real map asset yet • correctX `0.55`, correctY `0.42`, tolerance `0.08`, scoring `LINEAR`
15. **ImageChoiceQuestion** — "Which of these is the Eiffel Tower?" • 4 options, each carrying a Lorem Picsum image URL keyed by a deterministic seed • correct option flagged
16. **Slide / END** — "Thanks for playing!" • body "That's every element type. Go make your own deck." • `displaySeconds = 8`

Backgrounds: deck-level Lorem Picsum, individual elements inherit. Slides get the deck's bg too.

For asset URLs we use Lorem Picsum throughout — the user can swap any in later via the editor.

---

## Execution order

1. **Backend models** — new sealed hierarchies under `model/element/`, `model/answer/`; new enums; rewrite Deck, InteractiveSession, InteractiveSessionSettings, PlayerAnswer. Delete `Question.java`, `McqShuffle.java`.
2. **Backend repos + services** — DeckRepository unchanged interface; DeckService + InteractiveSessionService rewritten to walk the embedded element list; review aggregator handles all kinds via a polymorphic `aggregate(...)` per element.
3. **Backend DTOs** — DeckDTO with embedded `List<DeckElementDTO>` (sealed mirror of the model union); InteractiveSessionDTO carries `List<DeckElementDTO> deckSnapshot`.
4. **DataSeeder** — drops `decks`, `interactive sessions`, `interactive_session_results`, `audience_submissions`, `best_answer_votes` collections on startup behind a `seed.reset=true` Spring property (default true in dev). Seeds the Welcome Tour deck + a small General Knowledge deck for variety.
5. **WebSocket protocol** — `InteractiveSession.phase` (SUBMIT/VOTE/REVEAL) added; new `/app/interactive-session/{code}/vote` handler; new `/topic/interactive-session/{code}/voteStart` + `voteResult` topics.
6. **Backend tests** — rewritten against the new shapes; CreateInteractiveSessionRequest test sites updated.
7. **Frontend API client** — regenerated; the discriminated union flows through.
8. **Frontend gameplay** — per-kind renderers: keep MCQ + TEXT + SLIDE renderers, add NUMBER, RANKING, SCALES, Q_AND_A, GRID, PLACE_ON_IMAGE, IMAGE_CHOICE renderers. New `BestAnswerVoteView` for the VOTE phase.
9. **Frontend review** — ReviewPanel handles each new kind via its own aggregator visualization (histogram for NUMBER, average bar for SCALES, etc.).
10. **GAMES.md** — rewrite §0 (most ☐s become ✅), update §3a to point at the actual records, mark Best Answer mode shipped.

Phases 1–6 must land together; the frontend can be rolled out across 7–9 incrementally but ideally in one pass too since the API types are breaking.
