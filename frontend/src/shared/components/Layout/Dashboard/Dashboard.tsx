import type { ReactNode } from "react";
import styles from "../Layout.module.css";
import { Body } from "./Body";
import { Canvas } from "./Canvas";
import { EndPanel } from "./EndPanel";
import { Header } from "./Header";
import { StartPanel } from "./StartPanel";
interface DashboardProps {
  children: ReactNode;
  className: string;
}

const Dashboard = ({ children, className }: DashboardProps) => {
  return <main className={`${styles.mainBodyDashboard} ${className}`}>{children}</main>;
};

Dashboard.Body = Body;
Dashboard.Header = Header;
Dashboard.StartPanel = StartPanel;
Dashboard.EndPanel = EndPanel;
Dashboard.Canvas = Canvas;

export { Dashboard };
