// Shape-matched loading placeholder. variant=text renders a baseline-height
// pill sized to mimic a text run; circle for avatars; rect for image/card
// blocks. Width/height accept CSS values so callers can size precisely.
import type { CSSProperties } from "react";
import styles from "./Skeleton.module.css";

interface SkeletonProps {
  variant?: "text" | "circle" | "rect";
  width?: string | number;
  height?: string | number;
  count?: number;
  className?: string;
}

const toCss = (v?: string | number) =>
  typeof v === "number" ? `${v.toString()}px` : v;

const Skeleton = ({
  variant = "text",
  width,
  height,
  count = 1,
  className,
}: SkeletonProps) => {
  const style = {
    width: toCss(width),
    height: toCss(height),
  } as CSSProperties;

  const lines = Array.from({ length: Math.max(1, count) });

  return (
    <span
      className={[styles.group, className].filter(Boolean).join(" ")}
      aria-hidden='true'>
      {lines.map((_, i) => (
        // Anonymous identical placeholder shapes; positional index IS the
        // stable identity here, not a derived field.
        <span
          // eslint-disable-next-line react-x/no-array-index-key
          key={i}
          className={[styles.skeleton, styles[variant]].join(" ")}
          style={style}
        />
      ))}
    </span>
  );
};

export { Skeleton };
