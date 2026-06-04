/**
 * Default slide-content factory.
 *
 * `SlideRequest.content` is required and discriminated by `contentType`, which
 * is the slide's only kind marker (there is no separate `slideType` field), so a
 * brand-new slide must ship a content object of the desired kind. This module is
 * the single place that mints minimal placeholder
 * content for each slide kind: every required field of the matching content
 * record gets a sensible default, while optional fields (`explanation`,
 * `maxLength`, `imagePrompt`, `caption`, …) are left off for the type-specific
 * editor to fill in once the slide exists.
 */
import type { McqOption, SlideContent } from "@store/AmbiApi";

type SlideType = NonNullable<SlideContent["contentType"]>;

/** Default point value for a newly created scorable slide. */
const DEFAULT_POINTS = 10;

/** The fields every scorable content type shares. */
const scorable = () =>
  ({
    pointValue: DEFAULT_POINTS,
    difficulty: "MEDIUM",
    allowAnonymous: false,
  }) as const;

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
      return { contentType: "TITLE" };
    case "MEDIA":
      return {
        contentType: "MEDIA",
        autoplay: false,
        loop: false,
        muted: false,
        allowAnonymous: false,
      };
    case "Q_AND_A":
      return { contentType: "Q_AND_A", allowAnonymous: false, moderated: false };
    case "MCQ":
      return {
        contentType: "MCQ",
        ...scorable(),
        options: [],
        correctOptionIds: [],
        shuffle: false,
        maxSelections: 1,
      };
    case "TEXT":
      return {
        contentType: "TEXT",
        ...scorable(),
        acceptedAnswers: [],
        matchMode: "EXACT",
        caseSensitive: false,
        trimWhitespace: true,
      };
    case "NUMBER":
      return {
        contentType: "NUMBER",
        ...scorable(),
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
        ...scorable(),
        items: [],
        correctOrder: [],
        scoreMode: "EXACT",
      };
    case "SCALES":
      return {
        contentType: "SCALES",
        ...scorable(),
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
        ...scorable(),
        rowLabels: [],
        colLabels: [],
        items: [],
        correctCells: {},
        scoreMode: "EXACT",
      };
    case "MATCHING":
      return {
        contentType: "MATCHING",
        ...scorable(),
        left: [],
        right: [],
        correctPairs: {},
        scoreMode: "EXACT",
      };
    case "ALLOCATION":
      return {
        contentType: "ALLOCATION",
        ...scorable(),
        options: [],
        totalPointsToAllocate: 100,
        tolerancePerOption: 0,
      };
    case "DRAWING":
      return {
        contentType: "DRAWING",
        ...scorable(),
        canvasWidth: 800,
        canvasHeight: 600,
        tools: ["PEN", "ERASER"],
      };
    case "PLACE_ON_IMAGE":
      // `image` is a required AppImage; `external` is its only required field,
      // so this is the minimal valid placeholder.
      return {
        contentType: "PLACE_ON_IMAGE",
        ...scorable(),
        image: { external: true },
        correctTargets: [],
        scoreMode: "INSIDE_RADIUS",
      };
    case "FOLLOW_UP":
      // A real follow-up slide also needs `parentId` set to its parent slide;
      // the picker never creates FOLLOW_UP standalone, so a blank submission
      // option is enough for the placeholder.
      return { contentType: "FOLLOW_UP", ...scorable(), submissionOption: {} };
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
  id: { value: crypto.randomUUID() },
  optionType: "TEXT",
  text: "",
});
