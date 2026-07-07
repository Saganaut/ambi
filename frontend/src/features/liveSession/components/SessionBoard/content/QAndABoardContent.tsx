// Q&A presentation + submission surface for the board. Never scored; one
// component covers every moment, switched by `mode`:
//   - prompt      → participants type and send questions (several each, up to the
//                   slide's per-player cap); the shared list stays hidden, so each
//                   device shows only its own sent questions as a local echo.
//   - liveResults → the shared question list is on screen, updating live as
//                   submissions arrive; participants can keep asking.
//   - results     → the list is frozen for reading (submissions are closed
//                   server-side); the host can still type answers.
//
// The host sees an inline "Answer"/"Edit" affordance on every row and types the
// answer next to the question (sendHostAnswer; blank clears). Askers' names come
// from the roster; an anonymised round carries no participantId and rows read
// "Anonymous". The list itself arrives via the `qAndAQuestions` read-model slice
// (seeded from the snapshot, patched by `QAndAUpdated`).
import { useEffect, useMemo, useState } from "react";
import type { SlideView } from "../../../store/liveSessionApi.gen";
import { liveSessionValidation } from "../../../store/liveSessionValidationConstants";
import { useLiveSessionQuery } from "@/features/liveSession/hooks/useLiveSessionQuery";
import { useSessionConnection } from "@/features/liveSession/views/SessionPage/SessionConnectionContext";
import { WordCloud } from "@/shared/components/Charts/WordCloud/WordCloud";
import { wordFrequencies } from "@/shared/components/Charts/adapters/words";
import type { BoardQuestionMode } from "../resolveBoardStage";
import { Btn } from "@ui/Buttons/Btn";
import styles from "./QAndABoardContent.module.css";

/** How the revealed submissions render on the board. */
type QAndADisplay = "list" | "cloud";

const QUESTION_MAX_LENGTH = liveSessionValidation.QAndAAnswer.question.maxLength;

interface QAndABoardContentProps {
  slide: SlideView;
  mode: BoardQuestionMode;
  interactive: boolean;
}

const QAndABoardContent = ({ slide, mode, interactive }: QAndABoardContentProps) => {
  const slideId = slide.id ?? "";
  const { sendAnswer, sendHostAnswer } = useSessionConnection();
  const { qAndAQuestions, participants, viewerParticipantId, viewerIsHost } =
    useLiveSessionQuery();

  // Compose state is round-local: cleared whenever the round (slide) changes.
  // `sentTexts` is this device's own echo — on an anonymised round the server
  // list carries no participantId, so "what did I ask" can only be local.
  const [draft, setDraft] = useState("");
  const [sentTexts, setSentTexts] = useState<string[]>([]);
  // Per-device view preference for the revealed submissions (list vs cloud).
  const [display, setDisplay] = useState<QAndADisplay>("list");
  useEffect(() => {
    setDraft("");
    setSentTexts([]);
    setDisplay("list");
  }, [slideId]);

  const cloudData = useMemo(
    () => wordFrequencies(qAndAQuestions.map((q) => q.text ?? "")),
    [qAndAQuestions],
  );

  // Per-player cap from the slide's Q&A config (0 / absent = unlimited). The
  // server-side count is authoritative when askers are identified; the local
  // echo covers the anonymised case.
  const maxQuestions = slide.qAndA?.maxResponses ?? 0;
  const mineOnServer = qAndAQuestions.filter(
    (q) => q.participantId != null && q.participantId === viewerParticipantId,
  ).length;
  const askedCount = Math.max(sentTexts.length, mineOnServer);
  const capReached = maxQuestions > 0 && askedCount >= maxQuestions;

  const send = () => {
    const text = draft.trim();
    if (!interactive || capReached || text.length === 0) return;
    sendAnswer(slideId, { answerType: "QAndAAnswer", question: text });
    setSentTexts((prev) => [...prev, text]);
    setDraft("");
  };

  const showList = mode !== "prompt";

  const askerName = (participantId: string | null | undefined): string =>
    participantId != null
      ? (participants[participantId]?.displayName ?? "Player")
      : "Anonymous";

  return (
    <div className={styles.qandaBoardContent}>
      {showList && qAndAQuestions.length > 0 && (
        <div className={styles.displayToggle} role='group' aria-label='Display mode'>
          <Btn
            size='sm'
            variant={display === "list" ? "brand" : "secondary"}
            aria-pressed={display === "list"}
            onClick={() => {
              setDisplay("list");
            }}>
            List
          </Btn>
          <Btn
            size='sm'
            variant={display === "cloud" ? "brand" : "secondary"}
            aria-pressed={display === "cloud"}
            onClick={() => {
              setDisplay("cloud");
            }}>
            Word cloud
          </Btn>
        </div>
      )}

      {showList &&
        (qAndAQuestions.length === 0 ? (
          <p className={styles.empty}>No questions yet — waiting for the room…</p>
        ) : display === "cloud" ? (
          <WordCloud data={cloudData} displayAsPercentage={false} />
        ) : (
          <ul className={styles.questions}>
            {qAndAQuestions.map((question) => (
              <QuestionRow
                key={question.id}
                question={question}
                askerName={askerName(question.participantId)}
                isHost={viewerIsHost}
                onAnswer={(answer) => {
                  sendHostAnswer(slideId, question.id ?? "", answer);
                }}
              />
            ))}
          </ul>
        ))}

      {!showList && sentTexts.length > 0 && (
        <div className={styles.echo}>
          <h3 className={styles.echoTitle}>Your questions</h3>
          <ul className={styles.echoList}>
            {sentTexts.map((text, index) => (
              // Index keys are safe: the echo list is append-only within a round.
              <li key={`${index.toString()}-${text}`}>{text}</li>
            ))}
          </ul>
        </div>
      )}

      {interactive && mode !== "results" && (
        <form
          className={styles.compose}
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}>
          {capReached ? (
            <p className={styles.capNote}>
              You’ve used your {maxQuestions.toString()} question
              {maxQuestions === 1 ? "" : "s"} for this round.
            </p>
          ) : (
            <>
              <textarea
                className={styles.composeInput}
                aria-label='Your question'
                placeholder='Type a question for the host…'
                rows={2}
                maxLength={QUESTION_MAX_LENGTH}
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    send();
                  }
                }}
              />
              <div className={styles.composeActions}>
                {maxQuestions > 0 && (
                  <span className={styles.hint}>
                    {(maxQuestions - askedCount).toString()} of{" "}
                    {maxQuestions.toString()} left
                  </span>
                )}
                <Btn
                  type='submit'
                  size='sm'
                  variant='brand'
                  disabled={draft.trim().length === 0}>
                  Send question
                </Btn>
              </div>
            </>
          )}
        </form>
      )}
    </div>
  );
};

