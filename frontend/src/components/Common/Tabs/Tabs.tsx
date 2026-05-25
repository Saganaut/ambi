// Tablist with proper ARIA wiring. Caller provides labelled items + a
// controlled `value` (id of the active panel). Pressing ←/→ on a focused tab
// moves focus + selection. Tab content is rendered as the children of the
// matching item — every tab's content is mounted but only the active one is
// visible (avoids losing local state when switching tabs).
import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import styles from "./Tabs.module.css";

interface TabsItem {
  id: string;
  label: ReactNode;
  panel: ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  items: TabsItem[];
  value: string;
  onChange: (id: string) => void;
  variant?: "underline" | "pill";
  className?: string;
  ariaLabel?: string;
}

const Tabs = ({
  items,
  value,
  onChange,
  variant = "underline",
  className,
  ariaLabel,
}: TabsProps) => {
  const baseId = useId();
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const focusIndex = (i: number) => {
    const len = items.length;
    if (len === 0) return;
    const base = ((i % len) + len) % len;
    let attempt = base;
    let stepsLeft = len;
    while (items[attempt].disabled === true && stepsLeft > 0) {
      attempt = (attempt + 1) % len;
      stepsLeft--;
    }
    onChange(items[attempt].id);
    tabsRef.current[attempt]?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent, idx: number) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      focusIndex(idx + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusIndex(idx - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusIndex(items.length - 1);
    }
  };

  return (
    <div className={[styles.tabs, className].filter(Boolean).join(" ")}>
      <div
        role='tablist'
        aria-label={ariaLabel}
        className={[styles.tablist, styles[variant]].join(" ")}>
        {items.map((item, idx) => {
          const selected = item.id === value;
          const tabId = `${baseId}-tab-${item.id}`;
          const panelId = `${baseId}-panel-${item.id}`;
          return (
            <button
              key={item.id}
              type='button'
              role='tab'
              id={tabId}
              ref={(el) => {
                tabsRef.current[idx] = el;
              }}
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              disabled={item.disabled}
              className={[styles.tab, selected ? styles.selected : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                if (!item.disabled) onChange(item.id);
              }}
              onKeyDown={(e) => {
                handleKeyDown(e, idx);
              }}>
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => {
        const tabId = `${baseId}-tab-${item.id}`;
        const panelId = `${baseId}-panel-${item.id}`;
        const selected = item.id === value;
        return (
          <div
            key={item.id}
            role='tabpanel'
            id={panelId}
            aria-labelledby={tabId}
            hidden={!selected}
            className={styles.panel}>
            {item.panel}
          </div>
        );
      })}
    </div>
  );
};

export { Tabs };
export type { TabsItem };
