// One source of truth for the per-option editing surface of an MCQ slide.
//
// Both the canvas option-card grid (`McqOptionEditable`) and the inline
// chart-label editor (`EditableChartOptionLabel`) need the exact same bundle of
// write handlers bound to a given option. Rather than re-binding that bundle in
// each consumer's `.map` (and risking the two drifting), this hook derives it
// once from the single `useMcqEditor` instance the canvas owns — so every
// option write, from either surface, still funnels through that one debounce
// buffer. The hook adds no state of its own; it's a thin binder over the editor
// result plus the gallery picker.
import type { McqOption } from "@deck/store/deckApi.gen";
import type { OpenGalleryPicker } from "@hooks/useGalleryPicker";

import type { UseMcqEditorResult } from "./useMcqEditor";

/** The controlled surface a single option editor consumes — matches the props
 *  `McqOptionEditable` already expects (its drag `sortIndex` is added by the
 *  card grid, which is the only surface that reorders). */
export interface McqOptionControlProps {
  option: McqOption;
  index: number;
  isCorrect: boolean;
  canRemove: boolean;
  canAddOption: boolean;
  addOption: () => void;
  onScheduleText: (next: McqOption) => void;
  onCommit: (next: McqOption) => void;
  onToggleCorrect: () => void;
  onRemove: () => void;
  flush: () => void;
  openPicker: OpenGalleryPicker;
}

export interface UseMcqOptionControlsResult {
  /** Bind the full editing surface for one option at its display index. */
  getOptionProps: (option: McqOption, index: number) => McqOptionControlProps;
  addOption: () => void;
  canAddOption: boolean;
}

const useMcqOptionControls = (
  editor: UseMcqEditorResult,
  openPicker: OpenGalleryPicker,
): UseMcqOptionControlsResult => {
  const {
    canAddOption,
    addOption,
    canRemove,
    isCorrect,
    scheduleOption,
    commitOption,
    toggleCorrect,
    removeOption,
    flush,
  } = editor;

  const getOptionProps = (
    option: McqOption,
    index: number,
  ): McqOptionControlProps => ({
    option,
    index,
    isCorrect: isCorrect(option.id),
    canRemove,
    canAddOption,
    addOption,
    onScheduleText: (next) => {
      scheduleOption(option.id, next);
    },
    onCommit: (next) => {
      commitOption(option.id, next);
    },
    onToggleCorrect: () => {
      toggleCorrect(option.id);
    },
    onRemove: () => {
      removeOption(option.id);
    },
    flush,
    openPicker,
  });

  return { getOptionProps, addOption, canAddOption };
};

export { useMcqOptionControls };
