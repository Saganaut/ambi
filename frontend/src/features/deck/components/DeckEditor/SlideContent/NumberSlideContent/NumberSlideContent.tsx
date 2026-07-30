/**
 * Author surface for a numeric-answer slide (NumberContent). The sibling of
 * {@link TextSlideContent}: a player types a number instead of free text, and
 * the only real divergence is how correctness is expressed.
 *
 * Layout:
 *   - Prompt at the top (stored on the slide title, like TEXT/MCQ).
 *   - "Correct answer" card fronted by a live preview chip ("42 km", "10–20 km")
 *     so the author sees the whole scoring rule at a glance. Grading is one of
 *     three shapes, chosen from a dropdown:
 *       · Not scored  — no target; the slide only collects players' numbers.
 *                       Persisted as a null `answer`, the parallel of TEXT's
 *                       empty accepted-answers list.
 *       · Exact value — the answer must equal a single number (scoreMode EXACT).
 *       · Range        — the answer is correct anywhere in [from, to]. Persisted
 *                        as the backend's centre ± tolerance model
 *                        (scoreMode RANGE): answer = midpoint, tolerance =
 *                        half-width, which grades to exactly "value inside the
 *                        range". The two bounds are reconstructed on load as
 *                        answer ∓ tolerance.
 *
 * Scorability is therefore derived, not a separate toggle: a null `answer` is an
 * unscored collection (the footer says so); any target makes the slide
 * scoreable.
 */
import { Dropdown } from "@components/Forms/Input/Dropdown/Dropdown";
import { Input } from "@components/Forms/Input/Input/Input";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import { useSlideEditor } from "@deck/hooks/useSlideEditor";
import type { NumberContent } from "@deck/store/deckApi.gen";
import { useState } from "react";
import { SlideWrapper } from "../SlideWrapper";
import { EmptySelect, SettingsCard, SettingsRow } from "../_shared";
import type { SlideContentProps } from "../slideContentProps";
import styles from "./NumberSlideContent.module.css";

/** The grading shapes this editor surfaces. `UNSCORED` is a null `answer`;
 *  `RANGE` maps to scoreMode RANGE; everything else reads back as `EXACT`. The
 *  backend's wider relative modes (CLOSEST, NEAREST, …) aren't authored here. */
type Grading = "UNSCORED" | "EXACT" | "RANGE";
const GRADING_OPTIONS: { value: Grading; label: string }[] = [
  { value: "UNSCORED", label: "Not scored — collect answers" },
  { value: "EXACT", label: "An exact value" },
  { value: "RANGE", label: "A range of values" },
];

/** Derive the editor's grading shape from stored content. */
const gradingOf = (content: NumberContent): Grading =>
  content.answer == null ? "UNSCORED" : content.scoreMode === "RANGE" ? "RANGE" : "EXACT";

/** Render a number for the preview chip without trailing float noise. */
const formatNumber = (value: number) => (Number.isFinite(value) ? String(value) : "0");

const NumberSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const { slide, updateMetadata, updateSlideContent, flush } = useSlideEditor(
    deckId,
    slideId,
    "NUMBER",
  );

  // Local mirrors keep the debounced inputs responsive (see TextSlideContent);
  // resynced when the active slide changes ("derive state during render").
  const [title, setTitle] = useState(slide?.title ?? "");
  const [grading, setGrading] = useState<Grading>(slide ? gradingOf(slide.content) : "UNSCORED");
  // A null answer (unscored) still needs a sensible seed for the value fields the
  // author reveals by switching to a scored mode.
  const [exactValue, setExactValue] = useState(slide?.content.answer ?? 0);
  // Range bounds are the backend's centre ± tolerance split back into [from, to].
  const [rangeFrom, setRangeFrom] = useState(
    (slide?.content.answer ?? 0) - (slide?.content.tolerance ?? 0),
  );
  const [rangeTo, setRangeTo] = useState(
    (slide?.content.answer ?? 0) + (slide?.content.tolerance ?? 0),
  );
  const [unit, setUnit] = useState(slide?.content.unit ?? "");
  const [syncedFromId, setSyncedFromId] = useState(slide?.id);
  if (slide && syncedFromId !== slide.id) {
    setSyncedFromId(slide.id);
    setTitle(slide.title);
    setGrading(gradingOf(slide.content));
    const answer = slide.content.answer ?? 0;
    setExactValue(answer);
    setRangeFrom(answer - slide.content.tolerance);
    setRangeTo(answer + slide.content.tolerance);
    setUnit(slide.content.unit);
  }

  if (!slide) return <EmptySelect title="Numeric answer" />;

  const idBase = slide.id;

  // Persist a [from, to] range as centre ± half-width, which is what the backend
  // grades ("value within tolerance of answer"). Order-independent: a reversed
  // pair still yields the same inclusive interval.
  const commitRange = (from: number, to: number): Partial<NumberContent> => ({
    scoreMode: "RANGE",
    answer: (from + to) / 2,
    tolerance: Math.abs(to - from) / 2,
  });

  const handleGradingChange = (next: Grading) => {
    if (next === grading) return;
    setGrading(next);
    // Carry the single underlying target across the switch so the modes stay
    // views of one value: unscored clears the answer; a range starts as a
    // zero-width interval on the exact value (the author widens it); collapsing
    // a range keeps its midpoint.
    if (next === "UNSCORED") {
      updateSlideContent({ answer: null });
    } else if (next === "RANGE") {
      const from = grading === "RANGE" ? rangeFrom : exactValue;
      const to = grading === "RANGE" ? rangeTo : exactValue;
      setRangeFrom(from);
      setRangeTo(to);
      updateSlideContent(commitRange(from, to));
    } else {
      const value = grading === "RANGE" ? (rangeFrom + rangeTo) / 2 : exactValue;
      setExactValue(value);
      updateSlideContent({ scoreMode: "EXACT", answer: value, tolerance: 0 });
    }
    flush();
  };

  const unitSuffix = unit ? ` ${unit}` : "";
  const footerText =
    grading === "UNSCORED"
      ? "Not scored — collect players' numbers without grading."
      : grading === "RANGE"
        ? `Scored when a player's answer lands between ${formatNumber(rangeFrom)} and ${formatNumber(rangeTo)}${unitSuffix}.`
        : `Scored when a player's answer equals ${formatNumber(exactValue)}${unitSuffix}.`;

  const preview =
    grading === "UNSCORED" ? null : (
      <span className={styles.targetPreview}>
        <span className={styles.targetPreviewValue}>
          {grading === "RANGE"
            ? `${formatNumber(rangeFrom)}–${formatNumber(rangeTo)}`
            : formatNumber(exactValue)}
        </span>
        {unit && <span className={styles.targetPreviewUnit}>{unit}</span>}
      </span>
    );

  return (
    <SlideWrapper
      prompt={{
        idBase: `number-${idBase}`,
        value: title,
        placeholder: "Type your question…",
        onChange: (html) => {
          setTitle(html);
          updateMetadata({ title: html });
        },
        onBlur: flush,
      }}
      footer={<p>{footerText}</p>}
    >
      <SettingsCard title="Correct answer" action={preview}>
        <Dropdown
          label="Accepted as correct"
          id={`number-grading-${idBase}`}
          options={GRADING_OPTIONS}
          value={[grading]}
          onChange={(values) => {
            handleGradingChange((values[0] as Grading | undefined) ?? "UNSCORED");
          }}
        />
        {grading === "RANGE" && (
          <SettingsRow>
            <NumberInput
              label="From"
              id={`number-from-${idBase}`}
              value={rangeFrom}
              onChange={(next) => {
                setRangeFrom(next);
                updateSlideContent(commitRange(next, rangeTo));
              }}
              onBlur={flush}
            />
            <NumberInput
              label="To"
              id={`number-to-${idBase}`}
              value={rangeTo}
              onChange={(next) => {
                setRangeTo(next);
                updateSlideContent(commitRange(rangeFrom, next));
              }}
              onBlur={flush}
            />
          </SettingsRow>
        )}
        {grading === "EXACT" && (
          <NumberInput
            label="Correct value"
            id={`number-correct-${idBase}`}
            value={exactValue}
            onChange={(next) => {
              setExactValue(next);
              updateSlideContent({ scoreMode: "EXACT", answer: next, tolerance: 0 });
            }}
            onBlur={flush}
          />
        )}
        <Input
          label="Unit label"
          id={`number-unit-${idBase}`}
          type="text"
          value={unit}
          placeholder="km, $, %"
          onChange={(event) => {
            const next = event.target.value;
            setUnit(next);
            updateSlideContent({ unit: next });
          }}
          onBlur={flush}
        />
      </SettingsCard>
    </SlideWrapper>
  );
};

export { NumberSlideContent };
