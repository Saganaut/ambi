// Numeric input: same labelled-container layout as Input, but the value/onChange
// API is typed as `number` so callers skip the parse-fallback dance. The native
// number spinners can't be styled to the design, so they're suppressed and a
// custom two-button stepper drives min/max/step. The field grows to fill its
// parent — the host dictates the width.
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";
import React from "react";
import shared from "../Input.module.css";
import type { InputBaseProps } from "../InputBaseProps";
import styles from "./NumberInput.module.css";

interface NumberInputProps
  extends
    InputBaseProps,
    Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "size"> {
  value: number;
  onChange: (value: number) => void;
  labelPosition?: "labelAbove" | "labelInFront";
  fullWidth?: boolean;
  compact?: boolean;
  size?: NumberInputSize;
}

type NumberInputSize = "sm" | "md" | "lg";

const toNumber = (raw: string | number | undefined): number | undefined => {
  if (raw == null || raw === "") return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
};

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
  size = "md",
  disabled,
  min,
  max,
  step,
  placeholder,
}: NumberInputProps) => {
  const minN = toNumber(min);
  const maxN = toNumber(max);
  const stepN = toNumber(step) ?? 1;
  const current = Number.isFinite(value) ? value : 0;

  const clamp = (candidate: number) => {
    let next = candidate;
    if (minN != null) next = Math.max(minN, next);
    if (maxN != null) next = Math.min(maxN, next);
    return next;
  };

  const stepBy = (delta: number) => {
    if (disabled) return;
    onChange(clamp(current + delta));
  };

  const atMax = maxN != null && current >= maxN;
  const atMin = minN != null && current <= minN;

  return (
    <div
      className={[shared.inputContainer, shared[labelPosition], fullWidth ? shared.fullWidth : ""]
        .filter(Boolean)
        .join(" ")}
    >
      {label && <label htmlFor={id}>{label}</label>}
      <div className={[styles.wrapper, compact ? styles.compact : ""].filter(Boolean).join(" ")}>
        <div
          className={[
            styles.field,
            styles[size],
            compact ? styles.compact : "",
            disabled ? styles.disabled : "",
            errorMessage != null ? styles.error : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <input
            type="number"
            id={id}
            name={name}
            value={current}
            onChange={(event) => {
              const next = Number(event.target.value);
              onChange(Number.isFinite(next) ? next : 0);
            }}
            onBlur={onBlur}
            disabled={disabled}
            min={min}
            max={max}
            step={step}
            placeholder={placeholder}
            className={[styles.input, errorMessage != null ? styles.error : ""]
              .filter(Boolean)
              .join(" ")}
          />
          <div className={styles.stepper}>
            <button
              type="button"
              tabIndex={-1}
              aria-label="Increase"
              className={[styles.stepBtn, styles.stepUp].join(" ")}
              disabled={disabled || atMax}
              onClick={() => stepBy(stepN)}
            >
              <ChevronUpIcon className={styles.icon} />
            </button>
            <button
              type="button"
              tabIndex={-1}
              aria-label="Decrease"
              className={[styles.stepBtn, styles.stepDown].join(" ")}
              disabled={disabled || atMin}
              onClick={() => stepBy(-stepN)}
            >
              <ChevronDownIcon className={styles.icon} />
            </button>
          </div>
        </div>
        {(errorMessage != null || infoMessage != null) && (
          <span
            className={[
              shared.inputInfoMessage,
              styles.message,
              errorMessage && shared.errorMessage,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {errorMessage ?? infoMessage}
          </span>
        )}
      </div>
    </div>
  );
};

export { NumberInput };
