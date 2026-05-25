// Per-kind inspector section for McqQuestion. Surfaces the chunk-10
// ergonomics: shuffle the option order per-player, opt in to multi-select,
// and cap how many options a participant may pick when multi-select is on.
// Lives next to the other EditSlideSections so the dispatcher in
// EditSlidePanel can mount it without touching the other kinds.
import { useState } from "react";
import { Toggle } from "@/components/Common/Input/Toggle/Toggle";
import { NumberInput } from "@/components/Common/Input/NumberInput/NumberInput";
import { useElementEditor } from "../../SlideContentTypes/useElementEditor";
import type { McqQuestion } from "@/store/BrainFlexApi";
import styles from "../EditSlidePanel.module.css";

const isMcqQuestion = (e: { kind: string }): e is McqQuestion =>
  e.kind === "McqQuestion";

const McqOptionsSection = () => {
  const { element, schedule, flush, commit, syncedFromId, markSynced } =
    useElementEditor<McqQuestion>(isMcqQuestion);

  const [shuffleOptions, setShuffleOptions] = useState<boolean>(
    element?.shuffleOptions ?? true,
  );
  const [allowMultipleSelect, setAllowMultipleSelect] = useState<boolean>(
    element?.allowMultipleSelect ?? false,
  );
  const [maxSelections, setMaxSelections] = useState<number>(
    element?.maxSelections ?? 0,
  );

  if (element && syncedFromId !== element.id) {
    markSynced(element.id);
    setShuffleOptions(element.shuffleOptions ?? true);
    setAllowMultipleSelect(element.allowMultipleSelect ?? false);
    setMaxSelections(element.maxSelections ?? 0);
  }

  if (!element) return null;

  const buildPatch = (overrides: Partial<McqQuestion>): McqQuestion => ({
    ...element,
    shuffleOptions,
    allowMultipleSelect,
    maxSelections,
    ...overrides,
  });

  const elId = element.id ?? "";

  return (
    <section className={styles.section}>
      <h4 className={styles.heading}>Multiple choice</h4>
      <Toggle
        id={`mcq-shuffle-${elId}`}
        label='Shuffle option order per player'
        checked={shuffleOptions}
        onChange={(e) => {
          const next = e.currentTarget.checked;
          setShuffleOptions(next);
          commit(buildPatch({ shuffleOptions: next }));
        }}
      />
      <Toggle
        id={`mcq-multi-${elId}`}
        label='Allow multiple correct selections'
        checked={allowMultipleSelect}
        onChange={(e) => {
          const next = e.currentTarget.checked;
          setAllowMultipleSelect(next);
          commit(buildPatch({ allowMultipleSelect: next }));
        }}
      />
      {allowMultipleSelect && (
        <NumberInput
          id={`mcq-max-${elId}`}
          label='Max selections (0 = unlimited)'
          min={0}
          max={6}
          value={maxSelections}
          onChange={(next) => {
            setMaxSelections(next);
            schedule(buildPatch({ maxSelections: next }));
          }}
          onBlur={flush}
        />
      )}
    </section>
  );
};

export { McqOptionsSection };
