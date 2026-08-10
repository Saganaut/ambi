import { Dropdown } from "@components/Forms/Input/Dropdown/Dropdown";
import { Input } from "@components/Forms/Input/Input/Input";
import { useSlide } from "@deck/hooks/useSlide";
import { useSlideEditor } from "@deck/hooks/useSlideEditor";
import type { TextContent } from "@deck/store/deckApi.gen";
import { wouldOrphanKeyedFollowUp } from "@deck/utils/followUp";
import { SAMPLE_ANSWER_TEXTS, wordFrequencies } from "@/shared/components/Charts/adapters/words";
import { WordCloudChart } from "@/shared/components/Charts/WordCloud/WordCloudChart";
import { Tag } from "@ui/Tag/Tag";
import { useMemo, useState } from "react";
import { SlideContent, SlideContentSection } from "../SlideContentSection";
import { SlideWrapper } from "../SlideWrapper";
import { ScoringFooter } from "../_shared";
import { SlideContentProps } from "../_shared/Item.types";
import styles from "./TextSlideContent.module.css";

type MatchMode = TextContent["matchMode"];
const MATCH_MODE_OPTIONS: { value: MatchMode; label: string }[] = [
  { value: "EXACT", label: "Exact match" },
  { value: "CONTAINS", label: "Answer is contained" },
  { value: "WORDCLOUD", label: "Word cloud" },
];

const PREVIEW_CAPTION =
  "Preview with sample answers — the live cloud builds from what players send in.";

const splitAnswers = (raw: string) =>
  raw
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token !== "");

/** Append `additions` to `existing`, skipping any that already appear
 *  (case-insensitive) either in the list or earlier in this same batch. */
const mergeAnswers = (existing: string[], additions: string[]) => {
  const seen = new Set(existing.map((answer) => answer.toLowerCase()));
  const merged = [...existing];
  for (const candidate of additions) {
    const key = candidate.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(candidate);
  }
  return merged;
};

const TextSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const { slide, updateMetadata, updateSlideContent, flush } = useSlideEditor(
    deckId,
    slideId,
    "TEXT",
  );
  // Needed only to check whether an attached SPOT_THE_ANSWER follow-up would
  // be orphaned by an answer-key edit (see `wouldOrphanKeyedFollowUp` below).
  const { slides } = useSlide(deckId);

  // Local mirror state, resynced when the active slide changes ("derive state
  // during render" — safe because the new value differs from the old id).
  const [title, setTitle] = useState(slide?.title ?? "");
  const [answers, setAnswers] = useState<string[]>(slide?.content.acceptedAnswers ?? []);
  const [draft, setDraft] = useState("");
  const [matchMode, setMatchMode] = useState<MatchMode>(slide?.content.matchMode ?? "EXACT");
  const [syncedFromId, setSyncedFromId] = useState(slide?.id);
  if (slide && syncedFromId !== slide.id) {
    setSyncedFromId(slide.id);
    setTitle(slide.title);
    setAnswers(slide.content.acceptedAnswers ?? []);
    setDraft("");
    setMatchMode(slide.content.matchMode);
  }

  const previewCloud = useMemo(() => wordFrequencies(SAMPLE_ANSWER_TEXTS), []);

  if (!slide) {
    return (
      <SlideWrapper title="Text answer">
        <p>Select a slide to edit.</p>
      </SlideWrapper>
    );
  }

  const idBase = slide.id;
  const hasAnswers = answers.length > 0;
  // A word-cloud round is unscored by design, so it shows neither an answer key
  // nor the "not scoreable" nag; the stored answers are left untouched so
  // switching back to a matched mode restores them.
  const isWordCloud = matchMode === "WORDCLOUD";

  const commitAnswers = (next: string[]) => {
    setAnswers(next);
    updateSlideContent({ acceptedAnswers: next });
    flush();
  };

  const commitDraft = () => {
    const additions = splitAnswers(draft);
    if (additions.length > 0) commitAnswers(mergeAnswers(answers, additions));
    setDraft("");
  };

  const answerRows = answers.map((answer, index) => ({
    answer,
    index,
    removalBlocked: wouldOrphanKeyedFollowUp(slide, slides, {
      ...slide.content,
      acceptedAnswers: answers.filter((_, position) => position !== index),
    }),
  }));
  const answerKeyLocked = answerRows.some((row) => row.removalBlocked);

  const removeAnswer = (index: number) => {
    const next = answers.filter((_, position) => position !== index);
    if (wouldOrphanKeyedFollowUp(slide, slides, { ...slide.content, acceptedAnswers: next }))
      return;
    commitAnswers(next);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // Ignore Enter fired to confirm an IME composition (CJK input) — otherwise
    // picking a candidate would also commit a half-finished pill.
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitDraft();
    } else if (event.key === "Backspace" && draft === "" && answers.length > 0) {
      // Backspace on an empty box peels off the last pill, like most tag inputs.
      removeAnswer(answers.length - 1);
    }
  };

  return (
    <SlideWrapper
      prompt={{
        idBase: `text-${idBase}`,
        value: title,
        placeholder: "Type your question…",
        onChange: (html) => {
          setTitle(html);
          updateMetadata({ title: html });
        },
        onBlur: flush,
      }}
      footer={<ScoringFooter visible={!hasAnswers && !isWordCloud} />}
    >
      {" "}
      <SlideContent>
        {isWordCloud ? (
          <WordCloudChart
            data={previewCloud}
            displayAsPercentage={false}
            caption={PREVIEW_CAPTION}
          />
        ) : (
          <SlideContentSection>
            <SlideContentSection.Header>
              <span>Correct answer(s)</span>
              <span>Leave empty to just collect responses</span>{" "}
            </SlideContentSection.Header>
            <SlideContentSection.Body>
              <div className={styles.answersField}>
                {/* <label className={styles.answersLabel} htmlFor={`text-answers-${idBase}`}>
                Accepted answers
              </label> */}{" "}
                <Input
                  id={`text-answers-${idBase}`}
                  type="text"
                  fullWidth
                  value={draft}
                  placeholder="Type an answer and press Enter"
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={commitDraft}
                />
                {hasAnswers && (
                  <ul className={styles.tagList}>
                    {answerRows.map(({ answer, index, removalBlocked }) => (
                      <li key={answer}>
                        <Tag
                          size="md"
                          onRemove={removalBlocked ? undefined : () => removeAnswer(index)}
                          removeLabel={`Remove ${answer}`}
                        >
                          {answer}
                        </Tag>
                      </li>
                    ))}
                  </ul>
                )}
                {answerKeyLocked && (
                  <p className={styles.answerKeyLockedHint}>
                    Can&apos;t remove your last accepted answer — the attached &quot;Spot the
                    answer&quot; follow-up needs it to grade.
                  </p>
                )}
              </div>
            </SlideContentSection.Body>{" "}
          </SlideContentSection>
        )}{" "}
        <SlideContentSection>
          <SlideContentSection.Header>How should we match the answer?</SlideContentSection.Header>
          <SlideContentSection.Body>
            <Dropdown
              label=""
              id={`text-match-${idBase}`}
              options={MATCH_MODE_OPTIONS}
              value={[matchMode]}
              onChange={(values) => {
                const next = (values[0] as MatchMode | undefined) ?? "EXACT";
                setMatchMode(next);
                updateSlideContent({ matchMode: next });
                flush();
              }}
            />
          </SlideContentSection.Body>
        </SlideContentSection>
      </SlideContent>
    </SlideWrapper>
  );
};

export { TextSlideContent };
