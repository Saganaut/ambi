import { resolveDatumColor } from "@/shared/components/Charts/optionPalette";
import { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { McqOption } from "@/shared/types/Elements.types";
import type { AxisPoint } from "@deck/store/deckApi.gen";
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

export const ItemToEditableAxisItem = (
  item: McqOption,
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
    item: mcqOptionToItem(item, idx),
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
