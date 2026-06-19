/**
 * Full author surface for a single McqOption — the base (NONE) grid view of an
 * option. Composed from the same shared pieces as every chart label
 * ({@link Label} + {@link CorrectToggle} + {@link Menu}) under a per-option
 * {@link OptionProvider}, so there's one way to edit an option everywhere; this
 * file only adds the card chrome (frame, index pill, thumbnail, progress bar,
 * drag, add button) and the card-specific interaction (clicking anywhere on the
 * card opens the menu).
 *
 * It takes just `{ optionId, sortIndex }` — every write handler, the freshest
 * option, and its index come from the option context, so all writes funnel
 * through the single `useMcqEditor` debounce buffer.
 */
import { useSortable } from "@dnd-kit/react/sortable";
import { useEffect, useRef, useState } from "react";

import { Container } from "@components/Containers/Container";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { ProgressBar } from "@ui/ProgressBar/ProgressBar";
import { resolveImageUrl } from "@utils/image";

import { UseMcqEditorResult } from "@/features/deck/hooks/useMcqEditor";
import { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { McqOption } from "@/shared/types/elements";
import { CorrectToggle } from "../OptionControls/CorrectToggle";
import { Label } from "../OptionControls/Label";
import { Menu } from "../OptionControls/Menu";
import styles from "./McqOptionEditable.module.css";
import { resolveOptionColor } from "./optionColor";

interface McqOptionEditableProps {
  /** Identifies which option this card edits; resolved against the context. */
  optionId: string;
  /** Position in the parent's option list. Forwarded to @dnd-kit's
   *  `useSortable` so the parent's DragDropProvider can reorder. */
  sortIndex: number;
  UseMcqEditorResult: UseMcqEditorResult;
  displayAsPercentage?: boolean;
  openPicker: OpenGalleryPicker;
}

const McqOptionEditable = ({
  sortIndex,
  optionId,
  UseMcqEditorResult,
  displayAsPercentage,
  openPicker,
}: McqOptionEditableProps) => {
  // dnd-kit sortable: id must be stable per option so DragDropProvider can
  // identify the source on drop.
  const { ref: sortableRef, isDragging } = useSortable({
    id: optionId,
    index: sortIndex,
  });
  const {
    question,
    canAddOption,
    addOption,
    canRemove,
    isCorrect,
    flush,
    scheduleOption,
    commitOption,
    toggleCorrect,
    removeOption,
  } = UseMcqEditorResult;

  const option = question?.options.find((option) => option.id === optionId);

  // The card owns the menu's open state + outside-click boundary: the whole
  // card. Clicking anywhere on the card (outside the interactive zones, which
  // stop propagation) toggles the menu; clicking outside the card closes it.
  const [popoverOpen, setPopoverOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

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

  if (option == null) return <div> no option found</div>;
  const thumbnailSrc = resolveImageUrl(option.image, "SM", optionId, 200, 200, false);
  const color = resolveOptionColor(option.color, sortIndex);
  const displayIndex = sortIndex >= 0 ? sortIndex + 1 : 0;
  console.log("Display as percentage not implemented", displayAsPercentage);

  return (
    <Container ref={setCardRef} name="McqOptionCard">
      <div
        className={`${styles.card} ${isCorrect(optionId) ? styles.cardCorrect : ""} ${isDragging ? styles.isDragging : ""}`}
        onClick={() => {
          setPopoverOpen((o) => !o);
        }}
      >
        <div className={styles.topRow}>
          <div className={styles.textColumn}>
            <span className={styles.indexPill}>{displayIndex}</span>
            <div
              className={styles.interactiveZone}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <Label
                option={option}
                flush={flush}
                onScheduleText={(next: McqOption) => {
                  scheduleOption(option.id, next);
                }}
                fit
              />
            </div>
          </div>
          <div
            className={styles.imgThumbnail}
            style={thumbnailSrc ? {} : { backgroundColor: color }}
          >
            {thumbnailSrc && <img src={thumbnailSrc} alt="" />}
          </div>
        </div>

        <ProgressBar value={100} color={color} />
        <div className={styles.footer}>
          <CorrectToggle
            isCorrect={isCorrect(option.id)}
            onToggleCorrect={() => {
              toggleCorrect(option.id);
            }}
          />
          <Menu
            activeOption={option}
            activeOptionId={option.id}
            isOpen={popoverOpen}
            index={sortIndex}
            canRemove={canRemove}
            onScheduleText={(next: McqOption) => {
              scheduleOption(option.id, next);
            }}
            onCommit={(next: McqOption) => {
              commitOption(option.id, next);
            }}
            onRemove={() => {
              removeOption(option.id);
            }}
            flush={flush}
            openPicker={openPicker}
            onOpenChange={setPopoverOpen}
          />
        </div>
        {canAddOption && (
          <div className={styles.canAddBtn}>
            <IconBtn
              size="sm"
              shape="round"
              variant="info"
              onClick={addOption}
              disabled={!canAddOption}
              icon={
                <svg
                  width="100pt"
                  height="100pt"
                  version="1.1"
                  viewBox="0 0 100 100"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="m50 26.699c-1.3906 0-2.5195 1.1289-2.5195 2.5195v18.262h-18.262c-1.3906 0-2.5195 1.1289-2.5195 2.5195s1.1289 2.5195 2.5195 2.5195h18.262v18.262c0 1.3906 1.1289 2.5195 2.5195 2.5195s2.5195-1.1289 2.5195-2.5195v-18.262h18.262c1.3906 0 2.5195-1.1289 2.5195-2.5195s-1.1289-2.5195-2.5195-2.5195h-18.262v-18.262c0-1.3906-1.1289-2.5195-2.5195-2.5195z"
                    fill="green"
                  />
                </svg>
              }
            />
          </div>
        )}
      </div>
    </Container>
  );
};

export { McqOptionEditable };
