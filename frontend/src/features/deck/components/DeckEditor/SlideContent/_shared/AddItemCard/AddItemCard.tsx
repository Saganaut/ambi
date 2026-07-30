/**
 * The "Add" affordance that closes an item list — the row-list counterpart of
 * MCQ's `CanAddOptionCard`. It is itself a row: each editor renders it as the
 * last child of its list, after the mapped rows.
 *
 * At the list's cap the row stays in place but goes inert, so the stack never
 * changes height — the call site supplies the "Maximum N …" wording alongside
 * `disabled`.
 */
import { PlusIcon } from "@heroicons/react/24/solid";

import styles from "./AddItemCard.module.css";

interface AddItemCardProps {
  /** Row text — the "Add …" invitation, or the cap notice once disabled. */
  label: string;
  onAdd: () => void;
  disabled?: boolean;
}

const AddItemCard = ({ label, onAdd, disabled = false }: AddItemCardProps) => {
  return (
    <button type="button" className={styles.addItemRow} onClick={onAdd} disabled={disabled}>
      <PlusIcon className={styles.addItemIcon} />
      <span>{label}</span>
    </button>
  );
};

export { AddItemCard };
