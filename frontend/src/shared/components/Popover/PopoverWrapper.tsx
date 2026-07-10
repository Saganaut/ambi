/**
 * Wrapper with Floating UI functionality to wrap dialogs, menus, and other popovers.
 * Styling is up to the consumer.
 *  **/

import {
  FloatingFocusManager,
  FloatingList,
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
  useListNavigation,
  useRole,
  useTransitionStyles,
  type UseInteractionsReturn,
} from "@floating-ui/react";
import { HTMLProps, ReactNode, useEffect, useRef, useState } from "react";

/**
 * Arrow-key navigation handles handed to children (via `ctx.listNav`) so each
 * menu item can register itself and pick up roving focus. Present only when the
 * consumer opts in with `listNavigation`.
 */
interface ListNavContext {
  getItemProps: UseInteractionsReturn["getItemProps"];
  activeIndex: number | null;
}
interface ChildFunctionArgs {
  ctx: {
    close: () => void;
    styles: React.CSSProperties;
    listNav?: ListNavContext;
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
  /**
   * Opt into arrow-key list navigation. The popover exposes floating-ui's
   * `getItemProps` and the active index through `ctx.listNav`; children wrap
   * their focusable items with those so Up/Down moves roving focus between them.
   * Pairs with `manageFocus={false}` for a field-anchored menu: the caret stays
   * in the field on open, and the arrow keys step into the menu on demand.
   */
  listNavigation?: boolean;
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
  listNavigation = false,
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

  // Populated by the children's items (via `useListItem` inside `FloatingList`)
  // and read by `useListNavigation` to move roving focus with the arrow keys.
  const elementsRef = useRef<(HTMLElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  // Start each open with nothing highlighted so the caret stays in the field
  // until the user arrows into the menu.
  useEffect(() => {
    if (!isOpen) setActiveIndex(null);
  }, [isOpen]);

  const click = useClick(context, { enabled: openOn === "click" });
  const dismiss = useDismiss(context);
  const role = useRole(context);
  const listNav = useListNavigation(context, {
    listRef: elementsRef,
    activeIndex,
    onNavigate: setActiveIndex,
    enabled: listNavigation,
    focusItemOnOpen: false,
    loop: true,
  });

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
    click,
    dismiss,
    role,
    listNav,
  ]);
  const triggerProps = {
    ref: refs.setReference,
    ...getReferenceProps(),
  };

  const renderChildren = () =>
    typeof children === "function"
      ? children({
          ctx: {
            close: () => setIsOpen(false),
            styles: transitionStyles,
            listNav: listNavigation ? { getItemProps, activeIndex } : undefined,
          },
        })
      : children;
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
              {/* Children may be a function so they can read `ctx` (close, transition
                  styles, and — when opted in — the list-navigation handles). List
                  items register through `FloatingList`, so wrap when enabled. */}
              {listNavigation ? (
                <FloatingList elementsRef={elementsRef}>{renderChildren()}</FloatingList>
              ) : (
                renderChildren()
              )}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
};
