import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";

interface ToleranceFieldProps {
  id: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}

const ToleranceField = ({ id, value, min, max, disabled, onChange }: ToleranceFieldProps) => (
  <NumberInput
    compact
    id={id}
    size="sm"
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
