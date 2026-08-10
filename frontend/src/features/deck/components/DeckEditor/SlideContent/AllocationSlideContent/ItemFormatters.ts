import { resolveDatumColor } from "@/shared/components/Charts/optionPalette";
import { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { McqOption } from "@/shared/types/Elements.types";
import type { AxisBankItem } from "@deck/hooks/useAxisEditor";
import type { CellId, GridBankItem } from "@deck/hooks/useGridEditor";
import type { PlaceItemView } from "@deck/hooks/usePlaceOnImageEditor";
import type { ScaleBankItem } from "@deck/hooks/useScalesEditor";
import type { AppImage, AxisPoint, PlacePoint } from "@deck/store/deckApi.gen";
import { Dispatch, SetStateAction } from "react";
import {
  EditableItem,
  EditableItemContent,
  ItemId,
  QuestionActions,
  QuestionBaseState,
} from "../_shared/Item.types";

export const mcqOptionToItem = (option: McqOption, idx: number): EditableItemContent => {
  return {
    id: option.id,
    label: option.text ?? "",
    color: resolveDatumColor(option.color, idx),
    image: option.image,
  };
};

/**
 * The bank fields every item-bank slide kind stores, once the load-time
 * identity backfill has given the item its id. Unlike an MCQ option, a bank
 * item's caption lives in `label`.
 */
interface BankItem {
  id: string;
  label?: string;
  color?: string;
  image?: AppImage;
}

export const bankItemToItem = (item: BankItem, idx: number): EditableItemContent => {
  return {
    id: item.id,
    label: item.label ?? "",
    color: resolveDatumColor(item.color, idx),
    image: item.image,
  };
};

// export const bankItemToItem = (
//   item: Identified<PlaceableItem>,
//   idx: number,
// ): EditableItemContent => {
//   return {
//     id: item.id,
//     label: item.label ?? "",
//     color: resolveDatumColor(item.color, idx),
//     image: item.image,
//   };
// };
const CONTINUOUS_ANIMATION = false;
const ANIMATE_ON_MOUNT = false;
const IS_HIGHLIGHTED = false;
const IS_SELECTED = false;

export const OptionToEditableMcqItem = (
  option: McqOption,
  idx: number,
  actions: QuestionActions<"MCQ">,
  state: QuestionBaseState,
  openPicker: OpenGalleryPicker,
  setOpenMenuId: Dispatch<SetStateAction<string | null>>,
  openMenuId: string | null,
  mockDistributionValue: number,
  mockDistributionHighestValue: number,
  mockDistributionDenominator: number,
  itemCount: number,
): EditableItem<"MCQ"> => {
  return {
    sourceIndex: idx,
    kind: "MCQ",
    state: {
      canRemove: state.canRemoveItem,
      menuIsOpen: openMenuId == option.id,
      isHighlighted: IS_HIGHLIGHTED,
      isSelected: IS_SELECTED,
      displayAsPercentage: state.displayResultsAsPercentage,
      continuousAnimation: CONTINUOUS_ANIMATION,
      animateOnMount: ANIMATE_ON_MOUNT,
      isScorable: actions.getIsScorable(option.id),
    },
    detail: {
      mockDistributionHighestValue: mockDistributionHighestValue,
      mockDistributionDenominator: mockDistributionDenominator,
      mockDistributionValue: mockDistributionValue,
      itemCount: itemCount,
    },
    item: mcqOptionToItem(option, idx),
    actions: {
      flush: actions.flush,
      setMenuIsOpenForItem: (open) => {
        setOpenMenuId(open ? option.id : null);
      },

      selectItem: () => {
        console.log("allocation slide content on select not implemented");
      },
      setColorForItem: (color) => {
        actions.setItemColor(option.id, color);
      },
      setImageForItem: (image) => {
        actions.setItemImage(option.id, image);
      },
      removeItem: () => {
        actions.removeItem(option.id);
      },
      openImagePicker: openPicker,
      scheduleItemLabel: (label) => actions.scheduleItemLabel(option.id, label),
      toggleScorabilityForItem: () => {
        actions.toggleScorability(option.id);
      },
    },
  };
};

export const ItemToEditablePlaceOnImageItem = (
  item: PlaceItemView,
  idx: number,
  actions: QuestionActions<"PLACE_ON_IMAGE">,
  state: QuestionBaseState,
  tolerance: number,
  openPicker: OpenGalleryPicker,
  setOpenMenuId: Dispatch<SetStateAction<string | null>>,
  openMenuId: string | null,
  selectedItemId: ItemId | null,
  setSelectedItemId: Dispatch<SetStateAction<ItemId | null>>,
  correctPositions?: Record<ItemId, PlacePoint>,
): EditableItem<"PLACE_ON_IMAGE"> => {
  const isScorable = actions.getIsScorable(item.id);
  return {
    sourceIndex: idx,
    kind: "PLACE_ON_IMAGE",
    state: {
      canRemove: state.canRemoveItem,
      menuIsOpen: openMenuId == item.id,
      isHighlighted: IS_HIGHLIGHTED,
      isSelected: selectedItemId === item.id,
      displayAsPercentage: state.displayResultsAsPercentage,
      continuousAnimation: CONTINUOUS_ANIMATION,
      animateOnMount: ANIMATE_ON_MOUNT,
      isScorable,
    },
    item: bankItemToItem(item, idx),
    detail: {
      target: correctPositions ? correctPositions[item.id] : undefined,
      tolerance,
    },
    actions: {
      flush: actions.flush,
      commitCorrectAnswer: (point) => {
        actions.commitCorrectAnswer(item.id, point);
      },
      scheduleCorrectAnswer: (point) => {
        actions.scheduleCorrectAnswer(item.id, point);
      },
      clearCorrectAnswer: () => {
        actions.clearCorrectAnswer(item.id);
      },
      setMenuIsOpenForItem: (open) => {
        setOpenMenuId(open ? item.id : null);
        if (open) setSelectedItemId(item.id);
      },
      selectItem: () => {
        setSelectedItemId(item.id);
      },
      setColorForItem: (color) => {
        actions.setItemColor(item.id, color);
      },
      setImageForItem: (image) => {
        actions.setItemImage(item.id, image);
      },
      removeItem: () => {
        actions.removeItem(item.id);
        setSelectedItemId((held) => (held === item.id ? null : held));
      },
      openImagePicker: openPicker,
      scheduleItemLabel: (label) => actions.scheduleItemLabel(item.id, label),
      /**
       * An image plane has no point to seed that the author did not choose, so
       * setting a target only ARMS the item — the press on the image then names
       * the point.
       */
      toggleScorabilityForItem: () => {
        if (isScorable) {
          actions.toggleScorability(item.id);
          return;
        }
        setSelectedItemId(item.id);
      },
    },
  };
};

export const ItemToEditableAxisItem = (
  item: AxisBankItem,
  idx: number,
  actions: QuestionActions<"AXIS">,
  state: QuestionBaseState,
  tolerance: number,
  openPicker: OpenGalleryPicker,
  setOpenMenuId: Dispatch<SetStateAction<string | null>>,
  openMenuId: string | null,
  selectedItemId: ItemId | null,
  setSelectedItemId: Dispatch<SetStateAction<ItemId | null>>,
  correctPositions?: Record<string, AxisPoint>,
): EditableItem<"AXIS"> => {
  return {
    sourceIndex: idx,
    kind: "AXIS",
    state: {
      canRemove: state.canRemoveItem,
      menuIsOpen: openMenuId == item.id,
      isHighlighted: IS_HIGHLIGHTED,
      isSelected: selectedItemId === item.id,
      displayAsPercentage: state.displayResultsAsPercentage,
      continuousAnimation: CONTINUOUS_ANIMATION,
      animateOnMount: ANIMATE_ON_MOUNT,
      isScorable: actions.getIsScorable(item.id),
    },
    item: bankItemToItem(item, idx),
    detail: {
      target: correctPositions ? correctPositions[item.id] : undefined,
      tolerance,
    },
    actions: {
      flush: actions.flush,
      commitCorrectAnswer: (point) => {
        actions.commitCorrectAnswer(item.id, point);
      },
      scheduleCorrectAnswer: (point) => {
        actions.scheduleCorrectAnswer(item.id, point);
      },
      clearCorrectAnswer: () => {
        actions.clearCorrectAnswer(item.id);
      },
      setMenuIsOpenForItem: (open) => {
        setOpenMenuId(open ? item.id : null);
        if (open) setSelectedItemId(item.id);
      },
      selectItem: () => {
        setSelectedItemId(item.id);
      },
      setColorForItem: (color) => {
        actions.setItemColor(item.id, color);
      },
      setImageForItem: (image) => {
        actions.setItemImage(item.id, image);
      },
      removeItem: () => {
        actions.removeItem(item.id);
        setSelectedItemId((held) => (held === item.id ? null : held));
      },
      openImagePicker: openPicker,
      scheduleItemLabel: (label) => actions.scheduleItemLabel(item.id, label),
      toggleScorabilityForItem: () => {
        actions.toggleScorability(item.id);
      },
    },
  };
};

export const ItemToEditableGridItem = (
  item: GridBankItem,
  idx: number,
  actions: QuestionActions<"GRID">,
  state: QuestionBaseState,
  openPicker: OpenGalleryPicker,
  setOpenMenuId: Dispatch<SetStateAction<string | null>>,
  openMenuId: string | null,
  selectedItemId: ItemId | null,
  setSelectedItemId: Dispatch<SetStateAction<ItemId | null>>,
  correctCells?: Record<ItemId, CellId>,
): EditableItem<"GRID"> => {
  const isScorable = actions.getIsScorable(item.id);
  return {
    sourceIndex: idx,
    kind: "GRID",
    state: {
      canRemove: state.canRemoveItem,
      menuIsOpen: openMenuId == item.id,
      isHighlighted: IS_HIGHLIGHTED,
      isSelected: selectedItemId === item.id,
      displayAsPercentage: state.displayResultsAsPercentage,
      continuousAnimation: CONTINUOUS_ANIMATION,
      animateOnMount: ANIMATE_ON_MOUNT,
      isScorable,
    },
    item: bankItemToItem(item, idx),
    detail: {
      target: correctCells ? correctCells[item.id] : undefined,
    },
    actions: {
      flush: actions.flush,
      commitCorrectAnswer: (cell) => {
        actions.commitCorrectAnswer(item.id, cell);
      },
      scheduleCorrectAnswer: (cell) => {
        actions.scheduleCorrectAnswer(item.id, cell);
      },
      clearCorrectAnswer: () => {
        actions.clearCorrectAnswer(item.id);
      },
      setMenuIsOpenForItem: (open) => {
        setOpenMenuId(open ? item.id : null);
        if (open) setSelectedItemId(item.id);
      },
      selectItem: () => {
        setSelectedItemId(item.id);
      },
      setColorForItem: (color) => {
        actions.setItemColor(item.id, color);
      },
      setImageForItem: (image) => {
        actions.setItemImage(item.id, image);
      },
      removeItem: () => {
        actions.removeItem(item.id);
        setSelectedItemId((held) => (held === item.id ? null : held));
      },
      openImagePicker: openPicker,
      scheduleItemLabel: (label) => actions.scheduleItemLabel(item.id, label),
      /**
       * A grid has no centre cell to seed, so setting a target only ARMS the
       * item — the cells' place affordances then name it.
       */
      toggleScorabilityForItem: () => {
        if (isScorable) {
          actions.toggleScorability(item.id);
          return;
        }
        setSelectedItemId(item.id);
      },
    },
  };
};

/** The scale a statement's target is placed on, shared by every row. */
interface ScaleRange {
  min: number;
  max: number;
  leftLabel: string;
  rightLabel: string;
  tolerance: number;
}

export const ItemToEditableScalesItem = (
  item: ScaleBankItem,
  idx: number,
  actions: QuestionActions<"SCALES">,
  state: QuestionBaseState,
  scale: ScaleRange,
  openPicker: OpenGalleryPicker,
  setOpenMenuId: Dispatch<SetStateAction<string | null>>,
  openMenuId: string | null,
  correctValues?: Record<ItemId, number>,
): EditableItem<"SCALES"> => {
  return {
    sourceIndex: idx,
    kind: "SCALES",
    state: {
      canRemove: state.canRemoveItem,
      menuIsOpen: openMenuId == item.id,
      isHighlighted: IS_HIGHLIGHTED,
      isSelected: IS_SELECTED,
      displayAsPercentage: state.displayResultsAsPercentage,
      continuousAnimation: CONTINUOUS_ANIMATION,
      animateOnMount: ANIMATE_ON_MOUNT,
      isScorable: actions.getIsScorable(item.id),
    },
    item: bankItemToItem(item, idx),
    detail: {
      correctValue: correctValues ? correctValues[item.id] : undefined,
      min: scale.min,
      max: scale.max,
      lowLabel: scale.leftLabel,
      highLabel: scale.rightLabel,
      tolerance: scale.tolerance,
    },
    actions: {
      flush: actions.flush,
      commitCorrectAnswer: (value) => {
        actions.commitCorrectAnswer(item.id, value);
      },
      scheduleCorrectAnswer: (value) => {
        actions.scheduleCorrectAnswer(item.id, value);
      },
      clearCorrectAnswer: () => {
        actions.clearCorrectAnswer(item.id);
      },
      setMenuIsOpenForItem: (open) => {
        setOpenMenuId(open ? item.id : null);
      },
      /** A statement row carries no selection state — its track is always live. */
      selectItem: () => undefined,
      setColorForItem: (color) => {
        actions.setItemColor(item.id, color);
      },
      setImageForItem: (image) => {
        actions.setItemImage(item.id, image);
      },
      removeItem: () => {
        actions.removeItem(item.id);
      },
      openImagePicker: openPicker,
      scheduleItemLabel: (label) => actions.scheduleItemLabel(item.id, label),
      /**
       * Arming a statement seeds the scale's midpoint, so a freshly-scored row
       * starts on an in-range default the author can then drag.
       */
      toggleScorabilityForItem: () => {
        actions.toggleScorability(item.id);
      },
    },
  };
};

export const ItemToEditableRankingItem = (
  item: BankItem,
  idx: number,
  actions: QuestionActions<"RANKING">,
  state: QuestionBaseState,
  openPicker: OpenGalleryPicker,
  setOpenMenuId: Dispatch<SetStateAction<string | null>>,
  openMenuId: string | null,
): EditableItem<"RANKING"> => {
  return {
    sourceIndex: idx,
    kind: "RANKING",
    state: {
      canRemove: state.canRemoveItem,
      menuIsOpen: openMenuId == item.id,
      isHighlighted: IS_HIGHLIGHTED,
      isSelected: IS_SELECTED,
      displayAsPercentage: state.displayResultsAsPercentage,
      continuousAnimation: CONTINUOUS_ANIMATION,
      animateOnMount: ANIMATE_ON_MOUNT,
      isScorable: actions.getIsScorable(item.id),
    },
    item: bankItemToItem(item, idx),
    detail: {},
    actions: {
      flush: actions.flush,
      setMenuIsOpenForItem: (open) => {
        setOpenMenuId(open ? item.id : null);
      },
      /** A ranking row carries no selection state — its list position is the answer. */
      selectItem: () => undefined,
      setColorForItem: (color) => {
        actions.setItemColor(item.id, color);
      },
      setImageForItem: (image) => {
        actions.setItemImage(item.id, image);
      },
      removeItem: () => {
        actions.removeItem(item.id);
      },
      openImagePicker: openPicker,
      scheduleItemLabel: (label) => actions.scheduleItemLabel(item.id, label),
      toggleScorabilityForItem: () => {
        actions.toggleScorability(item.id);
      },
    },
  };
};

export const OptionToEditableAllocationItem = (
  option: McqOption,
  idx: number,
  actions: QuestionActions<"ALLOCATION">,
  state: QuestionBaseState,
  totalPoints: number,
  tolerance: number,
  openPicker: OpenGalleryPicker,
  setOpenMenuId: Dispatch<SetStateAction<string | null>>,
  openMenuId: string | null,

  correctAllocations?: Record<string, number>,
): EditableItem<"ALLOCATION"> => {
  return {
    sourceIndex: idx,
    kind: "ALLOCATION",
    state: {
      canRemove: state.canRemoveItem,
      menuIsOpen: openMenuId == option.id,
      isHighlighted: IS_HIGHLIGHTED,
      isSelected: IS_SELECTED,
      displayAsPercentage: state.displayResultsAsPercentage,
      continuousAnimation: CONTINUOUS_ANIMATION,
      animateOnMount: ANIMATE_ON_MOUNT,
      isScorable: actions.getIsScorable(option.id),
    },
    item: mcqOptionToItem(option, idx),
    detail: {
      //TODO: correctValue and value, oen of these needs to be removed?
      correctValue: correctAllocations ? correctAllocations[option.id] : 0,
      totalPool: totalPoints,
      tolerance,
    },
    actions: {
      flush: actions.flush,
      commitCorrectAnswer: (points) => {
        actions.commitCorrectAnswer(option.id, points);
      },
      scheduleCorrectAnswer: (points) => {
        actions.scheduleCorrectAnswer(option.id, points);
      },
      setMenuIsOpenForItem: (open) => {
        setOpenMenuId(open ? option.id : null);
      },
      clearCorrectAnswer: () => {
        actions.clearCorrectAnswer(option.id);
      },
      selectItem: () => {
        console.log("allocation slide content on select not implemented");
      },
      setColorForItem: (color) => {
        actions.setItemColor(option.id, color);
      },
      setImageForItem: (image) => {
        actions.setItemImage(option.id, image);
      },
      removeItem: () => {
        actions.removeItem(option.id);
      },
      openImagePicker: openPicker,
      scheduleItemLabel: (label) => actions.scheduleItemLabel(option.id, label),
      toggleScorabilityForItem: () => {
        actions.toggleScorability(option.id);
      },
    },
  };
};
