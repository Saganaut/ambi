/**
 * Shared sortable shell for slide-editor rows that use `ItemCard` but need
 * slide-specific content. The grip is the only drag activator, so controls
 * inside the card remain independently interactive.
 */
import { useSortable } from "@dnd-kit/react/sortable";
import type { ReactNode } from "react";

import DragIcon from "@assets/icons/action/drag.svg?react";
import { ItemCard } from "../ItemCard";
import styles from "./SortableItemCard.module.css";

interface SortableItemCardProps {
  id: string;
  index: number;
  color: string;
  itemNoun: string;
  scored?: boolean;
  children: ReactNode;
}

const SortableItemCard = ({
  id,
  index,
  color,
  itemNoun,
  scored = false,
  children,
}: SortableItemCardProps) => {
  const { ref, handleRef, isDragging } = useSortable({ id, index });
  const displayIndex = index + 1;

  return (
    <div
      ref={ref}
      className={[styles.row, isDragging ? styles.dragging : ""].filter(Boolean).join(" ")}
      style={{ "--sortable-item-color": color } as React.CSSProperties}
    >
      <ItemCard index={index} tone={scored ? "success" : undefined} indexColor={color}>
        <span
          ref={handleRef}
          className={styles.grip}
          role="button"
          aria-label={`Reorder ${itemNoun} ${displayIndex.toString()}`}
        >
          <DragIcon className={styles.gripIcon} aria-hidden="true" />
        </span>
        {children}
      </ItemCard>
    </div>
  );
};

export { SortableItemCard };
export type { SortableItemCardProps };
