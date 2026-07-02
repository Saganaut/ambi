import { useFullScreen } from "@/shared/hooks/useFullScreen";
import React, { type ReactNode } from "react";
import styles from "./Layout.module.css";
interface HeaderProps {
  children: ReactNode;
  id?: string;
}

const Header: React.FC<HeaderProps> = ({ id, children }) => {
  const { isFullScreen } = useFullScreen();
  return (
    <header id={id} className={`${styles.mainHeader} ${isFullScreen ? styles.isCollapsed : ""}`}>
      {children}
    </header>
  );
};

export { Header };
