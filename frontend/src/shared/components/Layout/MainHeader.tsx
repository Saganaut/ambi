import React, { type ReactNode } from "react";
import styles from "./Layout.module.css";
import { useFullScreen } from "@/shared/hooks/useFullScreen";
interface MainHeaderProps {
  children: ReactNode;
  id?: string;
}

const MainHeader: React.FC<MainHeaderProps> = ({ id, children }) => {
  const { isFullScreen } = useFullScreen();
  return (
    <header
      id={id}
      className={`${styles.mainHeader} ${isFullScreen ? styles.isCollapsed : ""}`}>
      {children}
    </header>
  );
};

export { MainHeader };
