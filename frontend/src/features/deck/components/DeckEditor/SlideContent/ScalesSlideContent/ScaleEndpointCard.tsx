// One end of the scale in the Scale settings card: pairs the endpoint's
// boundary value (a −/+ stepper) with its anchor label input, tinted by side
// so the two ends read at a glance (left rides the primary accent, right the
// secondary). Controlled by ScalesSlideContent — stepper taps commit
// immediately, the label debounces like every other text field.
import { Input } from "@components/Forms/Input/Input/Input";
import styles from "./ScalesSlideContent.module.css";

interface ScaleEndpointCardProps {
  side: "left" | "right";
  idBase: string;
  /** The endpoint's scale value (min for left, max for right). */
  value: number;
  decrementDisabled?: boolean;
  incrementDisabled?: boolean;
  /** Immediate value change from the stepper (steps of 1). */
  onCommitValue: (next: number) => void;
  label: string;
  labelPlaceholder: string;
  onScheduleLabel: (next: string) => void;
  onFlush: () => void;
}

const ScaleEndpointCard = ({
  side,
  idBase,
  value,
  decrementDisabled = false,
  incrementDisabled = false,
  onCommitValue,
  label,
  labelPlaceholder,
  onScheduleLabel,
  onFlush,
}: ScaleEndpointCardProps) => {
  const sideTitle = side === "left" ? "Left" : "Right";

  return (
    <div
      className={[
        styles.endpointCard,
        side === "left" ? styles.endpointLeft : styles.endpointRight,
      ].join(" ")}>
      <div className={styles.endpointHeader}>
        <span className={styles.endpointSide}>{sideTitle}</span>
        <div
          className={styles.endpointStepper}
          role='group'
          aria-label={`${sideTitle} value`}>
          <button
            type='button'
            className={styles.stepperBtn}
            aria-label={`Decrease ${side} value`}
            disabled={decrementDisabled}
            onClick={() => {
              onCommitValue(value - 1);
            }}>
            −
          </button>
          {/* aria-live: focus stays on the −/+ button after a tap, so announce
              the new value to assistive tech. */}
          <span className={styles.stepperValue} aria-live='polite'>
            {value}
          </span>
          <button
            type='button'
            className={styles.stepperBtn}
            aria-label={`Increase ${side} value`}
            disabled={incrementDisabled}
            onClick={() => {
              onCommitValue(value + 1);
            }}>
            +
          </button>
        </div>
      </div>
      <Input
        type='text'
        id={`scales-${side}label-${idBase}`}
        fullWidth
        withPadding={false}
        ariaLabel={`${sideTitle} label`}
        value={label}
        placeholder={labelPlaceholder}
        onChange={(e) => {
          onScheduleLabel(e.target.value);
        }}
        onBlur={onFlush}
      />
    </div>
  );
};

export { ScaleEndpointCard };
