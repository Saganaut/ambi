// Reusable 1-5 star rating widget with two modes:
//   - "display" — read-only, supports fractional values (e.g. 4.3) via a
//     clipped overlay of solid stars on top of outline stars.
//   - "input"   — interactive. Click a star to set the value; clear with the
//     "Clear" affordance. Keyboard: arrow keys to nudge, Home/End to bound,
//     0..5 number keys to jump directly.
//
// The widget owns no value itself — it always reflects whatever its `value`
// prop says. Callers that want optimistic feedback can do that in their own
// state and feed it back here on the next render.
import { useId } from "react";
import { StarIcon as StarOutline } from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import styles from "./StarRating.module.css";

interface StarRatingProps {
  value: number | null | undefined;
  mode?: "display" | "input";
  size?: "sm" | "md" | "lg";
  onChange?: (next: number) => void;
  onClear?: () => void;
  label?: string;
  // When provided in display mode, renders alongside the stars so a single
  // component can carry "4.3 (52)"-style summaries without an outer wrapper.
  ratingCount?: number;
  showValue?: boolean;
}

const STARS = [1, 2, 3, 4, 5];

const StarRating = ({
  value,
  mode = "display",
  size = "md",
  onChange,
  onClear,
  label,
  ratingCount,
  showValue = false,
}: StarRatingProps) => {
  const groupId = useId();
  const safeValue = clamp(value ?? 0, 0, 5);
  const isInput = mode === "input";

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isInput || !onChange) return;
    const current = Math.round(safeValue);
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowDown":
        e.preventDefault();
        if (current > 1) onChange(current - 1);
        else if (current === 1 && onClear) onClear();
        break;
      case "ArrowRight":
      case "ArrowUp":
        e.preventDefault();
        if (current < 5) onChange(Math.max(1, current + 1));
        break;
      case "Home":
        e.preventDefault();
        onChange(1);
        break;
      case "End":
        e.preventDefault();
        onChange(5);
        break;
      default:
        if (/^[0-5]$/.test(e.key)) {
          e.preventDefault();
          const n = Number(e.key);
          if (n === 0 && onClear) onClear();
          else if (n >= 1) onChange(n);
        }
    }
  };

  // Solid overlay width as a percentage of the full row; clipping makes the
  // partial fill render correctly even when individual stars don't perfectly
  // line up with whole-number values.

  return (
    <div
      className={[styles.root, styles[sizeClass(size)]]
        .filter(Boolean)
        .join(" ")}
      role={isInput ? "radiogroup" : "img"}
      aria-label={label ?? formatAriaLabel(safeValue, isInput)}
      tabIndex={isInput ? 0 : undefined}
      onKeyDown={isInput ? handleKeyDown : undefined}>
      <div className={styles.stars} aria-hidden={true}>
        <div className={styles.outlineRow}>
          {STARS.map((n, index) =>
            index + 1 > safeValue ? (
              <StarOutline key={`o-${groupId}-${n}`} className={styles.icon} />
            ) : (
              <StarSolid key={`s-${groupId}-${n}`} className={styles.icon} />
            ),
          )}

          {isInput && (
            <div className={styles.hitRow}>
              {STARS.map((n) => (
                <button
                  key={`h-${groupId}-${n}`}
                  type='button'
                  role='radio'
                  aria-checked={Math.round(safeValue) === n}
                  aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
                  className={styles.hit}
                  onClick={() => onChange?.(n)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {showValue && safeValue > 0 && (
        <span className={styles.value}>
          {safeValue.toFixed(1)}
          {ratingCount != null && (
            <span className={styles.count}> ({ratingCount})</span>
          )}
        </span>
      )}
      {isInput && safeValue > 0 && onClear && (
        <button
          type='button'
          className={styles.clear}
          onClick={onClear}
          aria-label='Clear rating'>
          Clear
        </button>
      )}
    </div>
  );
};

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

const sizeClass = (size: "sm" | "md" | "lg") =>
  size === "sm" ? "sizeSm" : size === "lg" ? "sizeLg" : "sizeMd";

const formatAriaLabel = (value: number, isInput: boolean) => {
  if (isInput) return `Rate ${value.toFixed(0)} out of 5 stars`;
  return `${value.toFixed(1)} out of 5 stars`;
};

export { StarRating };
