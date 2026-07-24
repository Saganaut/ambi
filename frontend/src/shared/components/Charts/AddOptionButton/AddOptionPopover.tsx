/** Anchors one portalled add-option action to an option-owned authoring region. */
import { type Placement, useMergeRefs } from "@floating-ui/react";
import {
  cloneElement,
  type HTMLAttributes,
  type ReactElement,
  type Ref,
  type SyntheticEvent,
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

  // eslint-disable-next-line react/no-clone-element -- compose the host anchor's existing ref and handlers.
  return cloneElement(anchor as ReactElement<AnchorProps>, {
    ...floatingProps,
    ref: mergedRef,
    tabIndex: focusableAnchor ? (anchorProps.tabIndex ?? 0) : anchorProps.tabIndex,
    onBlur: composeEventHandlers(anchorProps.onBlur, floatingProps.onBlur),
    onClick: composeEventHandlers(anchorProps.onClick, floatingProps.onClick),
    onFocus: composeEventHandlers(anchorProps.onFocus, floatingProps.onFocus),
    onKeyDown: composeEventHandlers(anchorProps.onKeyDown, floatingProps.onKeyDown),
    onMouseEnter: composeEventHandlers(anchorProps.onMouseEnter, floatingProps.onMouseEnter),
    onMouseLeave: composeEventHandlers(anchorProps.onMouseLeave, floatingProps.onMouseLeave),
    onMouseMove: composeEventHandlers(anchorProps.onMouseMove, floatingProps.onMouseMove),
    onPointerDown: composeEventHandlers(anchorProps.onPointerDown, floatingProps.onPointerDown),
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
