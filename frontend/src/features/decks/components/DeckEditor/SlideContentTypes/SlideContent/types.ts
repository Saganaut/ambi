// Shared types + constants for the SlideContent (non-interactive slide) editor.
//
// The block/layout model is frontend-only and now lives in `BlockTypes.ts` —
// none of it is backed by the server (a slide's persisted body is the
// polymorphic `content` on `SlideResponse`/`SlideRequest`, not a block array).
// This file is kept as a barrel so the sibling block editors can keep importing
// from "./types"; prefer importing directly from "./BlockTypes" in new code.
//
// Anything that IS backend-owned should come straight from the generated client
// (`@store/AmbiApi`) or its mirrored enums (`@store/enums`) — e.g. `AppImage`,
// `SlideType` — rather than being redeclared here.
export * from "./BlockTypes";
