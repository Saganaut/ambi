// Per-kind inspector section for QAndAQuestion. Surfaces the chunk-10
// moderation ergonomics: hide author identity on the moderation board, and
// suppress submissions until they reach a minimum upvote count.
import { useState } from "react";
import { Toggle } from "@components/Forms/Input/Toggle/Toggle";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import { useElementEditor } from "../../SlideContentTypes/useElementEditor";
import type { QAndAQuestion } from "@store/AmbiApi";
import styles from "../EditSlidePanel.module.css";

const isQAndAQuestion = (e: { kind: string }): e is QAndAQuestion =>
  e.kind === "QAndAQuestion";

const QAndAOptionsSection = () => {
  const { element, schedule, flush, commit, syncedFromId, markSynced } =
    useElementEditor<QAndAQuestion>(isQAndAQuestion);

  const [anonymousSubmissions, setAnonymousSubmissions] = useState<boolean>(
    element?.anonymousSubmissions ?? false,
  );
  const [minVotesToShow, setMinVotesToShow] = useState<number>(
    element?.minVotesToShow ?? 0,
  );

  if (element && syncedFromId !== element.id) {
    markSynced(element.id);
    setAnonymousSubmissions(element.anonymousSubmissions ?? false);
    setMinVotesToShow(element.minVotesToShow ?? 0);
  }

  if (!element) return null;

  const buildPatch = (overrides: Partial<QAndAQuestion>): QAndAQuestion => ({
    ...element,
    anonymousSubmissions,
    minVotesToShow,
    ...overrides,
  });

  const elId = element.id ?? "";

  return (
    <section className={styles.section}>
      <h4 className={styles.heading}>Q&amp;A moderation</h4>
      <Toggle
        id={`qa-anon-${elId}`}
        label='Hide author names on the moderation board'
        checked={anonymousSubmissions}
        onChange={(e) => {
          const next = e.currentTarget.checked;
          setAnonymousSubmissions(next);
          commit(buildPatch({ anonymousSubmissions: next }));
        }}
      />
      <NumberInput
        id={`qa-min-votes-${elId}`}
        label='Min upvotes before a question is shown'
        min={0}
        max={100}
        value={minVotesToShow}
        onChange={(next) => {
          setMinVotesToShow(next);
          schedule(buildPatch({ minVotesToShow: next }));
        }}
        onBlur={flush}
      />
    </section>
  );
};

export { QAndAOptionsSection };
