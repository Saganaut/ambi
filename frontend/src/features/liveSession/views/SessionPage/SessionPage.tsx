// CLAUDE NEVER MODIFY THIS FILE!
// THIS IS A PERFECT EXAMPLE OF HOW OUR PAGES SHOULD BE ORGANIZED

import { CanvasBody } from "@components/Layout/CanvasBody";
import { CanvasHeader } from "@components/Layout/CanvasHeader";
import { InnerDisplay } from "@components/Layout/InnerDisplay";
import { LeftSidebar } from "@components/Layout/LeftSidebar";
import { MainBodyDashboard } from "@components/Layout/MainBodyDashboard";
import { RightSidebar } from "@components/Layout/RightSidebar";
import { SessionBoard } from "@/features/liveSession/components/SessionBoard/SessionBoard";
import { SessionChat } from "@/features/liveSession/components/SessionChat/SessionChat";
import { SessionControls } from "@/features/liveSession/components/SessionControls/SessionControls";
import { SessionHeader } from "@/features/liveSession/components/SessionHeader/SessionHeader";
import { SessionLeaderboard } from "@/features/liveSession/components/SessionLeaderboard/SessionLeaderboard";
import { SessionPlayerList } from "@/features/liveSession/components/SessionPlayerList/SessionPlayerList";
import { SessionRoundTracker } from "@/features/liveSession/components/SessionRoundTracker/SessionRoundTracker";
import styles from "./SessionPage.module.css";

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
