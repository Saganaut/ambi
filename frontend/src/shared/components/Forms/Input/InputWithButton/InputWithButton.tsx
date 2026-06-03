// Text input fused with an action button, used for search or submit-inline patterns
import React from "react";
import type { ReactNode } from "react";
import type { InputBaseProps } from "../InputBaseProps";
import shared from "../Input.module.css";
import styles from "./InputWithButton.module.css";
import { Btn } from "@ui/Buttons/Btn";

interface InputWithButtonProps
  extends InputBaseProps, React.InputHTMLAttributes<HTMLInputElement> {
  labelPosition?: "labelAbove" | "labelInFront";
  buttonLabel?: ReactNode;
  onButtonClick?: () => void;
}

const InputWithButton = ({
  id,
  value,
  onChange,
  maxLength,
  placeholder,
  disabled,
  label,
  labelPosition = "labelAbove",
  buttonLabel = "Submit",
  onButtonClick,
  errorMessage,
  infoMessage,
}: InputWithButtonProps) => {
  return (
    <div className={[shared.inputContainer, shared[labelPosition]].join(" ")}>
      {label && <label htmlFor={id}>{label}</label>}
      <div className={styles.inputWithButton}>
        <input
          id={id}
          value={value}
          onChange={onChange}
          maxLength={maxLength}
          placeholder={placeholder}
          disabled={disabled}
        />
        <Btn type='button' onClick={onButtonClick} disabled={disabled}>
          {buttonLabel}
        </Btn>
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

export { InputWithButton };
