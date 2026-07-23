// Free-text presentation + answer surface for the board. A single component
// covers every scored/unscored moment, switched by `mode` (voting is handled by
// VoteBoardContent, so "vote" never reaches here):
//   - prompt      → a participant types one answer and sends it; free text is
//                   never live-tallied, so there is no shared feed — the surface
//                   stays editable and re-sending overwrites the prior answer
//                   (last write before the round closes wins). Host/projector
//                   sees an "answer on your own device" note instead — or, once
//                   the round stops accepting submissions (`mode` stays "prompt"
//                   for a LOCKED round), an answers-are-in note.
//   - liveResults → still answerable (same overwrite semantics); responses stay
//                   hidden until the host reveals results, so no data is shown —
//                   a note says so rather than faking an empty feed.
//   - results     → the aggregated answers land via the round result: distinct
//                   submissions with their counts, shown as a list (correct rows
//                   highlighted) or a frequency word cloud. Names are never
//                   shown — the aggregate is the display, preserving anonymity.
//
// Grading is disclosed only at results: rows whose exact text graded correct
// (from `results.outcomes`) are highlighted, and a single accepted answer that
// nobody matched is still disclosed. Word-cloud slides are unscored, so no
// grading UI ever renders for them.
import { useEffect, useMemo, useState } from "react";
import type { SlideView } from "../../../store/liveSessionApi.gen";
import { liveSessionValidation } from "../../../store/liveSessionValidationConstants";
import { useLiveSessionQuery } from "@/features/liveSession/hooks/useLiveSessionQuery";
import { useSessionConnection } from "@/features/liveSession/views/SessionPage/SessionConnectionContext";
import { WordCloud } from "@/shared/components/Charts/WordCloud/WordCloud";
import { wordFrequencies } from "@/shared/components/Charts/adapters/words";
import type { BoardQuestionMode } from "../resolveBoardStage";
import { Btn } from "@ui/Buttons/Btn";
import styles from "./TextBoardContent.module.css";

/** How the revealed answers render on the board. */
type TextDisplay = "list" | "cloud";

const TEXT_MAX_LENGTH = liveSessionValidation.TextAnswer.text.maxLength;

interface TextBoardContentProps {
  slide: SlideView;
  mode: BoardQuestionMode;
  interactive: boolean;
}

