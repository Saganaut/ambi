import { SlideType } from "@deck/store/deckEnums.gen";
import { slideTypeGraphics } from "./slideTypeGraphics";

// Every slide type that has a graphic, derived from the single source of truth
// so the gallery stays in sync if types are added or removed.
export const ALL_SLIDE_KINDS = Object.keys(slideTypeGraphics) as SlideType[];
