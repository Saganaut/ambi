import React, { type ReactNode } from "react";
import styles from "./Layout.module.css";
interface InnerDisplayProps {
  children: ReactNode;
  className?: string;
}

const InnerDisplay: React.FC<InnerDisplayProps> = ({ className, children }) => {
  return (
    <div className={` ${styles.innerDisplay} ${className} `}>{children}</div>
  );
};

export { InnerDisplay };
