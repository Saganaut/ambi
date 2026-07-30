import styles from "./IndexPill.module.css";

interface IndexPillProps {
  value: number | string;
  variant?: "solid" | "bare" | "square";
  color?: string;
}

const IndexPill = ({ value, variant = "solid", color }: IndexPillProps) => {
  return (
    <span
      className={[styles.indexPill, styles[variant], color ? styles.tinted : ""]
        .filter(Boolean)
        .join(" ")}
      style={color ? ({ "--background-color": color } as React.CSSProperties) : undefined}
    >
      {value}
    </span>
  );
};

export { IndexPill };
