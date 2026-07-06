// The chart-side "add option" affordance — the same hover-revealed "+" the
// default (no-chart) option cards offer, restyled to sit inside a chart. Each
// chart renders it in the spot that suits its geometry (ghost row under the
// bars, extra legend entry, corner of the plot) and owns the hover-reveal via
// its `.chart:hover` scope; this component only carries the button itself so
// the affordance looks identical everywhere.
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
