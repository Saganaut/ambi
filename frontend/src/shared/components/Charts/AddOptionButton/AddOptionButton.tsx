// The chart-side "add option" affordance — the same hover-revealed "+" the
// default (no-chart) option cards offer. Its visible action is portalled by
// FloatingPopover so an option-card or chart canvas cannot clip it. Each host
// still owns the trigger's placement and hover reveal.
import { PlusIcon } from "@heroicons/react/24/outline";
import { type Placement } from "@floating-ui/react";
import { type HTMLProps } from "react";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { FloatingPopover } from "@/shared/components/Popover/PopoverWrapper";
import styles from "./AddOptionButton.module.css";

interface AddOptionButtonProps {
  onClick: () => void;
  className?: string;
  /** Floating-UI side for the portalled action. Defaults to the trigger's right. */
  placement?: Placement;
}

const AddOptionButton = ({ onClick, className, placement = "right" }: AddOptionButtonProps) => (
  <FloatingPopover
    openOn="hover"
    placement={placement}
    offsetAmount={8}
    aria-label="Add option"
    renderTrigger={(triggerProps) => (
      <IconBtn
        {...(triggerProps as HTMLProps<HTMLButtonElement>)}
        size="sm"
        shape="round"
        variant="success"
        aria-label="Add option"
        title="Add option"
        className={[styles.addOptionBtn, styles.trigger, className].filter(Boolean).join(" ")}
        onClick={onClick}
        icon={<PlusIcon className={styles.icon} aria-hidden="true" />}
      />
    )}
  >
    <IconBtn
      size="sm"
      shape="round"
      variant="success"
      aria-label="Add option"
      title="Add option"
      className={styles.addOptionBtn}
      onClick={onClick}
      icon={<PlusIcon className={styles.icon} aria-hidden="true" />}
    />
  </FloatingPopover>
);

export { AddOptionButton };
