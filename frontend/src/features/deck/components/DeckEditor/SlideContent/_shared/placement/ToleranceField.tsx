/**
 * The tolerance percent input every placement editor puts in a card header.
 *
 * Tolerance is stored as a normalized radius but authored in whole percents;
 * this wrapper is the one place that conversion lives, so no editor hand-rolls
 * a ×100 / ÷100 pair around the shared `NumberInput`.
 */
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";

interface ToleranceFieldProps {
  id: string;
  /** Normalized radius [0, 1]. */
  value: number;
  /** Normalized bounds — shown to the author as percents. */
  min: number;
  max: number;
  disabled?: boolean;
  /** The new normalized radius. */
  onChange: (value: number) => void;
}

const ToleranceField = ({ id, value, min, max, disabled, onChange }: ToleranceFieldProps) => (
  <NumberInput
    compact
    id={id}
    label="Tolerance %"
    labelPosition="labelInFront"
    min={Math.round(min * 100)}
    max={Math.round(max * 100)}
    value={Math.round(value * 100)}
    disabled={disabled}
    onChange={(next) => {
      onChange(next / 100);
    }}
  />
);

export { ToleranceField };
