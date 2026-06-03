// Common checkbox input component used in forms throughout the app
import React, { useId } from "react";
import type { InputBaseProps } from "../InputBaseProps";
import shared from "../Input.module.css";
import styles from "./Checkbox.module.css";

interface CheckboxProps
  extends InputBaseProps,
    React.InputHTMLAttributes<HTMLInputElement> {
  labelPosition?: "labelBefore" | "labelAfter";
}

const Checkbox = ({
  id,
  label,
  labelPosition = "labelAfter",
  checked,
  onChange,
  disabled,
  errorMessage,
  infoMessage,
}: CheckboxProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div
      className={[
        styles.checkboxContainer,
        labelPosition === "labelBefore" ? styles.labelBefore : "",
      ]
        .filter(Boolean)
        .join(" ")}>
      <input
        type='checkbox'
        id={inputId}
        className={styles.checkboxInput}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <label htmlFor={inputId} className={styles.checkboxWrap}>
        <span className={styles.checkboxControl} />
        {label && <span className={styles.checkboxLabelText}>{label}</span>}
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

export { Checkbox };
