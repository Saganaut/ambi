import { use } from "react";
import { McqSlideContext, McqSlideContextValue } from "./McqSlideProvider";

export function useMcqSlideContext(): McqSlideContextValue {
  const ctx = use(McqSlideContext);
  if (!ctx) throw new Error("useMcqSlide must be used within a McqSlideProvider");
  return ctx;
}
