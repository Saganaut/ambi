// CLAUDE NEVER MODIFY THIS FILE!
// THIS IS A PERFECT EXAMPLE OF HOW OUR PAGES SHOULD BE ORGANIZED

import { Dashboard } from "@/shared/components/Layout/Dashboard/Dashboard";
import { SessionBoard } from "../../components/SessionBoard/SessionBoard";
import { SessionChat } from "../../components/SessionChat/SessionChat";
import { SessionControls } from "../../components/SessionControls/SessionControls";
import { SessionHeader } from "../../components/SessionHeader/SessionHeader";
import { SessionLeaderboard } from "../../components/SessionLeaderboard/SessionLeaderboard";
import { SessionPlayerList } from "../../components/SessionPlayerList/SessionPlayerList";
import { SessionRoundTracker } from "../../components/SessionRoundTracker/SessionRoundTracker";
import styles from "./SessionPage.module.css";

const SessionPage = () => {
  return (
    <Dashboard className={styles.sessionDashboard}>
      <Dashboard.Header className={styles.header}>
        <SessionHeader />
      </Dashboard.Header>
      <Dashboard.Body className={styles.body}>
        <Dashboard.StartPanel className={styles.leftSidebar}>
          <SessionRoundTracker />
        </Dashboard.StartPanel>
        <Dashboard.Canvas className={styles.innerDisplay}>
          <SessionBoard className={styles.sessionBoard} />
          <SessionControls className={styles.sessionControls} />
        </Dashboard.Canvas>
        <Dashboard.EndPanel className={styles.rightSidebar}>
          <SessionLeaderboard />
          <SessionPlayerList />
          <SessionChat />
        </Dashboard.EndPanel>
      </Dashboard.Body>
    </Dashboard>
  );
};

export { SessionPage };
