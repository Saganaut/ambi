// Bridges a host popover's arrow-key list navigation (floating-ui `getItemProps`
// + the active index) down to the individual buttons in `OptionMenuContent`.
// Null when the host doesn't wire navigation — the legacy inline `OptionMenu`
// shell (Axis / Ranking / Matching) provides no context, so its buttons render
// plain. Only the MCQ `FloatingPopover` path supplies a value.
import { createContext } from "react";
import type { UseInteractionsReturn } from "@floating-ui/react";

interface OptionMenuNavValue {
  getItemProps: UseInteractionsReturn["getItemProps"];
  activeIndex: number | null;
}

const OptionMenuNavContext = createContext<OptionMenuNavValue | null>(null);

export { OptionMenuNavContext };
export type { OptionMenuNavValue };
