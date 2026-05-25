// Reusable bullet list of plan features. Used inside PricingCard and anywhere
// else a tier's capabilities need to be enumerated (e.g. an account upgrade
// modal). Items can be marked `included: false` to render as a "not in this
// tier" line without rearranging the list.
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/solid";
import styles from "./FeatureList.module.css";

interface FeatureItem {
  label: string;
  included?: boolean;
}

interface FeatureListProps {
  items: FeatureItem[];
}

const FeatureList = ({ items }: FeatureListProps) => {
  return (
    <ul className={styles.list}>
      {items.map((item) => {
        const included = item.included ?? true;
        return (
          <li
            key={item.label}
            className={[styles.item, included ? "" : styles.muted]
              .filter(Boolean)
              .join(" ")}>
            <span className={styles.icon} aria-hidden='true'>
              {included ? (
                <CheckIcon width={12} height={12} />
              ) : (
                <XMarkIcon width={12} height={12} />
              )}
            </span>
            <span className={styles.label}>{item.label}</span>
          </li>
        );
      })}
    </ul>
  );
};

export { FeatureList };
export type { FeatureItem };
