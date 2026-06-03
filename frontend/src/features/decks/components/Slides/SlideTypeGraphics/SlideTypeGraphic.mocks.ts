import { slideTypeGraphics, type ElementKind } from "./slideTypeGraphics";

// Every slide/question kind that has a graphic, derived from the single source
// of truth so the gallery stays in sync if kinds are added or removed.
export const ALL_SLIDE_KINDS = Object.keys(slideTypeGraphics) as ElementKind[];
