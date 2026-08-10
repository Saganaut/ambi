/**
 * Author surface for an open Q&A round (QAndAContent). Q&A is never scored:
 * players send in free-text questions, the host shows them on the big screen
 * (as a list or a word cloud) and can type an answer next to each one live.
 *
 * The editable content knobs (`moderated`, `maxResponses`, `allowAnonymous`)
 * are owned by the Q&A section of the Answers panel in the right sidebar —
 * repeating them here would create two debounced write surfaces for the same
 * fields. This surface therefore edits only the prompt (slide title) and
 * reflects the panel's settings read-only in the footer.
 */
import { useSlideEditor } from "@deck/hooks/useSlideEditor";
import { useSlideSettings } from "@deck/hooks/useSlideSettings";
import { ChatBubbleLeftEllipsisIcon } from "@heroicons/react/24/outline";
import { SAMPLE_QUESTION_TEXTS, wordFrequencies } from "@/shared/components/Charts/adapters/words";
import { WordCloudChart } from "@/shared/components/Charts/WordCloud/WordCloudChart";
import { useMemo, useState } from "react";
import { SlideContent, SlideContentSection } from "../SlideContentSection";
import { SlideWrapper } from "../SlideWrapper";
import { EmptySelect, SettingsCard } from "../_shared";
import type { SlideContentProps } from "../_shared/Item.types";
import styles from "./QAndASlideContent.module.css";

/** One-line summary of the round's collection rules for the footer. */
const summarize = (
  moderated: boolean,
  maxResponses: number | undefined,
  allowAnonymous: boolean,
): string => {
  const moderation = moderated
    ? "You review each question before it appears on screen."
    : "Questions appear on screen as they arrive.";
  const cap =
    maxResponses != null && maxResponses > 0
      ? `Each player can send up to ${maxResponses} question${maxResponses === 1 ? "" : "s"}.`
      : "Players can send as many questions as they like.";
  const anonymity = allowAnonymous ? "Anonymous submissions are allowed." : null;
  return [moderation, cap, anonymity].filter(Boolean).join(" ");
};

const PREVIEW_CAPTION =
  "Preview with sample questions — the live cloud builds from what players send in.";

const QAndASlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const { slide, updateMetadata, flush } = useSlideEditor(deckId, slideId, "Q_AND_A");
  const { answerSettings } = useSlideSettings(deckId, slideId);

  // Local mirror keeps the debounced prompt responsive; resynced when the
  // active slide changes ("derive state during render", see NumberSlideContent).
  const [title, setTitle] = useState(slide?.title ?? "");
  const [syncedFromId, setSyncedFromId] = useState(slide?.id);
  if (slide && syncedFromId !== slide.id) {
    setSyncedFromId(slide.id);
    setTitle(slide.title);
  }

  const previewCloud = useMemo(() => wordFrequencies(SAMPLE_QUESTION_TEXTS), []);

  if (!slide) return <EmptySelect title="Q & A" />;

  const idBase = slide.id;
  const footerText = summarize(
    slide.content.moderated,
    slide.content.maxResponses,
    answerSettings?.allowAnonymous ?? false,
  );

  return (
    <SlideWrapper
      prompt={{
        idBase: `qa-${idBase}`,
        value: title,
        placeholder: "Ask the room what they want to know…",
        onChange: (html) => {
          setTitle(html);
          updateMetadata({ title: html });
        },
        onBlur: flush,
      }}
      footer={<p>{footerText}</p>}
    >
      <SlideContent>
        <WordCloudChart data={previewCloud} displayAsPercentage={false} caption={PREVIEW_CAPTION} />
        <SlideContentSection>
          <SlideContentSection.Header>
            <ChatBubbleLeftEllipsisIcon className={styles.pulseBannerIcon} aria-hidden="true" />
            <span>Open-ended round — never scored.</span>
          </SlideContentSection.Header>
          <SlideContentSection.Body>
            <SettingsCard title="During the round">
              <ol className={styles.flowSteps}>
                <li>Players type questions and send them in.</li>
                <li>Submissions show on the host screen as a list or a word cloud.</li>
                <li>Type an answer next to any question to address it live.</li>
              </ol>
              <p className={styles.panelHint}>
                Moderation, response caps, and anonymity are set in the Answers panel.
              </p>
            </SettingsCard>
          </SlideContentSection.Body>
        </SlideContentSection>
      </SlideContent>
    </SlideWrapper>
  );
};

export { QAndASlideContent };
