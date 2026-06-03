// Discriminated unions mirroring the Java sealed hierarchies.
//
// The OpenAPI codegen produces individual record types per impl but no union;
// these unions are hand-authored so TypeScript can exhaustively switch on the
// `kind` field. Wire format is `kind: "<ClassName>"` (Jackson's default), so
// the literal types here must match those exact strings.

//TODO: this needs to be completely re-worked when we finished updates on the backend, this should be unecessary
import type {
  AllocationQuestion,
  DrawingAnswer,
  DrawingQuestion,
  GridQuestion,
  MatchingPair,
  MatchingQuestion,
  McqAnswer,
  McqOption,
  McqQuestion,
  NumberQuestion,
  PlaceOnImageQuestion,
  QAndAQuestion,
  RankingAnswer,
  RankingItem,
  RankingQuestion,
  ScalesAnswer,
  ScalesQuestion,
  Slide,
  Stroke,
  TextQuestion,
  WordCloudAnswer,
  WordCloudQuestion,
} from "@store/AmbiApi";

// Codegen names them `<Class>Base` for the abstract parent so reproduce the answer leaves.
export interface TextAnswer {
  kind: "TextAnswer";
  text?: string;
}
export interface NumberAnswer {
  kind: "NumberAnswer";
  value?: number;
}
export interface GridAnswer {
  kind: "GridAnswer";
  selectedCellIndexes?: number[];
}
export interface PlaceOnImageAnswer {
  kind: "PlaceOnImageAnswer";
  x?: number;
  y?: number;
}
export interface TimeoutAnswer {
  kind: "TimeoutAnswer";
}
export interface AllocationAnswer {
  kind: "AllocationAnswer";
  optionIdToPoints?: Record<string, number>;
}
export interface MatchingAnswer {
  kind: "MatchingAnswer";
  leftIdToRightId?: Record<string, string>;
}

export type DeckElement =
  | Slide
  | McqQuestion
  | TextQuestion
  | NumberQuestion
  | RankingQuestion
  | ScalesQuestion
  | QAndAQuestion
  | GridQuestion
  | PlaceOnImageQuestion
  | WordCloudQuestion
  | AllocationQuestion
  | MatchingQuestion
  | DrawingQuestion;

export type AnswerPayload =
  | McqAnswer
  | TextAnswer
  | NumberAnswer
  | RankingAnswer
  | ScalesAnswer
  | GridAnswer
  | PlaceOnImageAnswer
  | WordCloudAnswer
  | AllocationAnswer
  | MatchingAnswer
  | DrawingAnswer
  | TimeoutAnswer;

export type {
  McqOption,
  RankingItem,
  MatchingPair,
  Slide,
  McqQuestion,
  TextQuestion,
  NumberQuestion,
  RankingQuestion,
  ScalesQuestion,
  QAndAQuestion,
  GridQuestion,
  PlaceOnImageQuestion,
  WordCloudQuestion,
  AllocationQuestion,
  MatchingQuestion,
  DrawingQuestion,
  Stroke,
  McqAnswer,
  RankingAnswer,
  ScalesAnswer,
  WordCloudAnswer,
  DrawingAnswer,
};

/** True when an element is a non-interactive Slide. */
export const isSlide = (e: DeckElement): e is Slide => e.kind === "Slide";

/** True when an element is one of the scored question kinds. */
export const isQuestion = (e: DeckElement): boolean => e.kind !== "Slide";
