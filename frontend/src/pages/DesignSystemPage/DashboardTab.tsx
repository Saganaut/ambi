// Dashboard components tab: game-loop primitives (scoreboard, question card,
// vote panel, slide view, charts, review panel). Owns its own state for the
// roundResult demo and inlines WsErrorBannerDemo since it's only used here.
import { useEffect, useState } from "react";
import styles from "./DesignSystem.module.css";
import { Accordion } from "../../components/Containers/Accordion";
import { Btn } from "../../components/Common/Buttons/Btn";
import { Leaderboard } from "../../components/Leaderboard/Leaderboard";
import { ScoreBoard } from "../../components/Games/ScoreBoard/ScoreBoard";
import { RoundResult } from "../../components/Games/RoundResult/RoundResult";
import { RoundDataView } from "../../components/Games/RoundDataView/RoundDataView";
import { SessionSummary } from "../../components/Games/SessionSummary/SessionSummary";
import { QuestionCard } from "../../components/Games/QuestionCard/QuestionCard";
import { TextAnswerInput } from "../../components/Games/TextAnswerInput/TextAnswerInput";
import { VotePanel } from "../../components/Games/VotePanel/VotePanel";
import { SlideView } from "../../components/Games/SlideView/SlideView";
import { WsErrorBanner } from "../../components/Games/WsErrorBanner/WsErrorBanner";
import { GameOver } from "../../components/Games/GameOver/GameOver";
import { BarChart } from "../../components/Common/Charts/BarChart/BarChart";
import { FrequencyList } from "../../components/Common/Charts/FrequencyList/FrequencyList";
import { ReviewPanel } from "../../components/Games/ReviewPanel/ReviewPanel";
import { ContentDeckPicker } from "../../components/Games/ContentDeckPicker/ContentDeckPicker";
import { PlayerInfo } from "../../components/PlayerInfo/PlayerInfo";
import { useAppDispatch } from "../../store/hooks";
import { wsErrorReceived } from "../../store/interactiveSessionSlice";
import {
  gameOverData,
  playersData,
  questionCardData,
  RoundResultData,
} from "./data";
import { reviewSampleData } from "./reviewSampleData";

const WsErrorBannerDemo = () => {
  const dispatch = useAppDispatch();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}>
      <WsErrorBanner />
      <Btn
        onClick={() => {
          dispatch(
            wsErrorReceived({
              operation: "start",
              roomCode: "DEMO00",
              status: 422,
              message: "Content deck has no questions",
            }),
          );
        }}>
        Trigger sample error
      </Btn>
    </div>
  );
};

