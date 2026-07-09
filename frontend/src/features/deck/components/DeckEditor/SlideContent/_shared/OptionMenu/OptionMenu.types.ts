import type { ComponentType, SVGProps } from "react";

/** The kind-specific action leading the option menu (MCQ: mark correct, Axis: set target). */
interface OptionMenuPrimaryAction {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** aria-pressed for toggle-style actions (mark correct / set target). */
  pressed?: boolean;
  onSelect: () => void;
}

export type { OptionMenuPrimaryAction };
