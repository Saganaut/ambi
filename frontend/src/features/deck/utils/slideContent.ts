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
import { paletteColorAt } from "@/shared/components/Charts/optionPalette";
import type { ColorString } from "@components/Forms/Input/ColorPicker/ColorPicker";
import {
  AxisItem,
  GridItem,
  MatchItem,
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

/**
 * Starting stroke colors for a new Drawing slide — a compact, high-contrast
 * set the author can freely edit in the palette editor. Typed as concrete
 * {@link ColorString}s so the palette editor can offer them as DS color-picker
 * swatches; palette entries must stay concrete (no `var(--role-*)` refs) —
 * they feed the player canvas's `strokeStyle` and the wire.
 */
export const DEFAULT_DRAWING_PALETTE: readonly ColorString[] = [
  "#1A1A1A",
  "#E5484D",
  "#FFB224",
  "#30A46C",
  "#3E63DD",
  "#8E4EC6",
];

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
      const items = [
        buildDefaultRankItem(paletteColorAt(0)),
        buildDefaultRankItem(paletteColorAt(1)),
      ];
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
        leftLabel: "Disagree",
        rightLabel: "Agree",
        items: [buildDefaultScaleItem()],
        correctValues: {},
        // 10 % of the default 1–5 span — a positive tolerance a scored slide
        // needs on a continuum (an exact match is measure-zero).
        tolerance: 0.4,
      };
    case "GRID":
      // Seeded 2×2 with two blank items (mirrors RANKING's two-item seed) so
      // the editor opens on a workable matrix instead of an empty shell.
      return {
        contentType: "GRID",
        rowLabels: ["", ""],
        colLabels: ["", ""],
        items: [buildDefaultGridItem(paletteColorAt(0)), buildDefaultGridItem(paletteColorAt(1))],
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
        items: [buildDefaultAxisItem(paletteColorAt(0)), buildDefaultAxisItem(paletteColorAt(1))],
        correctPositions: {},
        tolerance: 0.1,
        scoreMode: "INSIDE_RADIUS",
      };
    case "MATCHING":
      // Seed two blank pairs (the editor's minimum for a real matching round);
      // left[i] ↔ right[i] is the authored pairing. An empty `correctPairs`
      // marks the slide unscored (collect-only) — the author opts into scoring
      // with the editor's Scorable toggle, which mirrors the authored pairing
      // into the answer key.
      return {
        contentType: "MATCHING",
        left: [buildDefaultMatchItem(), buildDefaultMatchItem()],
        right: [buildDefaultMatchItem(), buildDefaultMatchItem()],
        correctPairs: {},
        scoreMode: "EXACT",
      };
    case "ALLOCATION":
      // Seed two blank options (the minimum for a real split, mirroring MCQ).
      // `correctAllocations` is left off so a new slide starts unscored
      // (collect-only) — the author opts into scoring per option in the editor.
      return {
        contentType: "ALLOCATION",
        options: [buildDefaultAllocationOption(), buildDefaultAllocationOption()],
        totalPointsToAllocate: 100,
        tolerancePerOption: 0,
      };
    case "DRAWING":
      // The canvas is a fixed 1:1 square (logical resolution is a client
      // constant), so geometry is not part of the content. Palette is the
      // author-editable stroke-color offering shown to players.
      return {
        contentType: "DRAWING",
        promptPlacement: "ALONGSIDE",
        palette: [...DEFAULT_DRAWING_PALETTE],
        tools: ["PEN", "ERASER", "COLOR_PALETTE"],
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
 * Build a blank Allocation option with a fresh client-minted id. Allocation
 * reuses the `McqOption` record, but unlike MCQ's factory the label starts
 * empty: the editor's option rows follow the item-row pattern (empty label +
 * "Option N" placeholder) shared with Grid/Axis/Matching. ALLOCATION content
 * keys its answer map by option id (`correctAllocations`), so a stable id at
 * creation time is what lets the author set answers and the backend grade
 * splits.
 */
export const buildDefaultAllocationOption = (): McqOption => ({
  id: nanoid(8),
  optionType: "TEXT",
  text: "",
});

/**
 * Build a blank ranking item with a fresh client-minted id. Ranking items track
 * their position by id (via the content's `correctOrder`), so a stable id at
 * creation time is what lets the author reorder and the backend resolve the
 * correct order. The label is empty for the author to fill in.
 *
 * `color` is stamped here rather than derived from the item's position, so a
 * reorder renumbers the list without repainting it — pass `nextPaletteColor`
 * (`shared/components/Charts/optionPalette.ts`) of the colors already in use.
 */
export const buildDefaultRankItem = (color: string): RankItem => ({
  id: nanoid(8),
  label: "",
  color,
});

/**
 * Build a blank grid item with a fresh client-minted id. GRID slides key each
 * item's target cell by id (via the content's `correctCells`), so a stable id
 * at creation time is what lets the author assign targets and the backend grade
 * placements. The label is empty for the author to fill in; `color` is stamped
 * at creation for the reason {@link buildDefaultRankItem} gives.
 */
export const buildDefaultGridItem = (color: string): GridItem => ({
  id: nanoid(8),
  label: "",
  color,
});

/**
 * Build a blank axis item with a fresh client-minted id. AXIS slides key each
 * item's target point by id (via the content's `correctPositions`), so a stable
 * id at creation time is what lets the author place targets and the backend
 * grade placements. The label is empty for the author to fill in; `color` is
 * stamped at creation for the reason {@link buildDefaultRankItem} gives.
 */
export const buildDefaultAxisItem = (color: string): AxisItem => ({
  id: nanoid(8),
  label: "",
  color,
});

/**
 * Build a blank matching card with a fresh client-minted id. MATCHING slides
 * key the answer map by card id (`correctPairs`: left id → right id), so a
 * stable id at creation time is what lets the Scorable toggle link the
 * authored pairs and the backend grade submissions. The label is empty for
 * the author to fill in (or swap for an image).
 */
export const buildDefaultMatchItem = (): MatchItem => ({
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
