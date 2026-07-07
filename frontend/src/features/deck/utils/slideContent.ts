/**
 * Default slide-content factory.
 *
 * `SlideRequest.content` is required and discriminated by `contentType`, which
 * is the slide's only kind marker (there is no separate `slideType` field), so a
 * brand-new slide must ship a content object of the desired kind. This module is
 * the single place that mints minimal placeholder
 * content for each slide kind: every required field of the matching content
 * record gets a sensible default, while optional fields (`maxLength`,
 * `imagePrompt`, `caption`, …) are left off for the type-specific editor to fill
 * in once the slide exists. Cross-cutting authoring knobs (points, difficulty,
 * explanation, shuffle, anonymity) are no longer content — they live on the
 * slide and its settings — so they are absent here entirely.
 */
import { nanoid } from "nanoid";
import {
  AxisItem,
  GridItem,
  McqOption,
  RankItem,
  ScaleItem,
  SlideContent,
} from "../store/deckApi.gen";
type SlideType = NonNullable<SlideContent["contentType"]>;

/**
 * Slide kinds that produce no score and take no player answer — mirrors the
 * backend `NonScorableContent` union (TITLE / CONTENT / MEDIA / INSTRUCTION /
 * Q_AND_A). Used to hide answer/scoring UI (time limit, multiple answers,
 * reveal-results, …) for these kinds. Keep in sync with the backend split.
 */
export const NON_SCORABLE_SLIDE_TYPES: ReadonlySet<SlideType> = new Set<SlideType>([
  "TITLE",
  "CONTENT",
  "MEDIA",
  "INSTRUCTION",
  "Q_AND_A",
]);

/** True when a slide kind is scored / accepts player answers. */
export const isScorableSlideType = (slideType: SlideType): boolean =>
  !NON_SCORABLE_SLIDE_TYPES.has(slideType);

const assertNever = (slideType: never): never => {
  throw new Error(`Unhandled slideType: ${String(slideType)}`);
};

/**
 * Build minimal placeholder {@link SlideContent} for a new slide of the given
 * type. The exhaustive `switch` (guarded by {@link assertNever}) forces a
 * compile error here whenever a new slide type is added to the API.
 *
 * @param slideType the slide kind to create content for
 */
