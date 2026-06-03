// Monthly/annual toggle shown above the pricing grid. Stateless — owner page
// holds the selected cycle and re-renders cards with matching prices. Kept
// generic so it can later host extra cycles (e.g. "team annual") without
// rewriting the component.
import styles from "./BillingToggle.module.css";

type BillingCycle = "monthly" | "annual";

interface BillingToggleOption {
  value: BillingCycle;
  label: string;
  savingsLabel?: string;
}

interface BillingToggleProps {
  value: BillingCycle;
  options: BillingToggleOption[];
  onChange: (value: BillingCycle) => void;
}

const BillingToggle = ({ value, options, onChange }: BillingToggleProps) => {
  return (
    <div className={styles.toggle} role='radiogroup' aria-label='Billing cycle'>
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type='button'
            role='radio'
            aria-checked={isActive}
            onClick={() => {
              onChange(opt.value);
            }}
            className={[styles.option, isActive ? styles.active : ""]
              .filter(Boolean)
              .join(" ")}>
            {opt.label}
            {opt.savingsLabel != null && (
              <span className={styles.savings}>{opt.savingsLabel}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export { BillingToggle };
export type { BillingCycle, BillingToggleOption };
