/** Anchors one portalled add-option action to an option-owned authoring region. */
import { type Placement, useMergeRefs } from "@floating-ui/react";
import {
  cloneElement,
  type HTMLAttributes,
  type ReactElement,
  type Ref,
  type SyntheticEvent,
  useRef,
} from "react";
import { FloatingPopover } from "@/shared/components/Popover/PopoverWrapper";
import { AddOptionButton } from "./AddOptionButton";

type AnchorProps = HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement> };

interface AddOptionPopoverProps {
  /** The option card, row, or label region whose geometry defines the affordance. */
  anchor: ReactElement;
  onAdd: () => void;
  placement?: Placement;
  offsetAmount?: number;
  /** Makes a non-interactive chart anchor reachable from the keyboard. */
  focusableAnchor?: boolean;
}

const composeEventHandlers =
  <Event extends SyntheticEvent<HTMLElement>>(
    anchorHandler: ((event: Event) => void) | undefined,
    floatingHandler: ((event: Event) => void) | undefined,
  ) =>
  (event: Event) => {
    anchorHandler?.(event);
    if (!event.defaultPrevented) floatingHandler?.(event);
  };

const editableDescendant = (event: SyntheticEvent<HTMLElement>) => {
  const target = event.target;
  return target instanceof Element && target !== event.currentTarget
    ? target.closest(
        'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]',
      )
    : null;
};

const AddOptionAnchor = ({
  anchor,
  floatingProps,
  focusableAnchor,
}: {
  anchor: ReactElement;
  floatingProps: AnchorProps;
  focusableAnchor: boolean;
}) => {
  const anchorProps = anchor.props as AnchorProps;
  const mergedRef = useMergeRefs<HTMLElement>([anchorProps.ref, floatingProps.ref]);
  // A touch focuses an editor before its click bubbles to this anchor. Keep
  // that interaction owned by the editor rather than opening the add action.
  const editablePointerTargetRef = useRef<Element | null>(null);

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    editablePointerTargetRef.current = editableDescendant(event);
    anchorProps.onPointerDown?.(event);
    if (!event.defaultPrevented) floatingProps.onPointerDown?.(event);
  };

  const handleFocus = (event: React.FocusEvent<HTMLElement>) => {
    anchorProps.onFocus?.(event);
    const focusFollowedEditablePointer =
      editablePointerTargetRef.current !== null &&
      event.target instanceof Node &&
      editablePointerTargetRef.current.contains(event.target);
    editablePointerTargetRef.current = null;
    if (!event.defaultPrevented && !focusFollowedEditablePointer) floatingProps.onFocus?.(event);
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    anchorProps.onClick?.(event);
    if (!event.defaultPrevented && editableDescendant(event) === null) {
      floatingProps.onClick?.(event);
    }
  };

  // eslint-disable-next-line react/no-clone-element -- compose the host anchor's existing ref and handlers.
  return cloneElement(anchor as ReactElement<AnchorProps>, {
    ...floatingProps,
    ref: mergedRef,
    tabIndex: focusableAnchor ? (anchorProps.tabIndex ?? 0) : anchorProps.tabIndex,
    onBlur: composeEventHandlers(anchorProps.onBlur, floatingProps.onBlur),
    onClick: handleClick,
    onFocus: handleFocus,
    onKeyDown: composeEventHandlers(anchorProps.onKeyDown, floatingProps.onKeyDown),
    onMouseEnter: composeEventHandlers(anchorProps.onMouseEnter, floatingProps.onMouseEnter),
    onMouseLeave: composeEventHandlers(anchorProps.onMouseLeave, floatingProps.onMouseLeave),
    onMouseMove: composeEventHandlers(anchorProps.onMouseMove, floatingProps.onMouseMove),
    onPointerDown: handlePointerDown,
    onPointerEnter: composeEventHandlers(anchorProps.onPointerEnter, floatingProps.onPointerEnter),
    onPointerLeave: composeEventHandlers(anchorProps.onPointerLeave, floatingProps.onPointerLeave),
  });
};

const AddOptionPopover = ({
  anchor,
  onAdd,
  placement = "right",
  offsetAmount = 8,
  focusableAnchor = false,
}: AddOptionPopoverProps) => (
  <FloatingPopover
    openOn="hover"
    placement={placement}
    offsetAmount={offsetAmount}
    aria-label="Add option"
    // Keep the editing control that opened this affordance focused while the
    // non-modal manager preserves logical tab order into the portal.
    initialFocus={-1}
    renderTrigger={(floatingProps) => (
      <AddOptionAnchor
        anchor={anchor}
        floatingProps={floatingProps}
        focusableAnchor={focusableAnchor}
      />
    )}
  >
    {({ ctx }) => (
      <div style={ctx.styles}>
        <AddOptionButton
          onClick={() => {
            onAdd();
            ctx.close();
          }}
        />
      </div>
    )}
  </FloatingPopover>
);

export { AddOptionPopover };
