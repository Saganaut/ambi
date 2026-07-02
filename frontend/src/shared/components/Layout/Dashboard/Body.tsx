import { useFullScreen } from "@/shared/hooks/useFullScreen";
import React, { type ReactNode } from "react";
import styles from "../Layout.module.css";

interface BodyProps {
  children: ReactNode;
  className?: string;
}

const Body: React.FC<BodyProps> = ({ className, children }) => {
  const { isFullScreen } = useFullScreen();
  return (
    <div className={`${styles.canvasBody} ${isFullScreen ? styles.isCollapsed : " "} ${className}`}>
      {children}
    </div>
  );
};

export { Body };
