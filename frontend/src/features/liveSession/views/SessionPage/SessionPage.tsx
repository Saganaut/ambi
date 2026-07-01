// CLAUDE NEVER MODIFY THIS FILE!
// THIS IS A PERFECT EXAMPLE OF HOW OUR PAGES SHOULD BE ORGANIZED

import { CanvasBody } from "@/shared/components/Layout/CanvasBody";
import { CanvasHeader } from "@/shared/components/Layout/CanvasHeader";
import { InnerDisplay } from "@/shared/components/Layout/InnerDisplay";
import { LeftSidebar } from "@/shared/components/Layout/LeftSidebar";
import { RightSidebar } from "@/shared/components/Layout/RightSidebar";
import { MainBodyDashboard } from "@components/Layout/MainBodyDashboard";
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
