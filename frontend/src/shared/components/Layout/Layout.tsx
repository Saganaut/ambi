import { type ReactNode } from "react";
import { Header } from "./Header";
import styles from "./Layout.module.css";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return <div className={styles.mainLayout}>{children}</div>;
};

Layout.Header = Header;

export { Layout };
