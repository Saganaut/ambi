// Per-kind inspector section for NumberQuestion. Surfaces the chunk-10
// input-clamping ergonomics: an optional [min, max] range that the scorer
// uses to reject out-of-range answers, plus an "allow negative" toggle.
// `minValue` / `maxValue` are nullable on the backend; the UI gates them
// behind a single "Limit answer range" toggle so the unbounded default
// stays a one-click state.
import { useState } from "react";
import { Toggle } from "@components/Forms/Input/Toggle/Toggle";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import { useElementEditor } from "../../SlideContentTypes/useElementEditor";
import type { NumberQuestion } from "@/store/AmbiApi";
import styles from "../EditSlidePanel.module.css";

const isNumberQuestion = (e: { kind: string }): e is NumberQuestion =>
  e.kind === "NumberQuestion";

const NumberOptionsSection = () => {
  const { element, commit, syncedFromId, markSynced } =
    useElementEditor<NumberQuestion>(isNumberQuestion);

  const hasRange =
    element?.minValue !== undefined || element?.maxValue !== undefined;

  const [limitRange, setLimitRange] = useState<boolean>(hasRange);
  const [minValue, setMinValue] = useState<number>(element?.minValue ?? 0);
  const [maxValue, setMaxValue] = useState<number>(element?.maxValue ?? 100);
  const [allowNegative, setAllowNegative] = useState<boolean>(
    element?.allowNegative ?? true,
  );

  if (element && syncedFromId !== element.id) {
    markSynced(element.id);
    const synced =
      element.minValue !== undefined || element.maxValue !== undefined;
    setLimitRange(synced);
    setMinValue(element.minValue ?? 0);
    setMaxValue(element.maxValue ?? 100);
    setAllowNegative(element.allowNegative ?? true);
  }

  if (!element) return null;

  const buildPatch = (overrides: Partial<NumberQuestion>): NumberQuestion => ({
    ...element,
    minValue: limitRange ? minValue : undefined,
    maxValue: limitRange ? maxValue : undefined,
    allowNegative,
    ...overrides,
  });

  const elId = element.id ?? "";

  return (
    <section className={styles.section}>
      <h4 className={styles.heading}>Numeric answer</h4>
      <Toggle
        id={`number-allow-neg-${elId}`}
        label='Allow negative answers'
        checked={allowNegative}
        onChange={(e) => {
          const next = e.currentTarget.checked;
          setAllowNegative(next);
          commit(buildPatch({ allowNegative: next }));
        }}
      />
      <Toggle
        id={`number-limit-${elId}`}
        label='Limit answer range'
        checked={limitRange}
        onChange={(e) => {
          const next = e.currentTarget.checked;
          setLimitRange(next);
          commit(
            buildPatch({
              minValue: next ? minValue : undefined,
              maxValue: next ? maxValue : undefined,
            }),
          );
        }}
      />
      {limitRange && (
        <>
          <NumberInput
            id={`number-min-${elId}`}
            label='Minimum'
            value={minValue}
            onChange={(next) => {
              setMinValue(next);
            }}
            onBlur={() => {
              commit(buildPatch({ minValue }));
            }}
          />
          <NumberInput
            id={`number-max-${elId}`}
            label='Maximum'
            value={maxValue}
            onChange={(next) => {
              setMaxValue(next);
            }}
            onBlur={() => {
              commit(buildPatch({ maxValue }));
            }}
          />
        </>
      )}
    </section>
  );
};

export { NumberOptionsSection };
