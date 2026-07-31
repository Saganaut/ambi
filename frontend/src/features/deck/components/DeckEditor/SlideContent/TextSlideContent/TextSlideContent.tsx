/**
 * Author surface for a free-text answer slide (TextContent). Players type a free
 * response; follow-up slides can then be seeded from those submissions.
 *
 * Scorability is derived, not toggled: any accepted answer makes the slide
 * scoreable; an empty list is an unscored collection (the ScoringFooter warns).
 * Accepted answers are entered as tags: type one and press Enter (or comma) to
 * commit it as a pill; the content only ever carries trimmed, de-duplicated,
 * non-empty strings.
 *
 * Removing the last answer is blocked (no remove control, no PUT fired) while
 * a SPOT_THE_ANSWER follow-up is attached — the backend 400s that content
 * transition, and `updateSlide`'s fire-and-forget PUT can't surface a
 * rejection, so `wouldOrphanKeyedFollowUp` catches it client-side first.
 */
import { Dropdown } from "@components/Forms/Input/Dropdown/Dropdown";
import { Input } from "@components/Forms/Input/Input/Input";
import { useSlide } from "@deck/hooks/useSlide";
import { useSlideEditor } from "@deck/hooks/useSlideEditor";
import type { TextContent } from "@deck/store/deckApi.gen";
import { wouldOrphanKeyedFollowUp } from "@deck/utils/followUp";
import { Tag } from "@ui/Tag/Tag";
import { useState } from "react";
import { SlideContent, SlideContentSection } from "../SlideContentSection";
import { SlideWrapper } from "../SlideWrapper";
import { ScoringFooter } from "../_shared";
import type { SlideContentProps } from "../slideContentProps";
import styles from "./TextSlideContent.module.css";

/** How a player's submission is compared to the accepted answers. Only the
 *  scored modes are surfaced; the backend `WORDCLOUD` (unscored) state is
 *  expressed by leaving the answers empty, not by picking it here. Future modes
 *  (manual review, vector similarity) slot in as extra entries. */
type MatchMode = TextContent["matchMode"];
const MATCH_MODE_OPTIONS: { value: MatchMode; label: string }[] = [
  { value: "EXACT", label: "Exact match" },
  { value: "CONTAINS", label: "Answer is contained" },
];

/** Split raw entry text into candidate answers. Commas still separate (so a
 *  pasted "Frodo, Frodo Baggins" fans out into two pills), and each candidate
 *  is trimmed to non-empty. */
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

  if (!slide) {
    return (
      <SlideWrapper title="Text answer">
        <p>Select a slide to edit.</p>
      </SlideWrapper>
    );
  }

  const idBase = slide.id;
  const hasAnswers = answers.length > 0;

  // Persist a new answer list to the store. Each tag add/remove is a discrete,
  // durable edit, so we flush immediately rather than waiting for a blur.
  const commitAnswers = (next: string[]) => {
    setAnswers(next);
    updateSlideContent({ acceptedAnswers: next });
    flush();
  };

  // Turn whatever is in the entry box into pills, then clear it.
  const commitDraft = () => {
    const additions = splitAnswers(draft);
    if (additions.length > 0) commitAnswers(mergeAnswers(answers, additions));
    setDraft("");
  };

  // Per-tag: would removing this one strip the last non-blank answer while a
  // SPOT_THE_ANSWER follow-up is attached? The backend rejects that content
  // transition with 400 (it'd leave the follow-up's answer key dangling), and
  // the slide-update path that would carry it fires fire-and-forget with no
  // rollback — so this is a client-side guard, not just a UX nicety.
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
      footer={<ScoringFooter visible={!hasAnswers} />}
    >
      {" "}
      <SlideContent>
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
        </SlideContentSection>{" "}
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
