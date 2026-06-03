import type { ReactNode } from "react";
import styles from "./Layout.module.css";

interface MainBodyDashboardProps {
  children: ReactNode;
  className: string;
}

const MainBodyDashboard = ({ children, className }: MainBodyDashboardProps) => {
  return (
    <main className={`${styles.mainBodyDashboard} ${className}`}>
      {children}
    </main>
  );
};

export { MainBodyDashboard };
