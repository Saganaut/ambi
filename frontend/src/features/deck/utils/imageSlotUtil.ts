import LeftCentered from "@features/deck/assets/left-center.svg?react";
import LeftHalf from "@features/deck/assets/left-half.svg?react";
import LeftQuarter from "@features/deck/assets/left-quarter.svg?react";
import RightCentered from "@features/deck/assets/right-center.svg?react";
import RightHalf from "@features/deck/assets/right-half.svg?react";
import RightQuarter from "@features/deck/assets/right-quarter.svg?react";
import { ComponentType, SVGProps } from "react";
import { ImageSlotConfig, SlotButton, slotButtons, SlotMapping } from "../contexts/ImageSlot.types";
import { Placement } from "../store/deckApi.gen";

export const placementsEqual = (a: Placement, b: Placement): boolean =>
  a.start === b.start && a.end === b.end && a.top === b.top && a.bottom === b.bottom;

export const doesImageSlotConfigMatchSlotId = (
  slotConfig: ImageSlotConfig,
  slotId: SlotMapping,
): boolean => placementsEqual(slotConfig.slot.placement, slotId);

export const returnImagePositonIcon = (
  slotButton: SlotButton,
): ComponentType<SVGProps<SVGSVGElement>> => {
  switch (slotButton.name) {
    case "rightHalf":
      return RightHalf;
    case "leftHalf":
      return LeftHalf;
    case "leftQuarter":
      return LeftQuarter;
    case "rightQuarter":
      return RightQuarter;
    case "rightCentered":
      return RightCentered;
    case "leftCentered":
      return LeftCentered;
    default: {
      const _exhaustiveCheck: never = slotButton.name;
      return _exhaustiveCheck;
    }
  }
};

/**
 * Resolve a raw `Placement` to its preset `SlotButton`, or `undefined` if it
 * isn't one of the known slots. Returns the canonical `slotButtons` entry so the
 * `name`/`placement` pair stays correlated (literal types intact) — callers get
 * a ready-made `SlotButton` without reconstructing or re-narrowing it.
 */
export const resolveSlot = (placement: Placement): SlotButton | undefined =>
  slotButtons.find((button) => placementsEqual(button.placement, placement));
