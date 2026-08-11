/**
 * The Scales slide's target-editing plane — the statement bank plus the scale
 * settings (endpoint cards, track preview, tolerance). It is what the canvas
 * shows whenever no results visualisation is picked or previewed, so it is
 * SCALES' counterpart of MCQ's `DefaultResultsDisplay`.
 *
 * Tolerance is authored as a percentage of the span, not in scale units: the
 * span moves whenever an endpoint does, and a fraction survives that move.
 */
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import {
  SCALES_TOLERANCE_MAX_FRACTION,
  SCALES_TOLERANCE_MIN_FRACTION,
} from "@deck/hooks/useScalesEditor";
import { SlideContent, SlideContentSection } from "../SlideContentSection";
import { ScaleEndpointCard } from "./ScaleEndpointCard";
import { ScalePreview } from "./ScalePreview";
import styles from "./ScalesSlideContent.module.css";
import { ScalesStatementsSection } from "./ScalesStatementsSection";
import type { RenderScalesResultsDisplayOptions } from "./scalesResults.types";

const ScalesTargetsDisplay = (props: RenderScalesResultsDisplayOptions) => {
  const {
    editor,
    question,
    min,
    setMin,
    max,
    setMax,
    leftLabel,
    setLeftLabel,
    rightLabel,
    setRightLabel,
  } = props;

  const idBase = question.id;
  const span = max - min;
  const tolerancePercent = span > 0 ? Math.round((question.tolerance / span) * 100) : 0;

  return (
    <SlideContent>
      <ScalesStatementsSection {...props} />
      <SlideContentSection className={styles.scaleSection}>
        <SlideContentSection.Header>Scale</SlideContentSection.Header>
        <SlideContentSection.Body>
          <div className={styles.scaleGrid}>
            <ScaleEndpointCard
              side="left"
              idBase={idBase}
              value={min}
              incrementDisabled={min + 1 >= max}
              onCommitValue={(next) => {
                setMin(next);
                editor.actions.scheduleMin(next);
                editor.actions.flush();
              }}
              label={leftLabel}
              labelPlaceholder="e.g. Strongly disagree"
              onScheduleLabel={(next) => {
                setLeftLabel(next);
                editor.actions.scheduleLeftLabel(next);
              }}
              onFlush={editor.actions.flush}
            />
            <ScalePreview min={min} max={max} />
            <ScaleEndpointCard
              side="right"
              idBase={idBase}
              value={max}
              decrementDisabled={max - 1 <= min}
              onCommitValue={(next) => {
                setMax(next);
                editor.actions.scheduleMax(next);
                editor.actions.flush();
              }}
              label={rightLabel}
              labelPlaceholder="e.g. Strongly agree"
              onScheduleLabel={(next) => {
                setRightLabel(next);
                editor.actions.scheduleRightLabel(next);
              }}
              onFlush={editor.actions.flush}
            />
          </div>
          <div className={styles.toleranceRow}>
            <NumberInput
              compact
              id={`scales-tolerance-${idBase}`}
              label="Tolerance %"
              labelPosition="labelInFront"
              min={Math.round(SCALES_TOLERANCE_MIN_FRACTION * 100)}
              max={Math.round(SCALES_TOLERANCE_MAX_FRACTION * 100)}
              value={tolerancePercent}
              onChange={(next) => {
                editor.actions.setTolerance((next / 100) * span);
              }}
            />
          </div>
        </SlideContentSection.Body>
      </SlideContentSection>
    </SlideContent>
  );
};

export { ScalesTargetsDisplay };
