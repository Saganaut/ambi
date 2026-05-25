import React, { type ReactNode } from "react";
import styles from "./Layout.module.css";
import { useFullScreen } from "@/context/useFullScreen";

interface CanvasBodyProps {
  children: ReactNode;
  className?: string;
}

const CanvasBody: React.FC<CanvasBodyProps> = ({ className, children }) => {
  const { isFullScreen } = useFullScreen();
  return (
    <div
      className={`${styles.canvasBody} ${isFullScreen ? styles.isCollapsed : " "} ${className}`}>
      {children}
    </div>
  );
};

export { CanvasBody };
