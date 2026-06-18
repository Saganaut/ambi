import { Placement } from "../store/deckApi.gen";

// The preset cover-image slots are the single source of truth for the grid
// coordinates. Each entry pairs a human name with a `Placement` (the shape the
// backend persists). `as const satisfies` keeps every entry's literal types —
// so the derived `SlotMapping`/`SlotPlacementNames` stay unions of the known
// slots — while guaranteeing each placement is a valid `Placement`.
export const slotButtons = [
  {
    name: "leftHalf",
    placement: { start: 1, end: 4, top: 1, bottom: 4 },
  },
  {
    name: "rightHalf",
    placement: { start: 5, end: 8, top: 1, bottom: 4 },
  },
  {
    name: "leftQuarter",
    placement: { start: 2, end: 3, top: 1, bottom: 4 },
  },
  {
    name: "rightQuarter",
    placement: { start: 6, end: 7, top: 1, bottom: 4 },
  },
  {
    name: "leftCentered",
    placement: { start: 2, end: 3, top: 2, bottom: 3 },
  },
  {
    name: "rightCentered",
    placement: { start: 5, end: 8, top: 2, bottom: 3 },
  },
] as const satisfies readonly { name: string; placement: Placement }[];

export type SlotPlacementNames = (typeof slotButtons)[number]["name"];
export type SlotMapping = (typeof slotButtons)[number]["placement"];

export interface SlotButton {
  name: SlotPlacementNames;
  placement: SlotMapping;
}

export interface ImageSlotConfig {
  imgUrl: string;
  slot: SlotButton;
}

// The placements alone, in `slotButtons` order — used where only the grid
// coordinates matter (e.g. the default placement).
export const slotMappingOptions = slotButtons.map((b) => b.placement);
