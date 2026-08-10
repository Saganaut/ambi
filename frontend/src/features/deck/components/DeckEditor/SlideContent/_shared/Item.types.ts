// oxlint-disable typescript/consistent-type-definitions
import { AxisAxis, AxisEnd } from "@/features/deck/hooks/useAxisEditor";
import { CellId, GridAxis } from "@/features/deck/hooks/useGridEditor";
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
import { Dispatch, Ref, SetStateAction } from "react";

export type Orientation = "horizontal" | "vertical";
export interface SlideContentProps {
  deckId: string;
  slideId: string;
}

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
export type Point = { x: number; y: number };
export type ItemId = string;
type ContinuousAxis = { kind: "continuous"; min: number; max: number; labels: [string, string] };
type DiscreteAxis = { kind: "discrete"; labels: string[] };
type Axis = ContinuousAxis | DiscreteAxis;
// GRID: rows = y, cols = x
type AxisKey = "x" | "y";
type Axes = Partial<Record<AxisKey, Axis>>;

interface AxisActions {
  scheduleAxisLabel: (axis: AxisKey, index: number, text: string) => void;
  scheduleAxisRange?: (axis: AxisKey, bound: "min" | "max", value: number) => void; // continuous
  addAxisLabel?: (axis: AxisKey) => void; // discrete only
  removeAxisLabel?: (axis: AxisKey, index: number) => void;
}

interface WithTolerance {
  tolerance: number;
}
export type EditableItemContent = ItemContent<AppImage>;
export type ChartItemContent = ItemContent<ResolvedImage>;

export const toEditableItemContent = (option: McqOption): EditableItemContent => ({
  id: option.id,
  label: option.text ?? "",
  color: option.color ?? "#ffffff",
  image: option.image,
});

/** --------------- ITEM DETAIL-------------------**/
//TODO: need to consolidate the actions/move them to actions but it has to be typed
interface ScalesItemDetail {
  correctValue?: number;
  min: number;
  max: number;
  lowLabel: string;
  highLabel: string;
}

// works for place on image, axis.
interface PlacementItemDetail {
  target?: {
    x: number;
    y: number;
  };
}

/** Grid targets a matrix cell rather than a free point, so its target is a cell id. */
interface GridItemDetail {
  target?: CellId;
}

/** Order is the whole answer key, so a ranking row carries no per-item detail. */
// oxlint-disable-next-line typescript/no-empty-object-type
interface RankingItemDetail {}

interface MatchingItemDetail {
  matchId?: string;
}

interface AllocationItemDetail {
  correctValue?: number;
  totalPool: number;
}

/** --------------- ITEM ACTIONS -------------------**/
/** Item type is what is passed to the ItemRow or ItemCard in the editor **/
interface BaseItemActions {
  //Should not carry any ItemId as these are already passed in
  selectItem: () => void;
  setColorForItem: (color: string) => void;
  setImageForItem: (image: AppImage) => void;
  removeItem: () => void;
  flush: () => void;
  openImagePicker: OpenGalleryPicker;
  setMenuIsOpenForItem: (open: boolean) => void;
  scheduleItemLabel: (label: string) => void;
  // Checks if an item is scorable, each question will implement this differently
  // For placement this should setTarget or clearTarget
  toggleScorabilityForItem: () => void;
}

interface WithCorrectItemActions<V extends Point | string | number> {
  scheduleCorrectAnswer: (value: V) => void;
  commitCorrectAnswer: (value: V) => void;
  clearCorrectAnswer: () => void;
}

interface WithSortableItemState<E extends HTMLElement> {
  rootRef: Ref<E>;
  handleRef?: (element: E | null) => void;
  isDragging: boolean;
}

interface EditableItemState {
  isScorable: boolean;
  canRemove: boolean;
  isHighlighted?: boolean;
  isSelected?: boolean;
  menuIsOpen: boolean;
  displayAsPercentage?: boolean;
  continuousAnimation?: boolean;
  animateOnMount?: boolean;
}

interface McqItemDetail {
  //These are necessary for mocking the chart distrubitons in preview
  mockDistributionHighestValue: number;
  mockDistributionDenominator: number;
  mockDistributionValue: number;
  itemCount: number;
}

interface EditableItemByKind extends Record<
  SlideType,
  { detail?: object; actions: BaseItemActions }
> {
  MCQ: { detail: McqItemDetail; actions: BaseItemActions };
  SCALES: {
    detail: ScalesItemDetail & WithTolerance;
    actions: BaseItemActions & WithCorrectItemActions<number>;
  };
  PLACE_ON_IMAGE: {
    detail: PlacementItemDetail & WithTolerance;
    actions: BaseItemActions & WithCorrectItemActions<Point>;
  };
  AXIS: {
    detail: PlacementItemDetail & WithTolerance;
    actions: BaseItemActions & WithCorrectItemActions<Point>;
  };
  GRID: { detail: GridItemDetail; actions: BaseItemActions & WithCorrectItemActions<CellId> };
  RANKING: { detail: RankingItemDetail; actions: BaseItemActions };
  MATCHING: { detail: MatchingItemDetail; actions: BaseItemActions };
  ALLOCATION: {
    detail: AllocationItemDetail & WithTolerance;
    actions: BaseItemActions & WithCorrectItemActions<number>;
  };
}

