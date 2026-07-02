// Discriminated unions mirroring the Java sealed hierarchies.
//
// The OpenAPI codegen produces individual record types per impl but no union;
// these unions are hand-authored so TypeScript can exhaustively switch on the
// `kind` field. Wire format is `kind: "<ClassName>"` (Jackson's default), so
// the literal types here must match those exact strings.

//TODO: this needs to be completely re-worked when we finished updates on the backend, this should be unecessary
import {
  DrawingAnswer,
  McqAnswer,
  RankingAnswer,
  ScalesAnswer,
} from "@/features/liveSession/store/liveSessionApi.gen";
import type { McqOption } from "@deck/store/deckApi.gen";

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

export type AnswerPayload =
  | McqAnswer
  | TextAnswer
  | NumberAnswer
  | RankingAnswer
  | ScalesAnswer
  | GridAnswer
  | PlaceOnImageAnswer
  | AllocationAnswer
  | MatchingAnswer
  | DrawingAnswer
  | TimeoutAnswer;

export type { DrawingAnswer, McqAnswer, McqOption, RankingAnswer, ScalesAnswer };
