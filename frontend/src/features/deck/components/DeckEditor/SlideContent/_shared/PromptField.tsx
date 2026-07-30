// Big rich-text prompt at the top of every slide editor. Keeps placeholder /
// padding / id wiring consistent across kinds and owns the slide-editor's
// authoring rhythm — it's the first thing the author sees and types into.
import { RichTextInput } from "@components/Forms/Input/RichTextInput/RichTextInput";
import styles from "./_shared.module.css";

interface PromptFieldProps {
  /** Slide id base — used to derive a stable input id per slide. */
  idBase: string;
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  /** Frosted contrast plate behind the field. Driven centrally by whether the
   *  canvas has a background image — set by {@link SlideWrapper}, not
   *  individual editors, so the prompt stays legible over a busy background. */
  showContrastPlate?: boolean;
}

const PromptField = ({
  idBase,
  value,
  onChange,
  onBlur,
  placeholder = "Type your question…",
  showContrastPlate = false,
}: PromptFieldProps) => {
  return (
    <div className={styles.promptShell}>
      <RichTextInput
        id={`prompt-${idBase}`}
        isBordered={false}
        showContrastPlate={showContrastPlate}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        onBlur={onBlur}
        className={styles.promptField}
      />
    </div>
  );
};

export { PromptField };
export type { PromptFieldProps };
