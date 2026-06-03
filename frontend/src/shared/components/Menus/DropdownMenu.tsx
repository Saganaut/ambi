// Dropdown panel anchored to a trigger element. Positioning, viewport
// flipping/shifting, click-outside + Escape dismissal, and keyboard menu
// navigation (roving tabindex, focus-into-menu on open, focus-return to the
// trigger on close) are all provided by @floating-ui/react. The panel is
// rendered through a FloatingPortal so it escapes `overflow: hidden` ancestors.
import React, {
  createContext,
  use,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingList,
  FloatingPortal,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
  useListItem,
  useListNavigation,
  useRole,
  type Placement,
  type UseInteractionsReturn,
} from "@floating-ui/react";
import styles from "./DropdownMenu.module.css";

interface DropdownMenuContextValue {
  closeMenu: () => void;
  getItemProps: UseInteractionsReturn["getItemProps"];
  activeIndex: number | null;
}

const DropdownMenuContext = createContext<DropdownMenuContextValue>({
  closeMenu: () => undefined,
  getItemProps: () => ({}),
  activeIndex: null,
});

type DropdownPosition =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left";

// Anything with clientX/clientY — typically a MouseEvent / React.MouseEvent.
// Only used when `anchorToCursor` is set; otherwise toggle ignores its argument.
interface CursorAnchor {
  clientX: number;
  clientY: number;
}
type ToggleFn = (anchor?: CursorAnchor) => void;

interface DropdownMenuProps {
  trigger: (toggle: ToggleFn) => ReactElement;
  children: ReactNode;
  position?: DropdownPosition;
  className?: string;
  // Opt-in: pin the panel at the cursor passed to toggle (context-menu style)
  // instead of anchoring to the trigger. `position` still names which corner
  // of the panel sits at the cursor.
  anchorToCursor?: boolean;
}

// `position` names the corner of the panel that meets the trigger: top-* opens
// below the trigger, bottom-* above; -right/-left aligns that edge. Translated
// to floating-ui placements (LTR: start = left edge, end = right edge).
const placementMap: Record<DropdownPosition, Placement> = {
  "top-right": "bottom-end",
  "top-left": "bottom-start",
  "bottom-right": "top-end",
  "bottom-left": "top-start",
};

const DropdownMenu = ({
  trigger,
  children,
  position = "top-right",
  className,
  anchorToCursor = false,
}: DropdownMenuProps) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  // Shared with FloatingList (populated via useListItem) and read by
  // useListNavigation to move focus between items with the arrow keys.
  const elementsRef = useRef<(HTMLElement | null)[]>([]);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: placementMap[position],
    strategy: "fixed",
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const role = useRole(context, { role: "menu" });
  const dismiss = useDismiss(context);
  const listNavigation = useListNavigation(context, {
    listRef: elementsRef,
    activeIndex,
    onNavigate: setActiveIndex,
    loop: true,
  });
  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
    role,
    dismiss,
    listNavigation,
  ]);

  const toggle: ToggleFn = (anchor) => {
    if (anchorToCursor && anchor) {
      // Anchor to a zero-size virtual element at the click point so floating-ui
      // positions the panel from the cursor (context-menu behaviour).
      const { clientX: x, clientY: y } = anchor;
      refs.setPositionReference({
        getBoundingClientRect: () => ({
          width: 0,
          height: 0,
          x,
          y,
          top: y,
          left: x,
          right: x,
          bottom: y,
        }),
      });
      setOpen(true);
      return;
    }
    // Non-cursor menus never set a position reference, so floating-ui anchors
    // to the wrapper element. (Calling setPositionReference(null) here would
    // wipe the wrapper reference and pin the panel to the viewport origin.)
    setOpen((prev) => !prev);
  };

  const closeMenu = () => {
    setOpen(false);
  };

  return (
    <div
      ref={(node) => {
        refs.setReference(node);
      }}
      className={[styles.wrapper, className].filter(Boolean).join(" ")}
      {...getReferenceProps()}>
      {trigger(toggle)}
      {open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={(node) => {
                refs.setFloating(node);
              }}
              className={styles.panel}
              style={floatingStyles}
              {...getFloatingProps()}>
              <DropdownMenuContext
                value={{ closeMenu, getItemProps, activeIndex }}>
                <FloatingList elementsRef={elementsRef}>
                  {children}
                </FloatingList>
              </DropdownMenuContext>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </div>
  );
};

interface DropdownMenuItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  centered?: boolean;
}

const DropdownMenuItem = ({
  children,
  className,
  centered = false,
  onClick,
  ...rest
}: DropdownMenuItemProps) => {
  const { closeMenu, getItemProps, activeIndex } = use(DropdownMenuContext);
  const { ref, index } = useListItem();
  return (
    <button
      type='button'
      ref={ref}
      className={[styles.item, centered && styles.center, className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
      {...getItemProps({
        onClick: (event) => {
          closeMenu();
          onClick?.(event as React.MouseEvent<HTMLButtonElement>);
        },
      })}
      role='menuitem'
      tabIndex={activeIndex === index ? 0 : -1}>
      {children}
    </button>
  );
};

// Wraps a router Link (or any anchor-like child) with item styling and auto-close on click
interface DropdownMenuLinkProps {
  children: ReactNode;
  className?: string;
}

const DropdownMenuLink = ({ children, className }: DropdownMenuLinkProps) => {
  const { closeMenu, getItemProps, activeIndex } = use(DropdownMenuContext);
  const { ref, index } = useListItem();
  return (
    <div
      ref={ref}
      className={[styles.item, className].filter(Boolean).join(" ")}
      {...getItemProps({
        onClick: () => {
          closeMenu();
        },
        // The wrapper is the focusable menuitem; relay keyboard activation to
        // the inner anchor so Enter/Space navigates like a mouse click.
        onKeyDown: (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            closeMenu();
            event.currentTarget.querySelector("a")?.click();
          }
        },
      })}
      role='menuitem'
      tabIndex={activeIndex === index ? 0 : -1}>
      {children}
    </div>
  );
};

interface DropdownMenuLabelProps {
  children: ReactNode;
  className?: string;
}

const DropdownMenuLabel = ({ children, className }: DropdownMenuLabelProps) => (
  <span className={[styles.label, className].filter(Boolean).join(" ")}>
    {children}
  </span>
);

const DropdownMenuDivider = () => <div className={styles.divider} />;

export {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLink,
  DropdownMenuLabel,
  DropdownMenuDivider,
};
