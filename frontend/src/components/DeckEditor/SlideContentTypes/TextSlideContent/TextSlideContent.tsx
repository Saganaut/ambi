/**
 * Author surface for a free-text question (TextQuestion).
 *
 * Layout split:
 *   - Prompt at the top, owning visual weight.
 *   - Answers card grouping the canonical correct answer + accepted variants.
 *   - Settings card for case-sensitive matching and point value.
 *
 * The variants input splits on commas at commit time so the schema only ever
 * carries trimmed, non-empty strings.
 */
import { useState } from "react";
import { Input } from "@/components/Common/Input/Input/Input";
import { NumberInput } from "@/components/Common/Input/NumberInput/NumberInput";
import { Checkbox } from "@/components/Common/Input/Checkbox/Checkbox";
import { Container } from "@/components/Containers/Container";
import { SlideContentWrapper } from "../SlideContentWrapper";
import { useTextQuestionEditor } from "../useElementEditor";
import {
  EmptySelect,
  PromptField,
  ScoringFooter,
  SettingsCard,
  SettingsRow,
} from "../_shared";
import styles from "./TextSlideContent.module.css";

const variantsToInput = (variants: string[] | undefined) =>
  (variants ?? []).join(", ");
const inputToVariants = (raw: string) =>
  raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "");

const TextSlideContent = () => {
  const {
    question: element,
    schedule,
    flush,
    syncedFromId,
    markSynced,
  } = useTextQuestionEditor();

  const [prompt, setPrompt] = useState<string>(element?.prompt ?? "");
  const [correctAnswer, setCorrectAnswer] = useState<string>(
    element?.correctAnswer ?? "",
  );
  const [variantsText, setVariantsText] = useState<string>(() =>
    variantsToInput(element?.acceptedVariants),
  );
  const [caseSensitive, setCaseSensitive] = useState<boolean>(
    element?.caseSensitive ?? false,
  );
  const [pointValue, setPointValue] = useState<number>(
    element?.pointValue ?? 0,
  );

  if (element && syncedFromId !== element.id) {
    markSynced(element.id);
    setPrompt(element.prompt ?? "");
    setCorrectAnswer(element.correctAnswer ?? "");
    setVariantsText(variantsToInput(element.acceptedVariants));
    setCaseSensitive(element.caseSensitive ?? false);
    setPointValue(element.pointValue ?? 0);
  }

  if (!element) return <EmptySelect title='Text answer' />;

  const idBase = element.id ?? "";

  return (
    <Container name='TextSlideEditor'>
      <SlideContentWrapper
        footer={<ScoringFooter visible={!correctAnswer.trim()} />}>
        <PromptField
          idBase={`text-${idBase}`}
          value={prompt}
          onChange={(html) => {
            setPrompt(html);
            schedule({ prompt: html });
          }}
          onBlur={flush}
        />

        <div className={styles.answersStack}>
          <SettingsCard title='Correct answers'>
            <Input
              label='Canonical answer'
              id={`text-correct-${idBase}`}
              type='text'
              fullWidth
              value={correctAnswer}
              placeholder='The exact text players should type'
              onChange={(e) => {
                const next = e.target.value;
                setCorrectAnswer(next);
                schedule({ correctAnswer: next });
              }}
              onBlur={flush}
            />
            <Input
              label='Accepted variants'
              id={`text-variants-${idBase}`}
              type='text'
              fullWidth
              value={variantsText}
              placeholder='Comma-separated alternates — e.g. paree, parisien'
              onChange={(e) => {
                const next = e.target.value;
                setVariantsText(next);
                schedule({ acceptedVariants: inputToVariants(next) });
              }}
              onBlur={flush}
            />
          </SettingsCard>

          <SettingsCard title='Scoring'>
            <SettingsRow>
              <NumberInput
                label='Points'
                id={`text-points-${idBase}`}
                min={0}
                value={pointValue}
                onChange={(next) => {
                  setPointValue(next);
                  schedule({ pointValue: next });
                }}
                onBlur={flush}
              />
              <Checkbox
                label='Case sensitive'
                id={`text-case-${idBase}`}
                checked={caseSensitive}
                onChange={(e) => {
                  const next = e.target.checked;
                  setCaseSensitive(next);
                  schedule({ caseSensitive: next });
                }}
              />
            </SettingsRow>
          </SettingsCard>
        </div>
      </SlideContentWrapper>
    </Container>
  );
};

export { TextSlideContent };
