import { useFullScreen } from "@/context/useFullScreen";
import type { ReactNode } from "react";
import styles from "./Layout.module.css";

interface CanvasHeaderProps {
  children: ReactNode;
  className?: string;
}

const CanvasHeader = ({ children, className }: CanvasHeaderProps) => {
  const { isFullScreen } = useFullScreen();
  return (
    <header
      className={`${styles.canvasHeader} ${isFullScreen ? styles.isCollapsed : " "} ${className}`}>
      {children}
    </header>
  );
};

export { CanvasHeader };
