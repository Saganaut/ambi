/**
 * Author surface for a Word Cloud survey (WordCloudQuestion).
 *
 * Layout:
 *   - Prompt
 *   - Submissions card: per-player cap + word length cap
 *   - Filters card: case-sensitivity + profanity filter
 *   - Banned words card: chip-based list editor (replaces the legacy
 *     comma-separated text input)
 */
import { useState } from "react";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import { Checkbox } from "@components/Forms/Input/Checkbox/Checkbox";
import { Container } from "@components/Containers/Container";
import { SlideContentWrapper } from "../SlideContentWrapper";
import { useWordCloudEditor } from "../useElementEditor";
import {
  EmptySelect,
  PromptField,
  SettingsCard,
  SettingsRow,
} from "../_shared";
import { BannedWordsInput } from "./BannedWordsInput";

const WordCloudSlideContent = () => {
  const {
    question: element,
    schedule,
    flush,
    commit,
    syncedFromId,
    markSynced,
  } = useWordCloudEditor();

  const [prompt, setPrompt] = useState(element?.prompt ?? "");
  const [maxSubmissions, setMaxSubmissions] = useState<number>(
    element?.maxSubmissionsPerPlayer ?? 3,
  );
  const [maxWordLength, setMaxWordLength] = useState<number>(
    element?.maxWordLength ?? 30,
  );
  const [caseSensitive, setCaseSensitive] = useState<boolean>(
    element?.caseSensitive ?? false,
  );
  const [profanityFilter, setProfanityFilter] = useState<boolean>(
    element?.profanityFilter ?? true,
  );
  const [bannedWords, setBannedWords] = useState<string[]>(
    element?.bannedWords ?? [],
  );

  if (element && syncedFromId !== element.id) {
    markSynced(element.id);
    setPrompt(element.prompt ?? "");
    setMaxSubmissions(element.maxSubmissionsPerPlayer ?? 3);
    setMaxWordLength(element.maxWordLength ?? 30);
    setCaseSensitive(element.caseSensitive ?? false);
    setProfanityFilter(element.profanityFilter ?? true);
    setBannedWords(element.bannedWords ?? []);
  }

  if (!element) return <EmptySelect title='Word Cloud' />;

  const idBase = element.id ?? "";

  return (
    <Container name='WordCloudSlideEditor'>
      <SlideContentWrapper>
        <PromptField
          idBase={`wc-${idBase}`}
          value={prompt}
          placeholder='What word describes Mondays?'
          onChange={(html) => {
            setPrompt(html);
            schedule({ prompt: html });
          }}
          onBlur={flush}
        />

        <SettingsCard title='Submissions'>
          <SettingsRow>
            <NumberInput
              label='Per player'
              id={`wc-max-${idBase}`}
              min={1}
              value={maxSubmissions}
              onChange={(next) => {
                setMaxSubmissions(next);
                schedule({ maxSubmissionsPerPlayer: next });
              }}
              onBlur={flush}
            />
            <NumberInput
              label='Max word length'
              id={`wc-len-${idBase}`}
              min={1}
              value={maxWordLength}
              onChange={(next) => {
                setMaxWordLength(next);
                schedule({ maxWordLength: next });
              }}
              onBlur={flush}
            />
          </SettingsRow>
        </SettingsCard>

        <SettingsCard title='Filters'>
          <SettingsRow>
            <Checkbox
              label='Case sensitive'
              id={`wc-case-${idBase}`}
              checked={caseSensitive}
              onChange={(e) => {
                const next = e.target.checked;
                setCaseSensitive(next);
                schedule({ caseSensitive: next });
              }}
            />
            <Checkbox
              label='Profanity filter'
              id={`wc-prof-${idBase}`}
              checked={profanityFilter}
              onChange={(e) => {
                const next = e.target.checked;
                setProfanityFilter(next);
                schedule({ profanityFilter: next });
              }}
            />
          </SettingsRow>
        </SettingsCard>

        <SettingsCard title='Banned words'>
          <BannedWordsInput
            idBase={idBase}
            words={bannedWords}
            onChange={(next) => {
              setBannedWords(next);
              commit({ bannedWords: next });
            }}
          />
        </SettingsCard>
      </SlideContentWrapper>
    </Container>
  );
};

export { WordCloudSlideContent };
