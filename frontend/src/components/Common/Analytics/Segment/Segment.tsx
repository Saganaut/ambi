/**
 * Segmented pill control with proper tablist ARIA + keyboard navigation.
 *
 * Replaces the page-local <button role="tab"> + raw onClick markup that was
 * duplicated across analytics dashboards. Generic over the id type so
 * callers don't lose type safety on `(next: T) => void` handlers.
 *
 * Keyboard model matches Tabs: ←/→ wrap, Home/End jump to ends. Activation
 * is "follow focus" (selecting on arrow) — consistent with the rest of the
 * app and with WAI-ARIA's automatic-activation pattern for tabs whose
 * panels are cheap to switch.
 */
import { useRef, type KeyboardEvent, type ReactNode } from "react";

import styles from "./Segment.module.css";

interface SegmentItem<T extends string> {
  id: T;
  label: ReactNode;
  disabled?: boolean;
}

interface SegmentProps<T extends string> {
  items: SegmentItem<T>[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel?: string;
  className?: string;
}

const Segment = <T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentProps<T>) => {
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusIndex = (i: number) => {
    const len = items.length;
    if (len === 0) return;
    let attempt = ((i % len) + len) % len;
    let stepsLeft = len;
    while (items[attempt].disabled === true && stepsLeft > 0) {
      attempt = (attempt + 1) % len;
      stepsLeft--;
    }
    const next = items[attempt];
    if (next.disabled === true) return;
    onChange(next.id);
    btnRefs.current[attempt]?.focus();
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
    <div
      role='tablist'
      aria-label={ariaLabel}
      className={[styles.segment, className].filter(Boolean).join(" ")}>
      {items.map((item, idx) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            ref={(el) => {
              btnRefs.current[idx] = el;
            }}
            type='button'
            role='tab'
            aria-selected={selected}
            disabled={item.disabled === true}
            tabIndex={selected ? 0 : -1}
            className={styles.btn}
            onClick={() => {
              if (item.disabled !== true) onChange(item.id);
            }}
            onKeyDown={(e) => {
              handleKeyDown(e, idx);
            }}>
            {item.label}
          </button>
        );
      })}
    </div>
  );
};

export { Segment };
export type { SegmentProps, SegmentItem };
