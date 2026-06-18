import { ImageSlotConfig, SlotMapping } from "../contexts/ImageSlotContext";

export const doesImageSlotConfigMatchSlotId = (
  slotConfig: ImageSlotConfig,
  slotId: SlotMapping,
): boolean => {
  if (
    slotConfig.placement.start === slotId.start &&
    slotConfig.placement.end === slotId.end &&
    slotConfig.placement.bottom === slotId.bottom &&
    slotConfig.placement.top === slotId.top
  ) {
    return true;
  }
  return false;
};
