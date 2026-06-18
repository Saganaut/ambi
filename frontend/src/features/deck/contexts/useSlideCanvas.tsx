import { useContext } from "react";

import { SlideCanvasContext } from "./SlideCanvasContext";

/**
 * Read the canvas chrome state (see {@link SlideCanvasContext}). Falls back to
 * the context default ({@code hasBackgroundImage: false}) when used outside a
 * provider, so consumers stay renderable in isolation.
 */
const useSlideCanvas = () => useContext(SlideCanvasContext);

export { useSlideCanvas };
