// Shared chrome props for the native-form inputs (Input, TextArea, NumberInput,
// Checkbox, Radio, Toggle, InputWithButton). Intentionally has NO HTML element
// coupling — each component composes this with the appropriate
// React.InputHTMLAttributes<HTMLInputElement> / TextareaHTMLAttributes<…> so
// attrs like `maxLength`, `rows`, `checked` stay correctly typed per element.
//
// `labelPosition` is NOT here on purpose: stacked inputs use
// "labelAbove" | "labelInFront", toggle-shaped controls use
// "labelBefore" | "labelAfter". Each component declares its own union.
//
// `className` is also not here — it already comes in via every native-attrs
// extension (React.HTMLAttributes), so re-declaring it would shadow that.

import type { ReactNode } from "react";

export interface InputBaseProps {
  label?: ReactNode;
  infoMessage?: string;
  errorMessage?: string;
  isBordered?: boolean;
  ariaLabel?: string;
}
