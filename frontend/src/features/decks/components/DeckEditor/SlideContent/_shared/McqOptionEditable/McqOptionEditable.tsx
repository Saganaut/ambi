/**
 * Full author surface for a single McqOption inside an MCQ slide.
 *
 * Layout:
 *   - Card body (always visible): index pill + popover-trigger button at the
 *     top, the option-text input below, and the "Correct" Toggle at the
 *     bottom. Anything beyond text/correct lives in the popover.
 *   - Popover (opened by clicking the trigger; dismissed by clicking outside
 *     or pressing Escape): image controls (gallery picker + paste-URL + clear),
 *     a color swatch, and the "remove option" button. Built on the shared
 *     `Popover` primitive so it stays visually consistent with the
 *     RichTextInput toolbar and any future inline-edit popovers.
 *
 * This is a controlled card: the freshest `option`, its `index`/`isCorrect`/
 * `canRemove`, and all write handlers come from the parent's single
 * `useMcqEditor` instance as props. The card keeps only a local mirror of the
 * text field (for responsive typing) and the popover open state; every persist
 * is delegated up via `onScheduleText` / `onCommit` / `onToggleCorrect` /
 * `onRemove`, so all option writes funnel through one debounce buffer and can't
 * stomp each other.
 *
 * Image field: every option carries a single `AppImage`. The gallery picker
 * returns a complete image and we hand it straight up; pasted URLs become
 * external images. The backend strips derived URLs on write for internal
 * images and rehydrates them on read, so there's nothing to sanitize here.
 */
