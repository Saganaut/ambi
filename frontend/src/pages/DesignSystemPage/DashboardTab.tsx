// Dashboard components tab. The game-loop primitives (scoreboard, question
// card, vote panel, slide view, round result/data, session summary, review
// panel, content deck picker, ws-error banner) previously showcased here lived
// in the `@components/Games` tree, which was removed for the element→slide /
// liveSession migration. TODO(migration): restore those accordions once the
// games UI returns. Only the still-present primitives are shown for now.
import styles from "./DesignSystem.module.css";
import { Accordion } from "@components/Containers/Accordion";
import { Leaderboard } from "@components/Leaderboard/Leaderboard";
import { BarChart } from "@deck/components/Charts/BarChart/BarChart";
import { FrequencyList } from "@deck/components/Charts/FrequencyList/FrequencyList";
import { PlayerInfo } from "@components/PlayerInfo/PlayerInfo";

const DashboardTab = () => {
  return (
    <section>
      <div className={styles.sectionTitle}>Game Components</div>
      <div className={styles.examplesContainer}>
        <Accordion titleBar='Scoring'>
          <div className={styles.cardComponentContainer}>
            <Leaderboard />
          </div>
        </Accordion>
        <Accordion titleBar='Bar chart'>
          <div className={styles.cardComponentContainer}>
            <BarChart
              caption='Sample MCQ distribution'
              total={6}
              items={[
                { label: "A — Venus", value: 1 },
                { label: "B — Jupiter", value: 0 },
                { label: "C — Mars", value: 4, highlight: true },
                { label: "D — Saturn", value: 1 },
              ]}
            />
          </div>
        </Accordion>
        <Accordion titleBar='Frequency list'>
          <div className={styles.cardComponentContainer}>
            <FrequencyList
              caption='Sample text-input submissions'
              total={6}
              items={[
                { text: "Paris", count: 4, correct: true },
                { text: "paris", count: 1, correct: true },
                { text: "Lyon", count: 1 },
              ]}
            />
          </div>
        </Accordion>
        <Accordion titleBar='Player Info'>
          <div className={styles.cardComponentContainer}>
            <PlayerInfo />
          </div>
        </Accordion>
      </div>
    </section>
  );
};

export { DashboardTab };
