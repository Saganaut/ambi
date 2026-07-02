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
import { McqOption, SlideContent } from "../store/deckApi.gen";
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
      return {
        contentType: "NUMBER",
        answer: 0,
        scoreMode: "EXACT",
        tolerance: 0,
        unit: "",
        min: 0,
        max: 100,
      };
    case "RANKING":
      return {
        contentType: "RANKING",
        items: [],
        correctOrder: [],
        scoreMode: "EXACT",
      };
    case "SCALES":
      return {
        contentType: "SCALES",
        min: 0,
        max: 10,
        step: 1,
        leftLabel: "Low",
        rightLabel: "High",
        items: [],
        correctValues: {},
        tolerance: 0.5,
      };
    case "GRID":
      return {
        contentType: "GRID",
        rowLabels: [],
        colLabels: [],
        items: [],
        correctCells: {},
        scoreMode: "EXACT",
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
