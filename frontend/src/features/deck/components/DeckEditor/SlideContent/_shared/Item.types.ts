// oxlint-disable typescript/consistent-type-definitions
import { AxisAxis, AxisEnd } from "@/features/deck/hooks/useAxisEditor";
import { GridAxis } from "@/features/deck/hooks/useGridEditor";
import {
  McqDataVisualization,
  PromptPlacement,
  SlideType,
  Tool,
} from "@/features/deck/store/deckEnums.gen";
import { AppImage } from "@/features/liveSession/store/liveSessionApi.gen";
import { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { McqOption } from "@/shared/types/Elements.types";
import { DragEndEvent } from "@dnd-kit/dom";
import { Ref } from "react";
// interface EditableItemActions {
//   menuOpen: boolean;
//   canRemove: boolean;
//   onSelect: () => void;
//   //toggle target effectively is toggleCorrect for mcqOption or set/clear target for placement
//   toggleTarget: () => void;
//   onMenuOpenChange: (open: boolean) => void;
//   onScheduleLabel: (label: string) => void;
//   onFlush: () => void;
//   onSetColor: (color: string) => void;
//   onSetImage: (image: AppImage) => void;
//   onRemove: () => void;
//   openPicker: OpenGalleryPicker;
//   primaryAction?: OptionMenuPrimaryAction;
// }

type Point = { x: number; y: number };
type Cell = { row: number; column: number };
export type ItemId = string;

interface ItemContent<TImage> {
  id: string;
  label: string;
  color: string;
  image?: TImage;
}

interface ResolvedImage {
  src: string;
  alt: string;
}

export type EditableItemContent = ItemContent<AppImage>;
export type ChartItemContent = ItemContent<ResolvedImage>;

export const toEditableItemContent = (option: McqOption): EditableItemContent => ({
  id: option.id,
  label: option.text ?? "",
  color: option.color ?? "#ffffff",
  image: option.image,
});

interface BaseItemActions {
  onSelect: () => void;
  onSetColor: (color: string) => void;
  onSetImage: (image: AppImage) => void;
  onRemove: () => void;
  onFlush: () => void;
  openPicker: OpenGalleryPicker;
  setMenuIsOpen: (open: boolean) => void;
  // Checks if an item is scorable, each question will implement this differently
  toggleScorability: (itemId: ItemId) => boolean;
}
//TODO: need to consolidate the actions/move them to actions but it has to be typed
interface ScalesItemDetail {
  correctValue?: number;
  min: number;
  max: number;
  tolerance: number;
  lowLabel: string;
  highLabel: string;
}
interface CorrectAnswerActions<V> {
  scheduleCorrect: (id: ItemId, value: V) => void;
  commitCorrect: (id: ItemId, value: V) => void;
  clearCorrect: (id: ItemId) => void;
}
interface ScalesItemActions extends BaseItemActions {
  onCommit: (value: number) => void;
  onScheduleAnswer: (value: number) => void;
  onClear: () => void;
}

// works for grid, place on image, axis.
interface PlacementItemDetail {
  target?: {
    x: number;
    y: number;
  };
  tolerance: number;
}

interface PlacementItemActions extends BaseItemActions {
  select: () => void;
  onSetTarget: () => void;
  onClearTarget: () => void;
}

interface McqItemDetail {
  isCorrect: boolean;
}
interface McqItemActions extends BaseItemActions {
  toggleCorrect: () => void;
}

// oxlint-disable-next-line typescript/no-empty-object-type
interface RankingItemDetail {
  doesImageSlotConfigMatchSlotId: string;
}
// oxlint-disable-next-line typescript/no-empty-object-type
interface RankingItemActions extends BaseItemActions {
  matchId: string;
}
// oxlint-disable-next-line typescript/no-empty-object-type
interface MatchingItemActions extends BaseItemActions {
  matchId: string;
}
interface MatchingItemDetail {
  matchId?: string;
}

interface AllocationItemDetail {
  correctValue?: number;
  value: number;
  totalPool: number;
}

interface AllocationItemActions extends BaseItemActions {
  onCommit: (value: number) => void;
  onScheduleAnswer: (value: number) => void;
  onClear: () => void;
}
interface SortableItemState {
  rootRef: Ref<HTMLDivElement>;
  handleRef?: (element: HTMLDivElement | null) => void;
  isDragging: boolean;
}

interface UIState {
  isScorable: boolean;
  canRemove: boolean;
  isHighlighted?: boolean;
  isSelected?: boolean;
  menuIsOpen: boolean;
  displayAsPercentage?: boolean;
  continuousAnimation?: boolean;
  animateOnMount?: boolean;
}

interface EditableItemByKind extends Record<
  SlideType,
  { detail: object; actions: BaseItemActions }
> {
  MCQ: { detail: McqItemDetail; actions: McqItemActions };
  SCALES: { detail: ScalesItemDetail; actions: ScalesItemActions };
  PLACE_ON_IMAGE: { detail: PlacementItemDetail; actions: PlacementItemActions };
  AXIS: { detail: PlacementItemDetail; actions: PlacementItemActions };
  GRID: { detail: PlacementItemDetail; actions: PlacementItemActions };
  RANKING: { detail: RankingItemDetail; actions: RankingItemActions };
  MATCHING: { detail: MatchingItemDetail; actions: MatchingItemActions };
  ALLOCATION: { detail: AllocationItemDetail; actions: AllocationItemActions };
}

interface EditableItemBase {
  sourceIndex: number;
  item: EditableItemContent;
  state: UIState;
}

export type EditableItem<TKind extends SlideType = SlideType> = TKind extends SlideType
  ? EditableItemBase & {
      kind: TKind;
      detail: EditableItemByKind[TKind]["detail"];
      actions: EditableItemByKind[TKind]["actions"];
    }
  : never;

export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type SortableEditableItem<TKind extends SlideType = SlideType> = TKind extends SlideType
  ? EditableItem<TKind> & { sortable: SortableItemState }
  : never;

export interface QuestionBaseState {
  canAddItem: boolean;
  canRemoveItem: boolean;
  displayResultsAsPercentage: boolean;
}

interface WithItems {
  items: EditableItemContent[];
}
interface Tolerant {
  tolerance: number;
}
interface LabeledRange {
  min: number;
  max: number;
  lowLabel: string;
  highLabel: string;
}
type RowLabel = string;
type ColLabel = string;
export interface QuestionViewBase {
  id: string;
  prompt: string;
}

export interface QuestionActionsBase {
  scheduleQuestionPrompt: (html: string) => void;
  flush: () => void;
  getIsScorable: (itemId: ItemId) => boolean;
}
export interface AllocationSpecificActions {
  scheduleTotalPoints: (value: number) => void;
}

interface AxisSpecificActions {
  scheduleAxisLabel: (axis: AxisAxis, end: AxisEnd, text: string) => void;
}

interface WithSetTolerance {
  scheduleTolerance: (value: number) => void;
}

interface WithHandleItem {
  //TODO: This should be moved out of here use reorderItems(from: number, to: number) instead
  handleItemDragEnd: (event: DragEndEvent) => void;
  removeItem: (optionId: string) => void;
  addItem: () => void;
  scheduleItemText: (optionId: string, text: string) => void;
  setItemColor: (optionId: string, color: string) => void;
  setItemImage: (optionId: string, image: AppImage) => void;
}

interface GridSpecificActions {
  addGridLabel: (axis: GridAxis) => void;
  removeGridLabel: (axis: GridAxis, index: number) => void;
  scheduleGridLabel: (axis: GridAxis, index: number, label: string) => void;
}

interface ScaleSpecificActions {
  scheduleMin: (value: number) => void;
  scheduleMax: (value: number) => void;
  scheduleLeftLabel: (value: string) => void;
  scheduleRightLabel: (value: string) => void;
}
interface CorrectAnswerActions<V> {
  scheduleCorrect: (id: ItemId, value: V) => void;
  commitCorrect: (id: ItemId, value: V) => void;
  clearCorrect: (id: ItemId) => void;
}
interface WithSetVisualization {
  setDataVisualization: (viz: McqDataVisualization) => void;
}

//schedule* = debounced, commit* = flush that field, set* = immediate, clear* = remove
//TODO: we should narrow down slide type so it only includes scorable questions
interface QuestionSpec extends Record<
  SlideType,
  { config: object; correct: unknown; actions: object }
> {
  ALLOCATION: {
    config: WithItems & Tolerant & { pool: number };
    correct: Record<ItemId, number>;
    actions: WithHandleItem &
      WithSetTolerance &
      AllocationSpecificActions &
      CorrectAnswerActions<number>;
  };
  SCALES: {
    config: WithItems & Tolerant & LabeledRange;
    correct: Record<ItemId, number>;
    actions: WithHandleItem &
      WithSetTolerance &
      ScaleSpecificActions &
      CorrectAnswerActions<number>;
  };
  AXIS: {
    config: WithItems & Tolerant & { x: LabeledRange; y: LabeledRange };
    correct: Record<ItemId, Point>;
    actions: WithHandleItem & WithSetTolerance & AxisSpecificActions & CorrectAnswerActions<Point>;
  };
  PLACE_ON_IMAGE: {
    config: WithItems & Tolerant & { image: AppImage };
    correct: Record<ItemId, Cell>;
    actions: WithHandleItem & WithSetTolerance & CorrectAnswerActions<Point>;
  };
  GRID: {
    config: WithItems & { rows: RowLabel[]; cols: ColLabel[] };
    correct: Record<ItemId, Cell>;
    actions: WithHandleItem & GridSpecificActions;
  };
  MATCHING: { config: WithItems; correct: Record<ItemId, ItemId>; actions: WithHandleItem };
  MCQ: {
    config: WithItems & { dataVisualization: McqDataVisualization };
    correct: ItemId[];
    actions: WithHandleItem &
      WithSetVisualization & {
        toggleCorrect: (itemId: ItemId | undefined) => void;
      };
  };
  RANKING: { config: WithItems; correct: ItemId[]; actions: WithHandleItem };
  DRAWING: {
    config: {
      imagePrompt?: AppImage;
      promptPlacement: PromptPlacement;
      palette: string[];
      tools: Tool[];
    };
    correct: unknown;
    actions: {};
  };
}

export type QuestionDetailsByKind = {
  [K in SlideType]: QuestionSpec[K]["config"] & { correct: QuestionSpec[K]["correct"] };
};

/** ------------------ Question Types----------------- ***/

export type QuestionActionsByKind = {
  [K in SlideType]: QuestionActionsBase & QuestionSpec[K]["actions"];
};
export type QuestionActions<QKind extends SlideType = SlideType> = QKind extends SlideType
  ? QuestionActionsBase & QuestionActionsByKind[QKind]
  : never;