const DashboardTab = () => {
  const [roundResultIsOpen, setRoundResultIsOpen] = useState(false);
  const [roundDataViewIsOpen, setRoundDataViewIsOpen] = useState(false);

  useEffect(() => {
    if (roundResultIsOpen) {
      const timer = setTimeout(() => {
        setRoundResultIsOpen(false);
      }, 2000);
      return () => {
        clearTimeout(timer);
      };
    }
    return undefined;
  }, [roundResultIsOpen]);

  useEffect(() => {
    if (roundDataViewIsOpen) {
      const timer = setTimeout(() => {
        setRoundDataViewIsOpen(false);
      }, 3000);
      return () => {
        clearTimeout(timer);
      };
    }
    return undefined;
  }, [roundDataViewIsOpen]);

  return (
    <section>
      <div className={styles.sectionTitle}>Game Components</div>
      <div className={styles.examplesContainer}>
        <Accordion titleBar='Scoring'>
          <div className={styles.cardComponentContainer}>
            <Leaderboard />
            <ScoreBoard
              players={playersData.players}
              currentPlayerId={playersData.currentPlayerId}
            />
            <ScoreBoard
              players={playersData.players}
              currentPlayerId={playersData.currentPlayerId}
              answeredPlayerIds={playersData.players
                .slice(0, Math.ceil(playersData.players.length / 2))
                .map((p) => p.playerId)
                .filter(Boolean)}
              offlinePlayerIds={playersData.players
                .slice(-1)
                .map((p) => p.playerId)
                .filter(Boolean)}
              isHost
              onBootPlayer={(pid) => {
                console.log("boot demo:", pid);
              }}
            />

            <Btn
              onClick={() => {
                setRoundResultIsOpen(!roundResultIsOpen);
              }}>
              Trigger Round Result
            </Btn>

            {roundResultIsOpen && (
              <RoundResult
                result={RoundResultData}
                isHost={true}
                isTurnBased={false}
                onNextRound={() => {
                  console.log("next round");
                }}
              />
            )}
            <GameOver {...gameOverData} />
          </div>
        </Accordion>
        <Accordion titleBar='Question card'>
          <div className={styles.cardComponentContainer}>
            <QuestionCard {...questionCardData} />
          </div>
        </Accordion>
        <Accordion titleBar='Text answer input (TEXT_INPUT gameplay)'>
          <div className={styles.cardComponentContainer}>
            <TextAnswerInput
              questionId='design-system-text'
              submittedAnswer={null}
              onSubmit={(answer) => {
                console.log("text answer:", answer);
              }}
              disabled={false}
            />
          </div>
        </Accordion>
        <Accordion titleBar='Vote panel (Best Answer VOTE phase)'>
          <div className={styles.cardComponentContainer}>
            <VotePanel
              element={{
                kind: "TextQuestion",
                id: "design-system-ba",
                prompt: "Coin a new name for our Mars colony.",
                pointValue: 0,
                difficulty: "EASY",
                caseSensitive: false,
                chrome: {
                  bestAnswerMode: true,
                  bestAnswerPoints: 100,
                  displaySeconds: 30,
                  mediaPosition: "NONE",
                },
              }}
              submissions={[
                {
                  submissionId: "s1",
                  payload: { kind: "TextAnswer", text: "New Phobos" },
                },
                {
                  submissionId: "s2",
                  payload: { kind: "TextAnswer", text: "Olympus Prime" },
                },
                {
                  submissionId: "s3",
                  payload: { kind: "TextAnswer", text: "Red Haven" },
                },
              ]}
              myVote={null}
              totalPlayers={4}
              votedCount={2}
              timeRemaining={18}
              unlimited={false}
              onVote={(id) => {
                console.log("vote demo:", id);
              }}
            />
          </div>
        </Accordion>
        <Accordion titleBar='Slide view (SLIDE element gameplay)'>
          <div className={styles.cardComponentContainer}>
            <SlideView
              round={2}
              totalRounds={10}
              timeRemaining={4}
              slide={{
                kind: "Slide",
                id: "design-system-slide",
                slideKind: "SECTION",
                body: "Now we'll switch from geography to paintings, plays, and the past.",
                chrome: {
                  title: "Section 2 — Arts & History",
                  displaySeconds: 5,
                  mediaPosition: "NONE",
                },
              }}
            />
          </div>
        </Accordion>
        <Accordion titleBar='WebSocket error banner'>
          <div className={styles.cardComponentContainer}>
            <WsErrorBannerDemo />
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
        <Accordion titleBar='Review panel (post-interactiveSession)'>
          <div className={styles.cardComponentContainer}>
            <ReviewPanel review={reviewSampleData} />
          </div>
        </Accordion>
        <Accordion titleBar='Round data view (chunk 24, PRESENTATION round-end)'>
          <div className={styles.cardComponentContainer}>
            <Btn
              onClick={() => {
                setRoundDataViewIsOpen(!roundDataViewIsOpen);
              }}>
              Trigger Round Data View
            </Btn>
            {roundDataViewIsOpen && (
              <RoundDataView
                result={RoundResultData}
                isHost
                isTurnBased={false}
                onNextRound={() => {
                  console.log("next round (presentation)");
                }}
              />
            )}
          </div>
        </Accordion>
        <Accordion titleBar='Session summary (chunk 24, PRESENTATION end screen)'>
          <div className={styles.cardComponentContainer}>
            <SessionSummary
              roomCode='DEMO00'
              summary={{
                roundsPlayed: 1,
                anyScoringEnabled: true,
                rounds: [
                  {
                    roundIndex: 0,
                    element: RoundResultData.element,
                    aggregatedPayloads: [
                      { kind: "McqAnswer", optionIds: ["opt-9"] },
                      { kind: "McqAnswer", optionIds: ["opt-9"] },
                      { kind: "McqAnswer", optionIds: ["opt-9"] },
                      { kind: "McqAnswer", optionIds: ["opt-1"] },
                      { kind: "McqAnswer", optionIds: ["opt-12"] },
                    ],
                  },
                ],
              }}
            />
          </div>
        </Accordion>
        <Accordion titleBar='Content Deck Picker'>
          <div className={styles.cardComponentContainer}>
            <ContentDeckPicker
              selectedDeckId={"1"}
              onSelect={() => {
                console.log("selected 1");
              }}
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
