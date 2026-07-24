/**
 * Wrapper with Floating UI functionality to wrap dialogs, menus, and other popovers.
 * Styling is up to the consumer.
 *  **/

import {
  FloatingArrow,
  FloatingFocusManager,
  FloatingList,
  FloatingNode,
  FloatingPortal,
  FloatingTree,
  Placement,
  arrow,
  autoUpdate,
  flip,
  offset,
  safePolygon,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useFloatingNodeId,
  useFloatingParentNodeId,
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
   * click. "hover" keeps it open while the pointer travels from the trigger
   * to the portalled content and also opens it from keyboard focus.
   * "controlled" wires no open interaction — the consumer drives `open`
   * itself (e.g. a field whose focus opens the menu); dismissal (outside press
   * and Escape) still fires `onOpenChange(false)`.
   */
  openOn?: "click" | "hover" | "controlled";
  /**
   * Whether the floating focus manager moves focus into the popover on open
   * and restores it on close. Turn off for menus opened from a still-focused
   * field, so opening doesn't pull the caret out of the trigger. Defaults to
   * true.
   */
  manageFocus?: boolean;
  /**
   * Which floating element receives focus when the popover opens. Pass -1 to
   * retain focus on an anchor's existing control while retaining portal tab
   * order and focus guards.
   */
  initialFocus?: number;
  /**
   * Opt into arrow-key list navigation. The popover exposes floating-ui's
   * `getItemProps` and the active index through `ctx.listNav`; children wrap
   * their focusable items with those so Up/Down moves roving focus between them.
   * Pairs with `manageFocus={false}` for a field-anchored menu: the caret stays
   * in the field on open, and the arrow keys step into the menu on demand.
   */
  listNavigation?: boolean;
  /**
   * Render a callout tail (arrow) pointing at the trigger. Styling is up to
   * the consumer via `arrowClassName` (set the svg `fill` to the popover's
   * surface color). Remember to include the tail height in `offsetAmount`.
   */
  showArrow?: boolean;
  arrowClassName?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

const ARROW_WIDTH = 18;
const ARROW_HEIGHT = 10;

/**
 * Popovers can nest: a trigger rendered inside one popover's floating content
 * may open another (e.g. a toolbar opening a color picker). Dismissal only
 * understands that relationship through a shared FloatingTree — without one,
 * pressing inside a nested popover's portal reads as an outside press and
 * closes the parent. The outermost popover creates the tree; nested ones
 * (detected via the parent-node context) join it.
 */
export const FloatingPopover = (props: FloatingPopoverProps) => {
  const parentId = useFloatingParentNodeId();
  if (parentId === null) {
    return (
      <FloatingTree>
        <FloatingPopoverImpl {...props} />
      </FloatingTree>
    );
  }
  return <FloatingPopoverImpl {...props} />;
};

const FloatingPopoverImpl = ({
  children,
  placement = "bottom",
  offsetAmount = 8,
  renderTrigger,
  zIndex = 1000,
  open,
  onOpenChange,
  openOn = "click",
  manageFocus = true,
  initialFocus,
  listNavigation = false,
  showArrow = false,
  arrowClassName,
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

  const arrowRef = useRef<SVGSVGElement | null>(null);
  const nodeId = useFloatingNodeId();
  const { refs, floatingStyles, context } = useFloating({
    nodeId,
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(offsetAmount),
      flip({ fallbackAxisSideDirection: "end" }),
      shift({ padding: 8 }),
      ...(showArrow ? [arrow({ element: arrowRef })] : []),
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

  const click = useClick(context, {
    enabled: openOn === "click" || openOn === "hover",
    // Hover affordances still need an intentional touch/keyboard path, but a
    // mouse click on their anchor must not fight the hover interaction.
    ignoreMouse: openOn === "hover",
  });
  const hover = useHover(context, {
    enabled: openOn === "hover",
    handleClose: safePolygon(),
  });
  const focus = useFocus(context, { enabled: openOn === "hover" });
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
    hover,
    focus,
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
    <FloatingNode id={nodeId}>
      {renderTrigger(triggerProps)}

      {isMounted && (
        <FloatingPortal>
          <FloatingFocusManager
            context={context}
            modal={false}
            disabled={!manageFocus}
            initialFocus={initialFocus}
          >
            <div
              ref={refs.setFloating}
              aria-label={ariaLabel}
              aria-labelledby={ariaLabelledby}
              style={{ ...floatingStyles, zIndex }}
              {...getFloatingProps()}
            >
              {showArrow && (
                <FloatingArrow
                  ref={arrowRef}
                  context={context}
                  width={ARROW_WIDTH}
                  height={ARROW_HEIGHT}
                  tipRadius={2}
                  className={arrowClassName}
                />
              )}
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
    </FloatingNode>
  );
};
