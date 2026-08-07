import { resolveDatumColor } from "@/shared/components/Charts/optionPalette";
import { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { McqOption } from "@/shared/types/Elements.types";
import { Dispatch, SetStateAction } from "react";
import {
  EditableItem,
  EditableItemContent,
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
const CONTINUOUS_ANIMATION = false;
const ANIMATE_ON_MOUNT = false;
const IS_HIGHLIGHTED = false;
const IS_SELECTED = false;
export const OptionToEditableItem = (
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
