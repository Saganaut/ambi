// oxlint-disable typescript/consistent-type-definitions
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
export interface QuestionBaseActions {
  removeItem: (optionId: string) => void;
  addItem: () => void;
  handleItemDragEnd: (event: DragEndEvent) => void;
  scheduleItemText: (optionId: string, text: string) => void;
  setItemColor: (optionId: string, color: string) => void;
  setItemImage: (optionId: string, image: AppImage) => void;
  flush: () => void;
  scheduleQuestionPrompt: (html: string) => void;
}
export interface AllocationQuestionActions {
  scheduleCorrectAllocation: (optionId: string, points: number) => void;
  /** Immediate per-option answer set (the row's "Set answer" seed). */
  commitCorrectAllocation: (optionId: string, points: number) => void;
  /** Drop one option's answer, leaving that option unscored. */
  clearCorrectAllocation: (optionId: string) => void;
  scheduleTotalPoints: (value: number) => void;
  /** Debounced tolerance edit (clamped to [0, pool]). */
  scheduleTolerance: (value: number) => void;
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

type EditableItemContent = ItemContent<AppImage>;
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
  openPicker: OpenGalleryPicker;
}
//TODO: need to consolidate the actions/move them to actions but it has to be typed
interface ScaleItemDetail {
  correctValue?: number;
  minValue: number;
  maxValue: number;
  tolerance: number;
  leftLabel: string;
  rightLabel: string;
}

interface ScaleItemActions extends BaseItemActions {
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
interface RankingItemDetail {}
// oxlint-disable-next-line typescript/no-empty-object-type
interface RankingItemActions extends BaseItemActions {}
// oxlint-disable-next-line typescript/no-empty-object-type
interface MatchingItemActions extends BaseItemActions {}
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
  isCorrect?: boolean;
  isHighlighted?: boolean;
  isSelected?: boolean;
  displayAsPercentage?: boolean;
  continuousAnimation?: boolean;
  animateOnMount?: boolean;
}

export interface QuestionBaseState {
  canAddItem: boolean;
  canRemoveItem: boolean;
}

interface EditableItemDetailByKind {
  mcq: McqItemDetail;
  scale: ScaleItemDetail;
  placement: PlacementItemDetail;
  ranking: RankingItemDetail;
  matching: MatchingItemDetail;
  allocation: AllocationItemDetail;
}
interface EditableItemActionsByKind {
  mcq: McqItemActions;
  placement: PlacementItemActions;
  scale: ScaleItemActions;
  ranking: RankingItemActions;
  matching: MatchingItemActions;
  allocation: AllocationItemActions;
}
export type EditableItemKind = keyof EditableItemDetailByKind;

interface EditableItemBase {
  sourceIndex: number;
  item: EditableItemContent;
  sortable: SortableItemState;
  ui: UIState;
}

export type EditableItem<TKind extends EditableItemKind = EditableItemKind> =
  TKind extends EditableItemKind
    ? EditableItemBase & {
        kind: TKind;
        detail: EditableItemDetailByKind[TKind];
        actions: EditableItemActionsByKind[TKind];
      }
    : never;

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type NonSortableEditableItem<TKind extends EditableItemKind = EditableItemKind> =
  DistributiveOmit<EditableItem<TKind>, "sortable">;
