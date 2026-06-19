// The option's text field, sourced from the per-option context. A local mirror
// keeps typing responsive and resyncs when the bound option changes; edits are
// delegated up so all writes share the one debounce buffer. `fit` opts into
// `useFitText` for bounded slots (the option card shrinks text to fit); the
// chart label leaves it off and stays single-line. Layout (wrapper, click
// shielding) is the composer's job — this renders only the field.
import { useState } from "react";

import { TextArea } from "@components/Forms/Input/TextArea/TextArea";
import { useFitText } from "@hooks/useFitText";

import { McqOption } from "@/shared/types/elements";

interface LabelProps {
  /** Shrink text to fit a bounded slot (the option card). */
  fit?: boolean;
  option: McqOption;
  onScheduleText: (option: McqOption) => void;
  flush: () => void;
}

const Label = ({ option, onScheduleText, flush, fit = false }: LabelProps) => {
  const optionKey = option.id ?? "";

  const [text, setText] = useState(option.text ?? "");
  const [syncedFromId, setSyncedFromId] = useState(option.id);

  // Resync the mirror when the bound option changes (slide switch / reorder).
  if (syncedFromId !== option.id) {
    setSyncedFromId(option.id);
    setText(option.text ?? "");
  }

  // Called unconditionally to keep hook order stable; the ref is only attached
  // when `fit` is set.
  const fitRef = useFitText<HTMLTextAreaElement>(text, { minPx: 11, maxPx: 18 });

  const handleTextChange = (next: string) => {
    setText(next);
    onScheduleText({ ...option, text: next });
  };

  return (
    <TextArea
      isBordered={false}
      id={`mcq-opt-${optionKey}-text`}
      fullWidth
      autoGrow={false}
      ref={fit ? fitRef : undefined}
      rows={1}
      value={text}
      placeholder="Type the option…"
      onChange={(e) => {
        handleTextChange(e.target.value);
      }}
      onBlur={flush}
    />
  );
};

export { Label };
