import { Placement } from "@floating-ui/react"; // Assuming you are using the React package

/**
 * TODO: Move this to real color picker component when done
 * - This color picker should be usable with the FloatingWrapper or as a standalone component.
 * - The list of swatches passed in should be coming from the theme + recent colors
 * - Let's accept OKLCH as well as HEX
 * - This swatch component can also spawn 
 *
 *  **/

type HEX = `#${string}`;
type OKLCH = `oklch(${string})`;
type ColorString = HEX | OKLCH;

export interface ColorPickerProps {
  /** * The currently selected color (e.g., hex, rgb, hsl).
   * Makes the component controlled.
   */
  value?: string;

  /** * An array of color strings to display as quick-select swatches initially.
   */
  colorSwatch: ColorString[];

  recentlyUsedColorSwatch: ColorString[];
  /** * Fired when a user clicks/selects a color (either a swatch or from the full picker).
   */
  onChange: (color: ColorString) => void;

  /** * Fired when a user hovers over a color. Ideal for live previews elsewhere in the app.
   */
  onHover?: (color: ColorString) => void;

  /** * Floating-UI placement for the full color picker popover.
   * Defaults to 'bottom'.
   */
  placement?: Placement;

  /** * Optional class name to style the outermost container.
   */
  className?: string;

  /**
   * Optional: Allows controlling the open/close state of the full picker from the parent.
   */
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}
