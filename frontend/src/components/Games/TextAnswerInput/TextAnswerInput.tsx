/**
 * Renders the input field for a TEXT_INPUT question round.
 * Once submitted, the field locks; when the round result arrives the local player's
 * submission is shown alongside a correct/incorrect indicator.
 */
import { useState } from "react";
import { Btn } from "@/components/Common/Buttons/Btn";
import { Input } from "@/components/Common/Input/Input/Input";
import styles from "./TextAnswerInput.module.css";

interface TextAnswerInputProps {
  // Used as a remount key by the parent so per-round local input state resets cleanly.
  questionId: string;
  submittedAnswer: string | null;
  correctAnswerText?: string;
  wasCorrect?: boolean;
  onSubmit: (answer: string) => void;
  disabled: boolean;
}

const TextAnswerInput = ({
  submittedAnswer,
  correctAnswerText,
  wasCorrect,
  onSubmit,
  disabled,
}: TextAnswerInputProps) => {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || submittedAnswer !== null) return;
    onSubmit(trimmed);
  };

  const locked = submittedAnswer !== null || disabled;
  const revealed = correctAnswerText !== undefined;

  return (
    <form className={styles.wrapper} onSubmit={handleSubmit}>
      <label htmlFor='answer-input' className={styles.label}>
        Type your answer
      </label>
      <div className={styles.row}>
        <Input
          id='answer-input'
          className={styles.field}
          value={submittedAnswer ?? value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setValue(e.target.value);
          }}
          placeholder='Your answer…'
          autoComplete='off'
          autoFocus
          disabled={locked}
          maxLength={200}
        />
        <Btn type='submit' disabled={locked || value.trim().length === 0}>
          Submit
        </Btn>
      </div>

      {submittedAnswer !== null && !revealed && (
        <p className={styles.waiting}>
          Answer locked in. Waiting for the round to end…
        </p>
      )}

      {revealed && (
        <div
          className={`${styles.reveal} ${wasCorrect ? styles.correct : styles.wrong}`}>
          {wasCorrect ? (
            <span>Correct!</span>
          ) : (
            <span>
              Correct answer: <strong>{correctAnswerText}</strong>
            </span>
          )}
        </div>
      )}
    </form>
  );
};

export { TextAnswerInput };
