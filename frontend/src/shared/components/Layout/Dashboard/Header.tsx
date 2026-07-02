import { useFullScreen } from "@/shared/hooks/useFullScreen";
import type { ReactNode } from "react";
import styles from "../Layout.module.css";

interface HeaderProps {
  children: ReactNode;
  className?: string;
}

const Header = ({ children, className }: HeaderProps) => {
  const { isFullScreen } = useFullScreen();
  return (
    <header
      className={`${styles.canvasHeader} ${isFullScreen ? styles.isCollapsed : " "} ${className}`}
    >
      {children}
    </header>
  );
};

export { Header };