interface QuestionRowProps {
  question: {
    id?: string;
    text?: string;
    hostAnswer?: string;
  };
  askerName: string;
  isHost: boolean;
  /** Persist the host's typed answer (blank clears it). */
  onAnswer: (answer: string) => void;
}

/**
 * One asked question with its (optional) host answer. For the host the answer is
 * editable in place: Answer/Edit opens a small composer whose Save round-trips
 * through the server and lands back via `QAndAUpdated`.
 */
const QuestionRow = ({ question, askerName, isHost, onAnswer }: QuestionRowProps) => {
  const [editing, setEditing] = useState(false);
  const [answerDraft, setAnswerDraft] = useState("");
  const hostAnswer = question.hostAnswer ?? "";

  const beginEdit = () => {
    setAnswerDraft(hostAnswer);
    setEditing(true);
  };
  const save = () => {
    onAnswer(answerDraft.trim());
    setEditing(false);
  };

  return (
    <li className={styles.question}>
      <div className={styles.questionMain}>
        <span className={styles.asker}>{askerName}</span>
        <p className={styles.text}>{question.text}</p>
      </div>
      {editing ? (
        <div className={styles.answerEditor}>
          <textarea
            className={styles.composeInput}
            aria-label={`Answer to: ${question.text ?? ""}`}
            placeholder='Type your answer…'
            rows={2}
            maxLength={liveSessionValidation.HostAnswerRequest.answer.maxLength}
            value={answerDraft}
            onChange={(event) => {
              setAnswerDraft(event.target.value);
            }}
          />
          <div className={styles.composeActions}>
            <Btn
              size='sm'
              variant='secondary'
              onClick={() => {
                setEditing(false);
              }}>
              Cancel
            </Btn>
            <Btn size='sm' variant='brand' onClick={save}>
              Save
            </Btn>
          </div>
        </div>
      ) : (
        <>
          {hostAnswer && (
            <p className={styles.hostAnswer}>
              <span className={styles.hostAnswerLabel}>Host</span>
              {hostAnswer}
            </p>
          )}
          {isHost && (
            <div className={styles.rowActions}>
              <Btn size='sm' variant='secondary' onClick={beginEdit}>
                {hostAnswer ? "Edit answer" : "Answer"}
              </Btn>
            </div>
          )}
        </>
      )}
    </li>
  );
};

export { QAndABoardContent };
