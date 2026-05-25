/**
 * Author surface for a Scales / Likert question.
 *
 * Layout:
 *   - Prompt at the top.
 *   - Scale card showing a visual preview of the configured range + anchor
 *     labels, with the numeric/text fields directly underneath so edits
 *     re-render the preview live.
 *   - Statements list — each statement is a `ScaleStatementEditable` row.
 *
 * Per-statement editing lives on `ScaleStatementEditable`. This file owns
 * the question-level fields and structural add/remove via `useScalesEditor`.
 */
import { useState } from "react";
import { Input } from "@/components/Common/Input/Input/Input";
import { NumberInput } from "@/components/Common/Input/NumberInput/NumberInput";
import { Checkbox } from "@/components/Common/Input/Checkbox/Checkbox";
import { Container } from "@/components/Containers/Container";
import { SlideContentWrapper } from "../SlideContentWrapper";
import { useScalesEditor } from "../useElementEditor";
import {
  EmptySelect,
  ItemList,
  PromptField,
  SectionHeader,
  SettingsCard,
  SettingsRow,
} from "../_shared";
import { ScalePreview } from "./ScalePreview";
import { ScaleStatementEditable } from "./ScaleStatementEditable";

const ScalesSlideContent = () => {
  const {
    question: element,
    schedule,
    flush,
    syncedFromId,
    markSynced,
    items,
    canAdd,
    addItem,
  } = useScalesEditor();

  const [prompt, setPrompt] = useState(element?.prompt ?? "");
  const [scaleMin, setScaleMin] = useState<number>(element?.scaleMin ?? 1);
  const [scaleMax, setScaleMax] = useState<number>(element?.scaleMax ?? 5);
  const [minLabel, setMinLabel] = useState(element?.minLabel ?? "");
  const [maxLabel, setMaxLabel] = useState(element?.maxLabel ?? "");
  const [scored, setScored] = useState<boolean>(element?.chrome?.scored ?? false);

  if (element && syncedFromId !== element.id) {
    markSynced(element.id);
    setPrompt(element.prompt ?? "");
    setScaleMin(element.scaleMin ?? 1);
    setScaleMax(element.scaleMax ?? 5);
    setMinLabel(element.minLabel ?? "");
    setMaxLabel(element.maxLabel ?? "");
    setScored(element.chrome?.scored ?? false);
  }

  if (!element) return <EmptySelect title='Scales' />;

  const idBase = element.id ?? "";

  return (
    <Container name='ScalesSlideEditor'>
      <SlideContentWrapper>
        <PromptField
          idBase={`scales-${idBase}`}
          value={prompt}
          placeholder='What is the player rating?'
          onChange={(html) => {
            setPrompt(html);
            schedule({ prompt: html });
          }}
          onBlur={flush}
        />

        <SettingsCard title='Scale'>
          <ScalePreview
            min={scaleMin}
            max={scaleMax}
            minLabel={minLabel}
            maxLabel={maxLabel}
          />
          <SettingsRow>
            <NumberInput
              label='Min'
              id={`scales-min-${idBase}`}
              value={scaleMin}
              onChange={(next) => {
                setScaleMin(next);
                schedule({ scaleMin: next });
              }}
              onBlur={flush}
            />
            <NumberInput
              label='Max'
              id={`scales-max-${idBase}`}
              value={scaleMax}
              onChange={(next) => {
                setScaleMax(next);
                schedule({ scaleMax: next });
              }}
              onBlur={flush}
            />
            <Input
              label='Min label'
              id={`scales-minlabel-${idBase}`}
              type='text'
              value={minLabel}
              placeholder='e.g. Strongly disagree'
              onChange={(e) => {
                const next = e.target.value;
                setMinLabel(next);
                schedule({ minLabel: next });
              }}
              onBlur={flush}
            />
            <Input
              label='Max label'
              id={`scales-maxlabel-${idBase}`}
              type='text'
              value={maxLabel}
              placeholder='e.g. Strongly agree'
              onChange={(e) => {
                const next = e.target.value;
                setMaxLabel(next);
                schedule({ maxLabel: next });
              }}
              onBlur={flush}
            />
          </SettingsRow>
          <SettingsRow>
            <Checkbox
              label='Scored (vs. pulse-style)'
              id={`scales-scored-${idBase}`}
              checked={scored}
              onChange={(e) => {
                const next = e.target.checked;
                setScored(next);
                schedule({ chrome: { ...element.chrome, scored: next } });
              }}
            />
          </SettingsRow>
        </SettingsCard>

        <SectionHeader label='Statements' />

        <ItemList addLabel='Add statement' canAdd={canAdd} onAdd={addItem}>
          {items.map((s, idx) =>
            s.id ? (
              <ScaleStatementEditable
                key={s.id}
                statementId={s.id}
                sortIndex={idx}
              />
            ) : null,
          )}
        </ItemList>
      </SlideContentWrapper>
    </Container>
  );
};

export { ScalesSlideContent };
