/** Renders the consistent visual treatment for an option-add action. */
import { PlusIcon } from "@heroicons/react/24/outline";
import { IconBtn } from "@ui/Buttons/IconBtn";
import styles from "./AddOptionButton.module.css";

interface AddOptionButtonProps {
  onClick: () => void;
  className?: string;
}

const AddOptionButton = ({ onClick, className }: AddOptionButtonProps) => (
  <IconBtn
    size="sm"
    shape="round"
    variant="success"
    aria-label="Add option"
    title="Add option"
    className={[styles.addOptionBtn, className].filter(Boolean).join(" ")}
    onClick={onClick}
    icon={<PlusIcon className={styles.icon} aria-hidden="true" />}
  />
);

export { AddOptionButton };
