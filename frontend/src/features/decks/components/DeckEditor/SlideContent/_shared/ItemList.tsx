// Vertical stack of `ItemCard`s capped by an inline "Add" affordance. Owns
// the empty/at-max states so each slide editor just supplies the cards.
import type { ReactNode } from "react";
import { PlusIcon } from "@heroicons/react/24/solid";
import styles from "./_shared.module.css";

interface ItemListProps {
  children: ReactNode;
  addLabel: string;
  canAdd: boolean;
  onAdd: () => void;
}

const ItemList = ({ children, addLabel, canAdd, onAdd }: ItemListProps) => {
  return (
    <div className={styles.itemList}>
      {children}
      <button
        type='button'
        className={styles.addItemRow}
        onClick={onAdd}
        disabled={!canAdd}>
        <PlusIcon className={styles.addItemIcon} />
        <span>{addLabel}</span>
      </button>
    </div>
  );
};

export { ItemList };
