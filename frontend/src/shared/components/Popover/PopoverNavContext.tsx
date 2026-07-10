// Bridges a host popover's arrow-key list navigation (floating-ui `getItemProps`
// + the active index) down to the individual buttons in `OptionMenuContent`.
// Null when the host doesn't wire navigation — the legacy inline `OptionMenu`
// shell (Axis / Ranking / Matching) provides no context, so its buttons render
// plain.
import type { UseInteractionsReturn } from "@floating-ui/react";
import { createContext } from "react";

interface PopoverNavValue {
  getItemProps: UseInteractionsReturn["getItemProps"];
  activeIndex: number | null;
}

const PopoverNavContext = createContext<PopoverNavValue | null>(null);

export { PopoverNavContext };
export type { PopoverNavValue };
