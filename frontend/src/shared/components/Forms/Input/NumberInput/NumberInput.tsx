// Numeric input: same chrome as Input, but the value/onChange API is typed as
// `number` so callers don't repeat the parse-fallback dance. min / max / step
// flow through to the native control. Mirrors the labelled-container layout
// of Input so the two read identically in a form. Reuses Input's CSS module
// so the bordered-text-box chrome stays in one place.
import React from "react";
import type { InputBaseProps } from "../InputBaseProps";
import shared from "../Input.module.css";
import styles from "../Input/Input.module.css";

interface NumberInputProps
  extends InputBaseProps,
    Omit<
      React.InputHTMLAttributes<HTMLInputElement>,
      "value" | "onChange" | "type"
    > {
  value: number;
  onChange: (value: number) => void;
  labelPosition?: "labelAbove" | "labelInFront";
  fullWidth?: boolean;
  compact?: boolean;
}

const NumberInput = ({
  value,
  onChange,
  onBlur,
  id,
  name,
  label,
  labelPosition = "labelAbove",
  infoMessage,
  errorMessage,
  fullWidth = false,
  compact = false,
  disabled,
  min,
  max,
  step,
  placeholder,
}: NumberInputProps) => {
  return (
    <div
      className={[
        shared.inputContainer,
        shared[labelPosition],
        fullWidth ? shared.fullWidth : "",
      ]
        .filter(Boolean)
        .join(" ")}>
      {label && <label htmlFor={id}>{label}</label>}
      <div
        className={[
          styles.input,
          fullWidth ? styles.fullWidth : "",
          compact ? styles.compact : "",
        ]
          .filter(Boolean)
          .join(" ")}>
        <input
          type='number'
          id={id}
          name={name}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => {
            const next = Number(e.target.value);
            onChange(Number.isFinite(next) ? next : 0);
          }}
          onBlur={onBlur}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          className={errorMessage != null ? styles.error : undefined}
        />
        {(errorMessage != null || infoMessage != null) && (
          <span
            className={[
              shared.inputInfoMessage,
              styles.message,
              errorMessage && shared.errorMessage,
            ]
              .filter(Boolean)
              .join(" ")}>
            {errorMessage ?? infoMessage}
          </span>
        )}
      </div>
    </div>
  );
};

export { NumberInput };
