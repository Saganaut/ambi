/**
 * Inline option editor that sits in a chart's label slot, so an MCQ's options
 * stay fully editable while a results chart is shown on the canvas (the chart
 * replaces the option-card grid). It's the compact, horizontal sibling of
 * {@link McqOptionEditable}: a single-line text field, a correct/incorrect
 * toggle, and an ellipsis trigger opening the shared {@link EditOptionToolbar}
 * dropdown (image picker + clear, colour, remove) — so image editing, which
 * lives only in that dropdown, is available here too.
 *
 * Controlled exactly like the card: it takes the per-option bundle from
 * `useMcqOptionControls` (one binder over the single `useMcqEditor` instance),
 * keeps only a local text mirror for responsive typing, and delegates every
 * persist up so all option writes share one debounce buffer.
 */
import { useEffect, useRef, useState } from "react";

import { TextArea } from "@components/Forms/Input/TextArea/TextArea";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { EllipsisVerticalIcon } from "@heroicons/react/24/solid";
import { emptyImage, isImageEmpty, largestUrl } from "@utils/image";
import QuizPoints from "@assets/icons/content/quiz-points.svg?react";
import Sad from "@assets/icons/content/sad.svg?react";

import type { McqOptionControlProps } from "@deck/hooks/useMcqOptionControls";
import { EditOptionToolbar } from "../McqOptionEditable/EditOptionToolbar";
import { resolveOptionColor } from "../McqOptionEditable/optionColor";
import styles from "./EditableChartOptionLabel.module.css";

const EditableChartOptionLabel = ({
  option,
  index,
  isCorrect,
  canRemove,
  onScheduleText,
  onCommit,
  onToggleCorrect,
  onRemove,
  flush,
  openPicker,
}: McqOptionControlProps) => {
  const optionKey = option.id ?? "";

  const [text, setText] = useState(option.text ?? "");
  const [syncedFromId, setSyncedFromId] = useState(option.id);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Resync the local mirror when the bound option changes (slide switch or
  // reorder). "Derive state during render" — safe when the value differs.
  if (syncedFromId !== option.id) {
    setSyncedFromId(option.id);
    setText(option.text ?? "");
  }

  // Dismiss the popover on outside pointerdown / Escape, matching the card's
  // floating surfaces.
  useEffect(() => {
    if (!popoverOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setPopoverOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPopoverOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [popoverOpen]);

  const handleTextChange = (next: string) => {
    setText(next);
    onScheduleText({ ...option, text: next });
  };

  /** Flush + retract the popover before opening the picker so its
   *  document-level outside-click listener is gone before the modal renders. */
  const handlePickFromGallery = () => {
    flush();
    setPopoverOpen(false);
    openPicker(
      (image) => {
        onCommit({ ...option, image });
      },
      {
        title: "Option image",
        initialUrl: option.image?.externalSrc,
        cropWidth: 1,
        cropHeight: 1,
      },
    );
  };

  const handleClearImage = () => {
    flush();
    onCommit({ ...option, image: emptyImage() });
  };

  const handleColorChange = (next: string) => {
    onScheduleText({ ...option, color: next });
  };

  const handleRemove = () => {
    setPopoverOpen(false);
    onRemove();
  };

  const color = resolveOptionColor(option.color, index);
  const hasImage = !isImageEmpty(option.image);
  const previewUrl = largestUrl(option.image, optionKey) ?? "";
  const displayIndex = index >= 0 ? index + 1 : 0;
  const inputIdBase = `mcq-chart-opt-${optionKey}`;

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <div className={styles.input}>
        <TextArea
          isBordered={false}
          id={`${inputIdBase}-text`}
          fullWidth
          autoGrow={false}
          rows={1}
          value={text}
          placeholder='Type the option…'
          onChange={(e) => {
            handleTextChange(e.target.value);
          }}
          onBlur={flush}
        />
      </div>

      <IconBtn
        fill='ghost'
        size='xs'
        className={styles.correctBtn}
        aria-label={isCorrect ? "Mark as wrong" : "Mark as correct"}
        aria-pressed={isCorrect}
        onClick={onToggleCorrect}
        icon={isCorrect ? <QuizPoints /> : <Sad />}
      />

      <IconBtn
        fill='ghost'
        size='xs'
        icon={<EllipsisVerticalIcon />}
        aria-label={`Edit option ${displayIndex.toString()}`}
        aria-expanded={popoverOpen}
        aria-haspopup='dialog'
        onClick={() => {
          setPopoverOpen((o) => !o);
        }}
      />

      {popoverOpen && (
        <EditOptionToolbar
          canRemove={canRemove}
          handlePickFromGallery={handlePickFromGallery}
          hasImage={hasImage}
          handleRemove={handleRemove}
          handleClearImage={handleClearImage}
          handleColorChange={handleColorChange}
          handleClose={() => {
            setPopoverOpen(false);
          }}
          displayIndex={displayIndex}
          previewUrl={previewUrl}
          color={color}
          flush={flush}
        />
      )}
    </div>
  );
};

export { EditableChartOptionLabel };