const TextBoardContent = ({ slide, mode, interactive }: TextBoardContentProps) => {
  const slideId = slide.id ?? "";
  const wordCloudSlide = slide.text?.wordCloud ?? false;
  // Effective input cap: the slide's own limit clamped by the global validation
  // bound (never hardcode the bound — it comes from the generated constants).
  const slideMax = slide.text?.maxLength;
  const maxLength =
    slideMax != null ? Math.min(slideMax, TEXT_MAX_LENGTH) : TEXT_MAX_LENGTH;

  const { sendAnswer } = useSessionConnection();
  // Free text isn't live-tallied, so the only responses ever available arrive
  // with the revealed round result. There is no server-tracked "my answer", so
  // the submitted flag is round-local: cleared whenever the round changes.
  // `mode` stays "prompt" for a LOCKED round; the phase tells closed-but-not-
  // revealed apart from a host projection of an open round.
  const { phase, results } = useLiveSessionQuery();
  const accepting = phase === "SUBMIT" || phase === "SUBMIT_LIVE";
  const revealed = results?.slideId === slideId ? results : null;

  // Compose + submitted state are round-local: reset when the round changes.
  const [draft, setDraft] = useState("");
  const [submitted, setSubmitted] = useState(false);
  // Word-cloud slides default to the cloud; scored ones to the readable list.
  const [display, setDisplay] = useState<TextDisplay>(
    wordCloudSlide ? "cloud" : "list",
  );
  useEffect(() => {
    setDraft("");
    setSubmitted(false);
    setDisplay(wordCloudSlide ? "cloud" : "list");
  }, [slideId, wordCloudSlide]);

  // Distinct submitted answers → count, from the revealed round. Memoized off
  // the round result so the derivations below keep a stable dependency.
  const answerCounts = useMemo(() => revealed?.optionCounts ?? {}, [revealed]);
  // The exact texts that graded correct (never highlighted for a word cloud).
  const correctChoices = useMemo(() => {
    if (wordCloudSlide || !revealed) return new Set<string>();
    return new Set(
      revealed.outcomes
        .filter((outcome) => outcome.correct && outcome.choice != null)
        .map((outcome) => outcome.choice as string),
    );
  }, [revealed, wordCloudSlide]);

  // Distinct answers, most-frequent first (locale order breaks ties for stable
  // rendering).
  const rankedAnswers = useMemo(
    () =>
      Object.entries(answerCounts).sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
      ),
    [answerCounts],
  );

  // Word cloud weights each distinct answer by how many people submitted it.
  const cloudData = useMemo(() => {
    const texts: string[] = [];
    for (const [text, count] of Object.entries(answerCounts)) {
      for (let i = 0; i < count; i++) texts.push(text);
    }
    return wordFrequencies(texts);
  }, [answerCounts]);

  const send = () => {
    const text = draft.trim();
    if (!interactive || mode === "results" || text.length === 0) return;
    sendAnswer(slideId, { answerType: "TextAnswer", text });
    setSubmitted(true);
  };

  if (mode === "results") {
    const correctOption = revealed?.correctOption ?? null;
    // Disclose a single accepted answer nobody matched — the correct rows above
    // already surface any answer that did land (word clouds stay unscored).
    const undisclosed =
      !wordCloudSlide && correctOption != null && !correctChoices.has(correctOption);

    return (
      <div className={styles.textBoardContent}>
        {rankedAnswers.length === 0 ? (
          <p className={styles.note}>No answers were submitted this round.</p>
        ) : (
          <>
            <div
              className={styles.displayToggle}
              role='group'
              aria-label='Display mode'>
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

            {display === "cloud" ? (
              <WordCloud data={cloudData} displayAsPercentage={false} />
            ) : (
              <ul className={styles.answers}>
                {rankedAnswers.map(([text, count]) => {
                  const isCorrect = correctChoices.has(text);
                  const classes = [styles.answer, isCorrect ? styles.correct : ""]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <li key={text} className={classes}>
                      <span className={styles.answerText}>{text}</span>
                      {isCorrect && (
                        <span className={styles.badge} aria-label='Correct'>
                          ✓
                        </span>
                      )}
                      <span className={styles.answerCount}>{count}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}

        {undisclosed && correctOption != null && (
          <p className={styles.correctAnswer}>
            <span className={styles.correctLabel}>Correct answer</span>
            {correctOption}
          </p>
        )}
      </div>
    );
  }

  if (!interactive) {
    // Host/projector (and everyone once the round closes): free text is typed
    // on each participant's own device, and nothing is shown here until
    // results are revealed.
    return (
      <div className={styles.textBoardContent}>
        <p className={styles.note}>
          {accepting
            ? "Type your answer on your own device."
            : "Answers are in — this round is closed."}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.textBoardContent}>
      {mode === "liveResults" && (
        <p className={styles.note}>
          Answers stay hidden until the host reveals the results.
        </p>
      )}
      <form
        className={styles.compose}
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}>
        <textarea
          className={styles.composeInput}
          aria-label='Your answer'
          placeholder='Type your answer…'
          rows={3}
          maxLength={maxLength}
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
          {submitted ? (
            <span className={styles.sent}>Answer sent — you can update it.</span>
          ) : (
            <span className={styles.hint}>
              {draft.length.toString()} / {maxLength.toString()}
            </span>
          )}
          <Btn
            type='submit'
            size='sm'
            variant='brand'
            disabled={draft.trim().length === 0}>
            {submitted ? "Update answer" : "Send answer"}
          </Btn>
        </div>
      </form>
    </div>
  );
};

export { TextBoardContent };