interface EditableItemBase {
  sourceIndex: number;
  item: EditableItemContent;
  state: EditableItemState;
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
  ? EditableItem<TKind> & { sortable: WithSortableItemState<HTMLElement> }
  : never;

export interface QuestionBaseState {
  canAddItem: boolean;
  canRemoveItem: boolean;
  displayResultsAsPercentage: boolean;
}

interface QuestionStateByKind extends Record<SlideType, object> {
  GRID: GridLabelCapability;
}

export type QuestionState<QKind extends SlideType = SlideType> = QKind extends SlideType
  ? QuestionBaseState & QuestionStateByKind[QKind]
  : never;

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
  toggleScorability: (itemId: ItemId) => void;
}
export interface AllocationSpecificActions {
  scheduleTotalPoints: (value: number) => void;
}

interface AxisSpecificActions {
  scheduleAxisLabel: (axis: AxisAxis, end: AxisEnd, text: string) => void;
}

interface WithScheduleTolerance {
  scheduleTolerance: (value: number) => void;
}

interface WithHandleItem {
  //TODO: This should be moved out of here use reorderItems(from: number, to: number) instead
  handleItemDragEnd: (event: DragEndEvent) => void;
  removeItem: (optionId: string) => void;
  addItem: () => void;
  scheduleItemLabel: (optionId: string, text: string) => void;
  setItemColor: (optionId: string, color: string) => void;
  setItemImage: (optionId: string, image: AppImage) => void;
}

interface PlaceOnImageSpecificActions {
  /** Swap the backing image players pin on. */
  setImage: (image: AppImage) => void;
  /** Append an item already targeted at `point`, in the write that appends it. */
  addItemAtPoint: (point: Point) => void;
}

interface GridSpecificActions {
  addGridLabel: (axis: GridAxis) => void;
  removeGridLabel: (axis: GridAxis, index: number) => void;
  scheduleGridLabel: (axis: GridAxis, index: number, label: string) => void;
  /** Append an item already targeted at `cell`, in the write that appends it. */
  addItemAtCell: (cell: CellId) => void;
}

/** Whether the matrix can still grow or shrink along an axis. */
export interface GridLabelCapability {
  canAddGridLabel: (axis: GridAxis) => boolean;
  canRemoveGridLabel: (axis: GridAxis) => boolean;
}

interface ScaleSpecificActions {
  scheduleMin: (value: number) => void;
  scheduleMax: (value: number) => void;
  scheduleLeftLabel: (value: string) => void;
  scheduleRightLabel: (value: string) => void;
}
interface CorrectAnswerActions<V> {
  scheduleCorrectAnswer: (id: ItemId, value: V) => void;
  commitCorrectAnswer: (id: ItemId, value: V) => void;
  clearCorrectAnswer: (id: ItemId) => void;
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
      WithScheduleTolerance &
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
    correct: Record<ItemId, Point>;
    actions: WithHandleItem &
      WithSetTolerance &
      PlaceOnImageSpecificActions &
      CorrectAnswerActions<Point>;
  };
  GRID: {
    config: WithItems & { rows: RowLabel[]; cols: ColLabel[] };
    correct: Record<ItemId, CellId>;
    actions: WithHandleItem & GridSpecificActions & CorrectAnswerActions<CellId>;
  };
  MATCHING: { config: WithItems; correct: Record<ItemId, ItemId>; actions: WithHandleItem };
  MCQ: {
    config: WithItems & { dataVisualization: McqDataVisualization };
    correct: ItemId[];
    actions: WithHandleItem & WithSetVisualization;
    // & {
    //   toggleCorrect: (itemId: ItemId | undefined) => void;
    // };
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
    actions: object;
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

/** -----------------  Slide Draft ------------ **/
export interface SlideDraftBase {
  prompt: string;
  setPrompt: Dispatch<SetStateAction<string>>;
  openMenuId: string | null;
  setOpenMenuId: Dispatch<SetStateAction<string | null>>;
  syncedFromId: string | null;
  setSyncedFromId: Dispatch<SetStateAction<string | null>>;
}

interface WithSetSelectedItem<V> {
  selectedItemId: V | null;
  setSelectedItemId: Dispatch<SetStateAction<V | null>>;
}

interface WithSetTotalPoints {
  setTotalPoints: Dispatch<SetStateAction<number>>;
  totalPoints: number;
}

interface WithSetTolerance {
  setTolerance: Dispatch<SetStateAction<number>>;
  tolerance: number;
}

/** Local mirrors of the scale's endpoints and their captions. */
interface WithSetLabeledRange {
  min: number;
  setMin: Dispatch<SetStateAction<number>>;
  max: number;
  setMax: Dispatch<SetStateAction<number>>;
  leftLabel: string;
  setLeftLabel: Dispatch<SetStateAction<string>>;
  rightLabel: string;
  setRightLabel: Dispatch<SetStateAction<string>>;
}

interface SlideDraftByKind extends Record<SlideType, object> {
  MCQ: {};
  ALLOCATION: WithSetTolerance & WithSetTotalPoints;
  AXIS: WithSetTolerance & WithSetSelectedItem<ItemId>;
  GRID: WithSetSelectedItem<ItemId>;
  PLACE_ON_IMAGE: WithSetTolerance & WithSetSelectedItem<ItemId>;
  SCALES: WithSetLabeledRange;
}

export type DraftByKind = {
  [K in SlideType]: SlideDraftBase & SlideDraftByKind[K];
};

export type SlideDraft<QKind extends SlideType = SlideType> = QKind extends SlideType
  ? SlideDraftBase & SlideDraftByKind[QKind]
  : never;
