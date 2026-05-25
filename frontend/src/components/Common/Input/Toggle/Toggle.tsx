// Toggle switch built on a visually-hidden checkbox; CSS :has() drives all visual state
import React, { useId } from "react";
import type { InputBaseProps } from "../InputBaseProps";
import shared from "../Input.module.css";
import styles from "./Toggle.module.css";

interface ToggleProps
  extends InputBaseProps,
    React.InputHTMLAttributes<HTMLInputElement> {
  labelPosition?: "labelBefore" | "labelAfter";
}

const Toggle = ({
  id,
  label,
  labelPosition = "labelAfter",
  checked,
  onChange,
  disabled,
  errorMessage,
  infoMessage,
}: ToggleProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div
      className={[
        styles.toggleContainer,
        labelPosition === "labelBefore" ? styles.labelBefore : "",
      ]
        .filter(Boolean)
        .join(" ")}>
      <input
        type='checkbox'
        id={inputId}
        className={styles.toggleInput}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <label htmlFor={inputId} className={styles.toggleWrap}>
        <span className={styles.toggleTrack}>
          <span className={styles.toggleThumb} />
        </span>
        {label && <span className={styles.toggleLabelText}>{label}</span>}
      </label>
      {(errorMessage != null || infoMessage != null) && (
        <span
          className={[
            shared.inputInfoMessage,
            styles.message,
            errorMessage ? shared.errorMessage : "",
          ]
            .filter(Boolean)
            .join(" ")}>
          {errorMessage ?? infoMessage}
        </span>
      )}
    </div>
  );
};

export { Toggle };