export const buildDefaultContent = (slideType: SlideType): SlideContent => {
  switch (slideType) {
    case "TITLE":
      // A title slide's headline is the slide title; the optional subtitle is
      // left off until the author types one.
      return { contentType: "TITLE" };
    case "CONTENT":
      // A content slide is a single rich-text body, empty until authored.
      return { contentType: "CONTENT", body: "" };
    case "MEDIA":
      // Defaults to an image slot; the author can switch it to an embedded
      // YouTube video. autoplay/loop/muted are required primitives on the wire.
      return {
        contentType: "MEDIA",
        mediaType: "IMAGE",
        autoplay: false,
        loop: false,
        muted: false,
      };
    case "INSTRUCTION":
      // Join URL + code are filled in at session time; heading/body are optional
      // author overrides, left off by default.
      return { contentType: "INSTRUCTION" };
    case "Q_AND_A":
      return { contentType: "Q_AND_A", moderated: false };
    case "MCQ":
      return {
        contentType: "MCQ",
        options: [buildDefaultMcqOption(), buildDefaultMcqOption()], // Start with 2 options, the minimum for a valid MCQ.
        correctOptionIds: [],
        dataVisualization: "NONE", // No results chart until the author picks one.
      };
    case "TEXT":
      return {
        contentType: "TEXT",
        acceptedAnswers: [],
        matchMode: "EXACT",
        caseSensitive: false,
        trimWhitespace: true,
      };
    case "NUMBER":
      // `answer` is left off so a new slide starts unscored (collect-only),
      // mirroring TEXT's empty acceptedAnswers; the author opts into scoring by
      // setting an exact value or a range.
      return {
        contentType: "NUMBER",
        scoreMode: "EXACT",
        tolerance: 0,
        unit: "",
        min: 0,
        max: 100,
      };
    case "RANKING": {
      // Seed two blank items (the minimum for a real ordering) with a matching
      // correctOrder — the authoring order is the correct order.
      const items = [buildDefaultRankItem(), buildDefaultRankItem()];
      return {
        contentType: "RANKING",
        items,
        correctOrder: items.map((item) => item.id).filter((id): id is string => id != null),
        scoreMode: "EXACT",
      };
    }
    case "SCALES":
      // Default to a 1–5 Likert agreement scale with one blank statement. An
      // empty `correctValues` marks the slide unscored (opinion / pulse) — the
      // author opts into scoring per statement in the editor.
      return {
        contentType: "SCALES",
        min: 1,
        max: 5,
        step: 1,
        leftLabel: "Disagree",
        rightLabel: "Agree",
        items: [buildDefaultScaleItem()],
        correctValues: {},
        tolerance: 0,
      };
    case "GRID":
      // Seeded 2×2 with two blank items (mirrors RANKING's two-item seed) so
      // the editor opens on a workable matrix instead of an empty shell.
      return {
        contentType: "GRID",
        rowLabels: ["", ""],
        colLabels: ["", ""],
        items: [buildDefaultGridItem(), buildDefaultGridItem()],
        correctCells: {},
        scoreMode: "EXACT",
      };
    case "AXIS":
      // Empty endpoint labels fall back to placeholders in the editor; two
      // seeded items mirror GRID's seed. An empty `correctPositions` marks the
      // slide unscored (opinion plane) — the author opts into scoring by
      // placing targets. Grading is INSIDE_RADIUS only, so `scoreMode` has no
      // authoring knob and is fixed here.
      return {
        contentType: "AXIS",
        xLowLabel: "",
        xHighLabel: "",
        yLowLabel: "",
        yHighLabel: "",
        items: [buildDefaultAxisItem(), buildDefaultAxisItem()],
        correctPositions: {},
        tolerance: 0.1,
        scoreMode: "INSIDE_RADIUS",
      };
    case "MATCHING":
      return {
        contentType: "MATCHING",
        left: [],
        right: [],
        correctPairs: {},
        scoreMode: "EXACT",
      };
    case "ALLOCATION":
      return {
        contentType: "ALLOCATION",
        options: [],
        totalPointsToAllocate: 100,
        tolerancePerOption: 0,
      };
    case "DRAWING":
      return {
        contentType: "DRAWING",
        canvasWidth: 800,
        canvasHeight: 600,
        tools: ["PEN", "ERASER"],
      };
    case "PLACE_ON_IMAGE":
      // `image` is a required AppImage; `external` is its only required field,
      // so this is the minimal valid placeholder.
      return {
        contentType: "PLACE_ON_IMAGE",
        image: { external: true },
        correctTargets: [],
        scoreMode: "INSIDE_RADIUS",
      };
    case "FOLLOW_UP":
      // Follow-ups are never created through the picker — only the dedicated
      // add-follow-up endpoint mints one, with the mode chosen for the parent.
      // This arm exists solely to keep the switch exhaustive.
      return {
        contentType: "FOLLOW_UP",
        mode: "PREDICT_POPULAR",
      };
    default:
      return assertNever(slideType);
  }
};

/**
 * Build a blank MCQ option with a fresh client-minted id. `buildDefaultContent`
 * seeds MCQ slides with an empty option list; this is the per-option factory the
 * MCQ editor uses when the author adds a choice. `optionType` is required, so it
 * defaults to a plain text option the author then fills in.
 */
export const buildDefaultMcqOption = (): McqOption => ({
  id: nanoid(8),
  optionType: "TEXT",
  text: "Untitled Option",
});

/**
 * Build a blank ranking item with a fresh client-minted id. Ranking items track
 * their position by id (via the content's `correctOrder`), so a stable id at
 * creation time is what lets the author reorder and the backend resolve the
 * correct order. The label is empty for the author to fill in.
 */
export const buildDefaultRankItem = (): RankItem => ({
  id: nanoid(8),
  label: "",
});

/**
 * Build a blank grid item with a fresh client-minted id. GRID slides key each
 * item's target cell by id (via the content's `correctCells`), so a stable id
 * at creation time is what lets the author assign targets and the backend grade
 * placements. The label is empty for the author to fill in.
 */
export const buildDefaultGridItem = (): GridItem => ({
  id: nanoid(8),
  label: "",
});

/**
 * Build a blank axis item with a fresh client-minted id. AXIS slides key each
 * item's target point by id (via the content's `correctPositions`), so a stable
 * id at creation time is what lets the author place targets and the backend
 * grade placements. The label is empty for the author to fill in.
 */
export const buildDefaultAxisItem = (): AxisItem => ({
  id: nanoid(8),
  label: "",
});

/**
 * Build a blank Scales statement with a fresh client-minted id. SCALES slides
 * key each statement's rating (and, when scored, its target value) by id, so a
 * stable id at creation time is what lets the author edit and the backend
 * resolve per-statement answers. The label is empty for the author to fill in.
 */
export const buildDefaultScaleItem = (): ScaleItem => ({
  id: nanoid(8),
  label: "",
});
