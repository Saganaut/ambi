import React, { type ReactNode } from "react";
import styles from "./Layout.module.css";
interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return <div className={styles.mainLayout}>{children}</div>;
};

export { Layout };
