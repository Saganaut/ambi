// Per-kind inspector section for TextQuestion. Surfaces the chunk-10
// answer-matching ergonomics: a max length on the participant input,
// whether whitespace is trimmed before comparison, and an optional
// Levenshtein "fuzzy match" with a configurable edit distance.
import { useState } from "react";
import { Toggle } from "@components/Forms/Input/Toggle/Toggle";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import { useElementEditor } from "../../SlideContentTypes/useElementEditor";
import type { TextQuestion } from "@store/AmbiApi";
import styles from "../EditSlidePanel.module.css";

const isTextQuestion = (e: { kind: string }): e is TextQuestion =>
  e.kind === "TextQuestion";

const TextOptionsSection = () => {
  const { element, schedule, flush, commit, syncedFromId, markSynced } =
    useElementEditor<TextQuestion>(isTextQuestion);

  const [maxLength, setMaxLength] = useState<number>(element?.maxLength ?? 80);
  const [trimWhitespace, setTrimWhitespace] = useState<boolean>(
    element?.trimWhitespace ?? true,
  );
  const [fuzzyMatch, setFuzzyMatch] = useState<boolean>(
    element?.fuzzyMatch ?? false,
  );
  const [fuzzyDistance, setFuzzyDistance] = useState<number>(
    element?.fuzzyDistance ?? 1,
  );

  if (element && syncedFromId !== element.id) {
    markSynced(element.id);
    setMaxLength(element.maxLength ?? 80);
    setTrimWhitespace(element.trimWhitespace ?? true);
    setFuzzyMatch(element.fuzzyMatch ?? false);
    setFuzzyDistance(element.fuzzyDistance ?? 1);
  }

  if (!element) return null;

  const buildPatch = (overrides: Partial<TextQuestion>): TextQuestion => ({
    ...element,
    maxLength,
    trimWhitespace,
    fuzzyMatch,
    fuzzyDistance,
    ...overrides,
  });

  const elId = element.id ?? "";

  return (
    <section className={styles.section}>
      <h4 className={styles.heading}>Text answer</h4>
      <NumberInput
        id={`text-max-length-${elId}`}
        label='Max length'
        min={1}
        max={500}
        value={maxLength}
        onChange={(next) => {
          setMaxLength(next);
          schedule(buildPatch({ maxLength: next }));
        }}
        onBlur={flush}
      />
      <Toggle
        id={`text-trim-${elId}`}
        label='Trim whitespace before scoring'
        checked={trimWhitespace}
        onChange={(e) => {
          const next = e.currentTarget.checked;
          setTrimWhitespace(next);
          commit(buildPatch({ trimWhitespace: next }));
        }}
      />
      <Toggle
        id={`text-fuzzy-${elId}`}
        label='Fuzzy match (accept near-misses)'
        checked={fuzzyMatch}
        onChange={(e) => {
          const next = e.currentTarget.checked;
          setFuzzyMatch(next);
          commit(buildPatch({ fuzzyMatch: next }));
        }}
      />
      {fuzzyMatch && (
        <NumberInput
          id={`text-fuzzy-dist-${elId}`}
          label='Allowed edits'
          min={1}
          max={5}
          value={fuzzyDistance}
          onChange={(next) => {
            setFuzzyDistance(next);
            schedule(buildPatch({ fuzzyDistance: next }));
          }}
          onBlur={flush}
        />
      )}
    </section>
  );
};

export { TextOptionsSection };
