import { Placement } from "../store/deckApi.gen";

export const slotMappingOptions = [
  {
    start: 1,
    end: 4,
    top: 1,
    bottom: 4,
  },
  {
    start: 5,
    end: 8,
    top: 1,
    bottom: 4,
  },
  {
    start: 2,
    end: 3,
    top: 1,
    bottom: 4,
  },
  {
    start: 6,
    end: 7,
    top: 1,
    bottom: 4,
  },
  {
    start: 2,
    end: 3,
    top: 2,
    bottom: 3,
  },
  {
    start: 6,
    end: 7,
    top: 2,
    bottom: 3,
  },
] as const satisfies readonly Placement[];

export type SlotMapping = (typeof slotMappingOptions)[number];

export interface ImageSlotConfig {
  imgUrl: string;
  // A general Placement, not the preset `SlotMapping` union: the effective
  // placement can come from the persisted cover image (any Placement) or a
  // preset hover preview. `slotButtons`/`slotMappingOptions` stay narrow for
  // the picker UI.
  placement: Placement;
}

interface SlotButton {
  name: string;
  placement: SlotMapping;
  icon: string;
}

export const slotButtons = [
  {
    name: "left-half",
    icon: "",
    placement: {
      start: 1,
      end: 4,
      top: 1,
      bottom: 4,
    },
  },
  {
    name: "right-half",
    icon: "",
    placement: {
      start: 5,
      end: 8,
      top: 1,
      bottom: 4,
    },
  },
  {
    name: "left-quarter",
    icon: "",
    placement: {
      start: 2,
      end: 3,
      top: 1,
      bottom: 4,
    },
  },
  {
    name: "right-quarter",
    icon: "",
    placement: {
      start: 6,
      end: 7,
      top: 1,
      bottom: 4,
    },
  },
  {
    name: "left-centered",
    icon: "",
    placement: {
      start: 2,
      end: 3,
      top: 2,
      bottom: 3,
    },
  },
  {
    name: "right-centered",
    icon: "",
    placement: {
      start: 5,
      end: 8,
      top: 1,
      bottom: 4,
    },
  },
] as const satisfies readonly SlotButton[];
