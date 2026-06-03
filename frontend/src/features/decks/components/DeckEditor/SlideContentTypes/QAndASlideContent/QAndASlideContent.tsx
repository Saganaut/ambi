/**
 * Author surface for an open Q&A round (QAndAQuestion).
 *
 * Q&A is never scored; the editor focuses on round-shape knobs:
 *   - submissions per player cap
 *   - upvoting toggle
 *   - moderation auto-approve toggle
 * A small banner at the top reminds authors that this kind is survey-only so
 * the absent "correct answer" field doesn't feel like a missing feature.
 */
import { useState } from "react";
import { ChatBubbleLeftEllipsisIcon } from "@heroicons/react/24/outline";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import { Checkbox } from "@components/Forms/Input/Checkbox/Checkbox";
import { Container } from "@components/Containers/Container";
import { SlideContentWrapper } from "../SlideContentWrapper";
import { useQAndAEditor } from "../useElementEditor";
import {
  EmptySelect,
  PromptField,
  SettingsCard,
  SettingsRow,
} from "../_shared";
import styles from "./QAndASlideContent.module.css";

const QAndASlideContent = () => {
  const {
    question: element,
    schedule,
    flush,
    syncedFromId,
    markSynced,
  } = useQAndAEditor();

  const [prompt, setPrompt] = useState(element?.prompt ?? "");
  const [maxSubmissions, setMaxSubmissions] = useState<number>(
    element?.maxSubmissionsPerPlayer ?? 0,
  );
  const [allowVoting, setAllowVoting] = useState<boolean>(
    element?.allowVoting ?? false,
  );
  const [autoApprove, setAutoApprove] = useState<boolean>(
    element?.autoApprove ?? false,
  );

  if (element && syncedFromId !== element.id) {
    markSynced(element.id);
    setPrompt(element.prompt ?? "");
    setMaxSubmissions(element.maxSubmissionsPerPlayer ?? 0);
    setAllowVoting(element.allowVoting ?? false);
    setAutoApprove(element.autoApprove ?? false);
  }

  if (!element) return <EmptySelect title='Q & A' />;

  const idBase = element.id ?? "";

  return (
    <Container name='QAndASlideEditor'>
      <SlideContentWrapper>
        <PromptField
          idBase={`qa-${idBase}`}
          value={prompt}
          placeholder='Ask players what they want to know…'
          onChange={(html) => {
            setPrompt(html);
            schedule({ prompt: html });
          }}
          onBlur={flush}
        />

        <div className={styles.pulseBanner}>
          <ChatBubbleLeftEllipsisIcon className={styles.pulseBannerIcon} />
          <span>Open-ended round — never scored.</span>
        </div>

        <SettingsCard title='Submissions'>
          <SettingsRow>
            <NumberInput
              label='Max per player (0 = unlimited)'
              id={`qa-max-${idBase}`}
              min={0}
              value={maxSubmissions}
              onChange={(next) => {
                setMaxSubmissions(next);
                schedule({ maxSubmissionsPerPlayer: next });
              }}
              onBlur={flush}
            />
          </SettingsRow>
        </SettingsCard>

        <SettingsCard title='Moderation'>
          <SettingsRow>
            <Checkbox
              label='Allow upvoting'
              id={`qa-vote-${idBase}`}
              checked={allowVoting}
              onChange={(e) => {
                const next = e.target.checked;
                setAllowVoting(next);
                schedule({ allowVoting: next });
              }}
            />
            <Checkbox
              label='Skip host moderation (auto-approve)'
              id={`qa-auto-${idBase}`}
              checked={autoApprove}
              onChange={(e) => {
                const next = e.target.checked;
                setAutoApprove(next);
                schedule({ autoApprove: next });
              }}
            />
          </SettingsRow>
        </SettingsCard>
      </SlideContentWrapper>
    </Container>
  );
};

export { QAndASlideContent };
