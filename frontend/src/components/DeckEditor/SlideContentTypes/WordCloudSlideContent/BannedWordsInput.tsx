// Chip-style banned-words input. The author types in the text field; pressing
// Enter or blurring commits the typed phrase as a new chip. Click the × on a
// chip to remove it. Each chip is unique (case-folded), and we surface a
// "Nothing banned yet" empty state inside the chip strip so it doesn't
// collapse to zero height.
import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Input } from "@/components/Common/Input/Input/Input";
import styles from "./WordCloudSlideContent.module.css";

interface BannedWordsInputProps {
  idBase: string;
  words: string[];
  onChange: (next: string[]) => void;
}

const BannedWordsInput = ({ idBase, words, onChange }: BannedWordsInputProps) => {
  const [draft, setDraft] = useState("");

  const commitDraft = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const exists = words.some(
      (w) => w.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) {
      setDraft("");
      return;
    }
    onChange([...words, trimmed]);
    setDraft("");
  };

  const handleRemove = (word: string) => {
    onChange(words.filter((w) => w !== word));
  };

  return (
    <>
      <Input
        label='Add banned word'
        id={`wc-banned-input-${idBase}`}
        type='text'
        fullWidth
        value={draft}
        placeholder='Press Enter to ban'
        onChange={(e) => { setDraft(e.target.value); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitDraft();
          }
        }}
        onBlur={commitDraft}
      />
      <div
        className={[
          styles.bannedChips,
          words.length === 0 ? styles.bannedChipsEmpty : "",
        ]
          .filter(Boolean)
          .join(" ")}>
        {words.length === 0 ? (
          <span>Nothing banned yet.</span>
        ) : (
          words.map((word) => (
            <span key={word} className={styles.bannedChip}>
              {word}
              <button
                type='button'
                className={styles.bannedChipRemove}
                aria-label={`Remove "${word}"`}
                onClick={() => { handleRemove(word); }}>
                <XMarkIcon />
              </button>
            </span>
          ))
        )}
      </div>
    </>
  );
};

export { BannedWordsInput };
