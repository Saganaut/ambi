/**
 * Wrapper with Floating UI functionality to wrap dialogs, menus, and other popovers.
 * Styling is up to the consumer.
 *  **/

import {
  FloatingFocusManager,
  FloatingPortal,
  Placement,
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
  useTransitionStyles,
} from "@floating-ui/react";
import { HTMLProps, ReactNode, useState } from "react";
interface ChildFunctionArgs {
  ctx: {
    close: () => void;
    styles: React.CSSProperties;
  };
}
interface FloatingPopoverProps {
  children: ReactNode | ((arg0: ChildFunctionArgs) => ReactNode);
  placement?: Placement;
  offsetAmount?: number;
  renderTrigger: (props: HTMLProps<HTMLElement>) => ReactNode;
  zIndex?: number;
  open?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  /**
   * How the trigger opens the popover. "click" (default) toggles on trigger
   * click. "controlled" wires no open interaction — the consumer drives `open`
   * itself (e.g. a field whose focus opens the menu); dismissal (outside press
   * and Escape) still fires `onOpenChange(false)`.
   */
  openOn?: "click" | "controlled";
  /**
   * Whether the floating focus manager moves focus into the popover on open
   * and restores it on close. Turn off for menus opened from a still-focused
   * field, so opening doesn't pull the caret out of the trigger. Defaults to
   * true.
   */
  manageFocus?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

export const FloatingPopover = ({
  children,
  placement = "bottom",
  offsetAmount = 8,
  renderTrigger,
  zIndex = 1000,
  open,
  onOpenChange,
  openOn = "click",
  manageFocus = true,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
}: FloatingPopoverProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isOpen = open ?? uncontrolledOpen;
  const setIsOpen = (next: boolean) => {
    if (open === undefined) {
      setUncontrolledOpen(next);
    }
    onOpenChange?.(next);
  };

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(offsetAmount),
      flip({ fallbackAxisSideDirection: "end" }),
      shift({ padding: 8 }),
    ],
  });
  const { isMounted, styles: transitionStyles } = useTransitionStyles(context);

  const click = useClick(context, { enabled: openOn === "click" });
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role]);
  const triggerProps = {
    ref: refs.setReference,
    ...getReferenceProps(),
  };
  return (
    <>
      {renderTrigger(triggerProps)}

      {isMounted && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false} disabled={!manageFocus}>
            <div
              ref={refs.setFloating}
              aria-label={ariaLabel}
              aria-labelledby={ariaLabelledby}
              style={{ ...floatingStyles, zIndex }}
              {...getFloatingProps()}
            >
              {/* If children is a function, we can pass it the close function so that it can use it to close the popover */}
              {typeof children === "function"
                ? children({ ctx: { close: () => setIsOpen(false), styles: transitionStyles } })
                : children}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
};
