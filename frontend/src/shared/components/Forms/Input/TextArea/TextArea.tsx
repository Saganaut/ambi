// Common textarea component matching Input structure for multi-line text entry.
// `fullWidth` stretches the field to its container (used inside tight editor
// cells like MCQ option cards), `isBordered={false}` drops the visible border
// so the field reads as plain text until focused.
import React from "react";
import type { InputBaseProps } from "../InputBaseProps";
import shared from "../Input.module.css";
import styles from "./TextArea.module.css";

interface TextAreaProps
  extends InputBaseProps,
    React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: "default";
  labelPosition?: "labelAbove" | "labelInFront";
  fullWidth?: boolean;
  // `autoGrow={false}` opts out of `field-sizing: content` so the field
  // fills its container instead of growing with content. Hosts using
  // this typically pair it with `useFitText` to shrink the font.
  autoGrow?: boolean;
  ref?: React.RefObject<HTMLTextAreaElement | null>;
}

const TextArea = ({
  value,
  ref,
  onChange,
  onBlur,
  maxLength,
  id,
  rows = 4,
  placeholder,
  disabled,
  infoMessage,
  label,
  labelPosition = "labelAbove",
  errorMessage,
  fullWidth = false,
  isBordered = true,
  autoGrow = true,
}: TextAreaProps) => {
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
        className={[styles.textarea, fullWidth ? styles.fullWidth : ""]
          .filter(Boolean)
          .join(" ")}>
        <textarea
          id={id}
          ref={ref}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          maxLength={maxLength}
          rows={rows}
          placeholder={placeholder}
          disabled={disabled}
          data-auto-grow={autoGrow ? "true" : "false"}
          className={[
            isBordered ? "" : styles.noBorders,
            autoGrow ? "" : styles.noAutoGrow,
          ]
            .filter(Boolean)
            .join(" ")}
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

export { TextArea };
