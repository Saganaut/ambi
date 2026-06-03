// Common radio input component used in form option groups throughout the app
import React, { useId } from "react";
import type { InputBaseProps } from "../InputBaseProps";
import shared from "../Input.module.css";
import styles from "./Radio.module.css";

interface RadioProps
  extends InputBaseProps,
    React.InputHTMLAttributes<HTMLInputElement> {
  labelPosition?: "labelBefore" | "labelAfter";
}

const Radio = ({
  id,
  label,
  labelPosition = "labelAfter",
  checked,
  onChange,
  name,
  value,
  disabled,
  errorMessage,
  infoMessage,
}: RadioProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div
      className={[
        styles.radioContainer,
        labelPosition === "labelBefore" ? styles.labelBefore : "",
      ]
        .filter(Boolean)
        .join(" ")}>
      <input
        type='radio'
        id={inputId}
        className={styles.radioInput}
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <label htmlFor={inputId} className={styles.radioWrap}>
        <span className={styles.radioControl} />
        {label && <span className={styles.radioLabelText}>{label}</span>}
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

export { Radio };
