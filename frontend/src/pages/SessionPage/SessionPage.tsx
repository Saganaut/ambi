// CLAUDE NEVER MODIFY THIS FILE!
// THIS IS A PERFECT EXAMPLE OF HOW OUR PAGES SHOULD BE ORGANIZED

import { MainBodyDashboard } from "@/components/Layout/MainBodyDashboard";
import { CanvasHeader } from "@/components/Layout/CanvasHeader";
import { CanvasBody } from "@/components/Layout/CanvasBody";
import { InnerDisplay } from "@/components/Layout/InnerDisplay";
import { LeftSidebar } from "@/components/Layout/LeftSidebar";
import { RightSidebar } from "@/components/Layout/RightSidebar";
import { SessionBoard } from "@/components/Session/SessionBoard/SessionBoard";
import { SessionControls } from "@/components/Session/SessionControls/SessionControls";
import { SessionRoundTracker } from "@/components/Session/SessionRoundTracker/SessionRoundTracker";
import styles from "./SessionPage.module.css";
import { SessionHeader } from "@/components/Session/SessionHeader/SessionHeader";
import { SessionLeaderboard } from "@/components/Session/SessionLeaderboard/SessionLeaderboard";
import { SessionPlayerList } from "@/components/Session/SessionPlayerList/SessionPlayerList";
import { SessionChat } from "@/components/Session/SessionChat/SessionChat";
const SessionPage = () => {
  return (
    <MainBodyDashboard className={styles.sessionDashboard}>
      <CanvasHeader className={styles.header}>
        <SessionHeader />
      </CanvasHeader>
      <CanvasBody className={styles.body}>
        <LeftSidebar className={styles.leftSidebar}>
          <SessionRoundTracker />
        </LeftSidebar>
        <InnerDisplay className={styles.innerDisplay}>
          <SessionBoard className={styles.sessionBoard} />
          <SessionControls className={styles.sessionControls} />
        </InnerDisplay>
        <RightSidebar className={styles.rightSidebar}>
          <SessionLeaderboard />
          <SessionPlayerList />
          <SessionChat />
        </RightSidebar>
      </CanvasBody>
    </MainBodyDashboard>
  );
};

export { SessionPage };
