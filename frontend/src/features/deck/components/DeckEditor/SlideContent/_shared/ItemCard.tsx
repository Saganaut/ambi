// One row in a slide editor's item list — a generic "card" of an editable
// entity (statement, ranking item, allocation option, etc.). The card draws
// the index pill, slots its body, and renders optional action buttons (most
// commonly a "remove" trash icon). Mirrors the visual weight of the
// McqOptionEditable card but in a single horizontal row, since these
// editors deal in many simple items rather than 4-6 visual options.
import type { ReactNode } from "react";
import { MinusIcon } from "@heroicons/react/24/outline";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { IndexPill } from "./IndexPill";
import styles from "./_shared.module.css";

interface ItemCardProps {
  index: number;
  active?: boolean;
  /** The editable body (typically one or more inputs). */
  children: ReactNode;
  /** Extra action buttons rendered to the right of the body, before remove. */
  actions?: ReactNode;
  /** Aria label for the remove button — required for accessibility. */
  removeLabel: string;
  onRemove?: () => void;
  removeDisabled?: boolean;
}

const ItemCard = ({
  index,
  active = false,
  children,
  actions,
  removeLabel,
  onRemove,
  removeDisabled = false,
}: ItemCardProps) => {
  return (
    <div
      className={[styles.itemCard, active ? styles.itemCardActive : ""]
        .filter(Boolean)
        .join(" ")}>
      <IndexPill value={index + 1} />
      <div className={styles.itemBody}>{children}</div>
      <div className={styles.itemActions}>
        {actions}
        {onRemove && (
          <IconBtn
            fill='ghost'
            size='xs'
            icon={<MinusIcon />}
            aria-label={removeLabel}
            disabled={removeDisabled}
            onClick={onRemove}
          />
        )}
      </div>
    </div>
  );
};

export { ItemCard };
