import React, { type ReactNode } from "react";
import styles from "../Layout.module.css";
interface CanvasProps {
  children: ReactNode;
  className?: string;
}

const Canvas: React.FC<CanvasProps> = ({ className, children }) => {
  return <div className={` ${styles.innerDisplay} ${className} `}>{children}</div>;
};

export { Canvas };
