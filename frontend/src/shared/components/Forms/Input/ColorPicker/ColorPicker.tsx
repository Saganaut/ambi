// The DS color picker (Figma 604-3249 / 603-2718). This file is the popover
// form: a trigger anchoring a FloatingPopover with a callout tail, containing
// ColorPickerPanel (which is also usable standalone — e.g. inside a modal or
// an existing popover).
import { Placement } from "@floating-ui/react";
import { HTMLProps, ReactNode } from "react";

import { PopoverWrapper } from "@saganaut/ambi-ui";
import styles from "./ColorPicker.module.css";
import type { ColorValue, PickerView } from "./ColorPickerPanel";
import { ColorPickerPanel } from "./ColorPickerPanel";

interface ColorPickerProps {
  /** * The currently selected color (hex, oklch, or a var(--role-*) theme ref).
   * Highlights the matching swatch and seeds the custom view.
   */
  value?: string;

  /** * Color strings to display as quick-select swatches — the theme palette
   * plus any fixed choices. Also shown as the "Theme" row of the custom view.
   */
  colorSwatch: ColorValue[];

  /** * Recently used colors, newest first. The caller owns persistence. */
  recentlyUsedColorSwatch?: ColorValue[];

  /** * Fired when a user commits a color (a swatch pick, or Apply in the
   * custom view). Swatch values pass through verbatim; the custom view
   * emits hex (#rrggbb, or #rrggbbaa when translucent).
   */
  onChange: (color: ColorValue) => void;

  /** * Fired when a user hovers a swatch. Ideal for live previews elsewhere. */
  onHover?: (color: ColorValue) => void;

  /** * When provided, the swatch grid leads with a clear (slash) swatch. */
  onClear?: () => void;

  /** * Heading of the swatch view, e.g. "Text color". Also labels the dialog. */
  label?: string;

  /** * The element that anchors and toggles the popover. */
  renderTrigger: (props: HTMLProps<HTMLElement>) => ReactNode;

  /** * Which view the popover opens on. Defaults to the swatch grid. */
  initialView?: PickerView;

  /** * Whether the custom view offers the opacity slider. Turn off for fields
   * that can only store an opaque color (e.g. a background color validated to
   * #rrggbb); edits are then pinned to full opacity. Defaults to true.
   */
  allowAlpha?: boolean;

  /** * Floating-UI placement for the popover. Defaults to 'bottom'. */
  placement?: Placement;

  /** * Optional class name for the panel. */
  className?: string;

  /**
   * Optional: Allows controlling the open/close state of the picker from the parent.
   */
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;

  /**
   * Forwarded to FloatingPopover. Turn off when the picker is opened from a
   * toolbar floating over a focused editor, so opening/closing it never moves
   * focus itself (the editor keeps the caret). Defaults to true.
   */
  manageFocus?: boolean;
}

const ColorPicker = ({
  value,
  colorSwatch,
  recentlyUsedColorSwatch,
  onChange,
  onHover,
  onClear,
  label,
  renderTrigger,
  initialView,
  allowAlpha,
  placement = "bottom",
  className,
  isOpen,
  onOpenChange,
  manageFocus = true,
}: ColorPickerProps) => (
  <PopoverWrapper
    placement={placement}
    open={isOpen}
    onOpenChange={onOpenChange}
    manageFocus={manageFocus}
    renderTrigger={renderTrigger}
    showArrow
    arrowClassName={styles.tail}
    offsetAmount={12}
    aria-label={label ?? "Color picker"}
  >
    {({ ctx }) => (
      <div style={ctx.styles}>
        <ColorPickerPanel
          value={value}
          colorSwatch={colorSwatch}
          recentlyUsedColorSwatch={recentlyUsedColorSwatch}
          label={label}
          initialView={initialView}
          allowAlpha={allowAlpha}
          className={className}
          onChange={onChange}
          onHover={onHover}
          onClear={onClear}
          onClose={ctx.close}
        />
      </div>
    )}
  </PopoverWrapper>
);

export type { ColorString, ColorValue, PickerView } from "./ColorPickerPanel";
export { ColorPicker };
export type { ColorPickerProps };
