// Text input wrapped with label + helper/error message slot. Variant maps to a
// className on the <input>; `errorMessage` (when set) forces variant="error" so
// the input border tint and helper text tint together. `fullWidth` lets the
// input fill its container instead of the default 300px (used inside tight
// editor cells like MCQ option cards). `className` merges onto the outer
// wrapper (matches RichTextInput); `ariaLabel` is forwarded to the underlying
// <input>. All other native input attributes flow through via `...rest`.
import React, { useId } from "react";
import type { InputBaseProps } from "../InputBaseProps";
import shared from "../Input.module.css";
import styles from "./Input.module.css";
import { BtnVariant } from "@ui/Buttons/Btn.types";

interface InputProps
  extends InputBaseProps, React.InputHTMLAttributes<HTMLInputElement> {
  variant?: BtnVariant;
  labelPosition?: "labelAbove" | "labelInFront";
  fullWidth?: boolean;
  compact?: boolean;
  withPadding?: boolean;
  ref?: React.RefObject<HTMLInputElement | null>;
}

/** We can optionally display some information below the input field, if an error message is relevant it will temporary replace the info **/
const Input = ({
  variant = "primary",
  infoMessage,
  label,
  labelPosition = "labelAbove",
  errorMessage,
  checked = false,
  fullWidth = false,
  compact = false,
  isBordered = true,
  className,
  ariaLabel,
  id,
  withPadding = true,
  ref,
  ...rest
}: InputProps) => {
  const inputVariant: BtnVariant = errorMessage != null ? "error" : variant;
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const hasMessage = errorMessage != null || infoMessage != null;

  return (
    <div
      className={[
        shared.inputContainer,
        shared[labelPosition],
        fullWidth && shared.fullWidth,
        className,

        withPadding && shared.withBottomPadding,
      ]
        .filter(Boolean)
        .join(" ")}>
      {label && <label htmlFor={inputId}>{label}</label>}
      <div
        className={[
          styles.input,
          fullWidth && styles.fullWidth,
          compact && styles.compact,
        ]
          .filter(Boolean)
          .join(" ")}>
        <input
          {...rest}
          id={inputId}
          ref={ref}
          aria-label={ariaLabel}
          aria-invalid={errorMessage != null || undefined}
          aria-describedby={hasMessage ? messageId : undefined}
          className={[
            shared.fieldControl,
            inputVariant !== "brand" && shared[inputVariant],
            !isBordered && shared.noBorders,
          ]
            .filter(Boolean)
            .join(" ")}
        />

        {hasMessage && (
          <span
            id={messageId}
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

        {checked && (
          <span className={styles.checked}>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              fill='none'
              viewBox='0 0 24 24'
              strokeWidth={1.5}>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='m4.5 12.75 6 6 9-13.5'
              />
            </svg>
          </span>
        )}
      </div>
    </div>
  );
};

export { Input };