// TODO(migration): stubbed pending slide-block migration. The gallery image
// picker was wired through `@hooks/useGalleryPicker`, which no longer exists.
// `handlePickFromGallery` is reduced to a flush/close no-op; everything else
// in the option card (text, correct toggle, color, clear-image, remove, dnd)
// still works.
import { useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/react/sortable";
import { type McqOption as McqOptionType } from "@store/AmbiApi";
import { TextArea } from "@components/Forms/Input/TextArea/TextArea";
import { IconBtn } from "@ui/Buttons/IconBtn";

import { useTheme } from "@hooks/useTheme";
import { useFitText } from "@hooks/useFitText";
import {
  emptyImage,
  isImageEmpty,
  largestUrl,
  resolveImageUrl,
} from "@utils/image";
import styles from "./McqOptionEditable.module.css";
import { EllipsisVerticalIcon } from "@heroicons/react/24/solid";
import { ProgressBar } from "@ui/ProgressBar/ProgressBar";
import { EditOptionToolbar } from "./EditOptionToolbar";
import { Container } from "@components/Containers/Container";
import QuizPoints from "@assets/icons/content/quiz-points.svg?react";
import Sad from "@assets/icons/content/sad.svg?react";

// Six swatches spaced evenly around the wheel from the theme's primary hue.
// Constant lightness/chroma keeps them visually balanced and re-themes
// cascade automatically. Authors can still override per-option via the
// color swatch in the popover (`option.color`).
const OPTION_HUE_OFFSETS = [0, 60, 120, 180, 240, 300] as const;
const MAX_OPTION_COLORS = OPTION_HUE_OFFSETS.length;
const buildOptionPalette = (huePrimary: number): string[] =>
  OPTION_HUE_OFFSETS.map(
    (offset) => `oklch(0.65 0.18 ${((huePrimary + offset) % 360).toString()})`,
  );

interface McqOptionEditableProps {
  /** The freshest option from the parent's editor — fully controlled. */
  option: McqOptionType;
  /** Position in the parent's option list. Forwarded to @dnd-kit's
   *  `useSortable` so the parent's DragDropProvider can reorder. */
  sortIndex: number;
  /** Display position (0-based) for the index pill / colour palette. */
  index: number;
  /** Whether this option's id is in the slide's `correctOptionIds`. */
  isCorrect: boolean;
  /** Whether removing is allowed (above `MIN_MCQ_OPTIONS`). */
  canRemove: boolean;
  /** Whether adding is allowed (below `MAX_MCQ_OPTIONS`). */
  canAddOption: boolean;
  addOption: () => void;
  /** Debounced field edit (text / colour). */
  onScheduleText: (next: McqOptionType) => void;
  /** Immediate field edit (e.g. clearing the image). */
  onCommit: (next: McqOptionType) => void;
  onToggleCorrect: () => void;
  onRemove: () => void;
  /** Flush any pending debounced edit immediately (bind to blur). */
  flush: () => void;
}

const McqOptionEditable = ({
  option,
  sortIndex,
  index,
  isCorrect,
  canRemove,
  canAddOption,
  addOption,
  onScheduleText,
  onCommit,
  onToggleCorrect,
  onRemove,
  flush,
}: McqOptionEditableProps) => {
  const optionId = option.id;
  // `McqOptionId` is a `{ value? }` wrapper — use the bare value string for the
  // dnd id, DOM ids, and image cache-bust seeds (stringifying the object would
  // collide every card on "[object Object]").
  const optionKey = optionId ?? "";
  const { huePrimary } = useTheme();

  // dnd-kit sortable: id must be stable per option so DragDropProvider can
  // identify the source on drop. The parent (McqSlideContent) wraps the grid
  // in a DragDropProvider and routes the drop to `handleOptionDragEnd`.
  const { ref: sortableRef, isDragging } = useSortable({
    id: optionKey,
    index: sortIndex,
  });

  // --- local mirror for the debounced text field ------------------------
  // Color uses a debounced commit while dragging; no separate local mirror
  // is needed because the native <input type="color"> owns the swatch DOM.
  // The paste-URL field now lives inside the gallery picker modal, so it
  // owns its own state per-open and we don't mirror it here.
  const [text, setText] = useState(option.text ?? "");

  // Auto-shrink the option text so it fits inside the bounded card
  // (the grid caps row height at `--mcq-option-max-h`). Below 11px the
  // hook stops shrinking and the card clips — at that point the author
  // has way too much text in an answer option anyway.
  const fitRef = useFitText<HTMLTextAreaElement>(text, {
    minPx: 11,
    maxPx: 18,
  });

  // Popover open state. Dismissed on outside pointerdown / Escape so the
  // popover behaves like the rest of the app's floating surfaces (Dropdown).
  const [popoverOpen, setPopoverOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Track which option id the local text mirror is synced to, so a slide
  // switch or reorder resyncs it. Compared by `option.id` reference, stable
  // between debounced commits.
  const [syncedFromId, setSyncedFromId] = useState(option.id);

  // Combine @dnd-kit's sortable ref with our local cardRef (used by the
  // outside-click detector below). Same pattern as SlideThumbnail.
  const setCardRef = (node: HTMLDivElement | null) => {
    cardRef.current = node;
    if (typeof sortableRef === "function") sortableRef(node);
  };

  useEffect(() => {
    if (!popoverOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (!cardRef.current?.contains(e.target as Node)) setPopoverOpen(false);
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

  // Resync local mirror when the active option id changes (slide switch
  // or option re-order). React's "derive state during render" pattern.
  if (syncedFromId !== option.id) {
    setSyncedFromId(option.id);
    setText(option.text ?? "");
  }

  // --- handlers --------------------------------------------------------

  const handleTextChange = (next: string) => {
    setText(next);
    onScheduleText({ ...option, text: next });
  };

  /** TODO(migration): stubbed pending slide-block migration. Previously
   *  opened the gallery picker and wrote the chosen Image into the option.
   *  The picker hook is gone, so this just flushes and closes the popover. */
  const handlePickFromGallery = () => {
    flush();
    setPopoverOpen(false);
  };

  const handleClearImage = () => {
    flush();
    onCommit({ ...option, image: emptyImage() });
  };

  const handleColorChange = (next: string) => {
    // Color picker fires on every drag tick; debounce the writes.
    onScheduleText({ ...option, color: next });
  };

  const handleRemove = () => {
    setPopoverOpen(false);
    onRemove();
  };

  // --- derived display state ------------------------------------------

  const previewUrl = largestUrl(option.image, optionKey) ?? "";
  const hasImage = !isImageEmpty(option.image);
  const thumbnailSrc = resolveImageUrl(
    option.image,
    "SM",
    optionKey,
    200,
    200,
    false,
  );
  const inputIdBase = `mcq-opt-${optionKey}`;
  const displayIndex = index >= 0 ? index + 1 : 0;
  // Theme-derived default; only applied when the author hasn't overridden
  // via the popover swatch. Indexes past MAX_OPTION_COLORS wrap.
  const palette = buildOptionPalette(huePrimary);
  const paletteIndex = (index >= 0 ? index : 0) % MAX_OPTION_COLORS;
  const paletteColor = palette[paletteIndex] ?? palette[0];
  const color = option.color ?? paletteColor;
  // Clicking anywhere on the card toggles the popover EXCEPT inside the
  // "interactive zones" below (text input + correct toggle), which call
  // `e.stopPropagation()` so their own click never bubbles up here. The
  // ellipsis trigger also stops propagation and toggles directly so it
  // doesn't double-toggle via the card handler.
  const handleCardClick = () => {
    setPopoverOpen((o) => !o);
  };

  return (
    <Container ref={setCardRef} name='McqOptionCard'>
      <div
        className={`${styles.card} ${isCorrect ? styles.cardCorrect : ""} ${isDragging ? styles.isDragging : ""}`}
        onClick={handleCardClick}>
        <div className={styles.topRow}>
          <div className={styles.textColumn}>
            <span className={styles.indexPill}>{displayIndex}</span>
            <div
              className={styles.interactiveZone}
              onClick={(e) => {
                e.stopPropagation();
              }}>
              <TextArea
                isBordered={false}
                id={`${inputIdBase}-text`}
                fullWidth
                autoGrow={false}
                ref={fitRef}
                rows={1}
                value={text}
                placeholder='Type the option…'
                onChange={(e) => {
                  handleTextChange(e.target.value);
                }}
                onBlur={flush}
              />
            </div>
          </div>
          <div
            className={styles.imgThumbnail}
            style={thumbnailSrc ? {} : { backgroundColor: color }}>
            {thumbnailSrc && <img src={thumbnailSrc} alt='' />}
          </div>
        </div>

        <ProgressBar value={100} color={color} />
        <div className={styles.footer}>
          <IconBtn
            fill='ghost'
            className={[styles.interactiveZone, styles.correctBtn].join(" ")}
            aria-label={isCorrect ? "Mark as wrong" : "Mark as correct"}
            aria-pressed={isCorrect}
            onClick={(e) => {
              e.stopPropagation();
              onToggleCorrect();
            }}
            icon={isCorrect ? <QuizPoints /> : <Sad />}
          />

          <IconBtn
            fill='ghost'
            size='xs'
            icon={<EllipsisVerticalIcon />}
            aria-label={`Edit option ${displayIndex.toString()}`}
            aria-expanded={popoverOpen}
            aria-haspopup='dialog'
            onClick={(e) => {
              e.stopPropagation();
              setPopoverOpen((o) => !o);
            }}
          />
        </div>
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
        {canAddOption && (
          <div className={styles.canAddBtn}>
            <IconBtn
              size='sm'
              shape='round'
              variant='info'
              onClick={addOption}
              disabled={!canAddOption}
              icon={
                <svg
                  width='100pt'
                  height='100pt'
                  version='1.1'
                  viewBox='0 0 100 100'
                  xmlns='http://www.w3.org/2000/svg'>
                  <path
                    d='m50 26.699c-1.3906 0-2.5195 1.1289-2.5195 2.5195v18.262h-18.262c-1.3906 0-2.5195 1.1289-2.5195 2.5195s1.1289 2.5195 2.5195 2.5195h18.262v18.262c0 1.3906 1.1289 2.5195 2.5195 2.5195s2.5195-1.1289 2.5195-2.5195v-18.262h18.262c1.3906 0 2.5195-1.1289 2.5195-2.5195s-1.1289-2.5195-2.5195-2.5195h-18.262v-18.262c0-1.3906-1.1289-2.5195-2.5195-2.5195z'
                    fill='green'
                  />
                </svg>
              }
            />
          </div>
        )}
      </div>{" "}
    </Container>
  );
};

export { McqOptionEditable };
