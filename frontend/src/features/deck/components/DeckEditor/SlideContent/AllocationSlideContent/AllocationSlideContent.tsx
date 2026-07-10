/**
 * Author surface for an Allocation slide (AllocationContent) — players split
 * a fixed pool of points (of whatever unit the prompt implies) across up to
 * six labelled options.
 *
 * Layout:
 *   - Prompt at the top (stored on the slide title, like TEXT/MCQ).
 *   - "Pool" card: the pool-size and per-option tolerance inputs, with a live
 *     badge in the header ("100 pts across 4 options") so the configured pool
 *     stays glanceable while editing.
 *   - The option rows: the shared `ItemField` label (focus-opened popover
 *     menu: color, image, delete — MCQ's option-menu pattern; this composer
 *     keeps at most one menu open) plus each option's slice of the answer
 *     key. Options are the same `McqOption` records MCQ uses, so they take
 *     the shared palette colors and images.
 *
 * Scoring is opt-in per option, Scales-style: "Set answer" seeds an even
 * share of the pool, the numeric field refines it, and the X clears it —
 * `correctAllocations` maps option id → points, graded within
 * `tolerancePerOption`. An empty key is a legitimate collect-only survey, so
 * the footer only nudges: toward a full key when partially scored, and
 * toward a pool-matching sum once every option is keyed.
 */
import { useState } from "react";

import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import {
  ALLOCATION_TOTAL_MIN,
  MAX_ALLOCATION_OPTIONS,
  useAllocationEditor,
} from "@deck/hooks/useAllocationEditor";
import {
  EmptySelect,
  ItemList,
  ScoringFooter,
  SectionHeader,
  SettingsCard,
  SettingsRow,
} from "../_shared";
import { resolveOptionColor } from "../_shared/McqOptionEditable/optionColor";
import type { SlideContentProps } from "../slideContentProps";
import { SlideContentWrapper } from "../SlideContentWrapper";
import { AllocationOptionEditable } from "./AllocationOptionEditable";
import styles from "./AllocationSlideContent.module.css";

const AllocationSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const editor = useAllocationEditor(deckId, slideId);
  const { question } = editor;
  const openPicker = useGalleryPicker();

  // Local mirrors keep the debounced inputs responsive: `updateSlideContent`
  // buffers to a draft and only commits on flush, so binding straight to the
  // store value would make these fields feel frozen mid-edit.
  const [prompt, setPrompt] = useState(question?.prompt ?? "");
  const [totalPoints, setTotalPoints] = useState(question?.totalPointsToAllocate ?? 100);
  const [tolerance, setTolerance] = useState(question?.tolerancePerOption ?? 0);
  // Which option's menu is open — at most one per slide. Focusing an option's
  // label opens its menu (and thereby closes any other); the menu owns
  // dismissal.
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [syncedFromId, setSyncedFromId] = useState(question?.id);
  // Resync every mirror when the active slide changes ("derive state during
  // render" — safe when the new value differs).
  if (question && syncedFromId !== question.id) {
    setSyncedFromId(question.id);
    setPrompt(question.prompt);
    setTotalPoints(question.totalPointsToAllocate);
    setTolerance(question.tolerancePerOption);
    setOpenMenuId(null);
  }

  if (!question) return <EmptySelect title="Allocation" />;

  const { options, correctAllocations } = question;

  const keyedCount = options.filter(
    (option) => option.id && correctAllocations[option.id] !== undefined,
  ).length;
  const fullyKeyed = options.length > 0 && keyedCount === options.length;
  const answerSum = Object.values(correctAllocations).reduce((sum, points) => sum + points, 0);
  // What "Set answer" seeds — an even share, so keying every option in turn
  // lands near a pool-matching sum.
  const answerSeed = Math.round(totalPoints / Math.max(1, options.length));

  const footer = fullyKeyed ? (
    answerSum === totalPoints ? (
      <p>
        Scored when a player&apos;s split lands within ±{question.tolerancePerOption.toString()}{" "}
        of every option&apos;s answer.
      </p>
    ) : (
      <ScoringFooter
        visible
        message={`The answers sum to ${answerSum.toString()}, not the ${totalPoints.toString()}-point pool — adjust them to match.`}
      />
    )
  ) : (
    <ScoringFooter
      visible
      message="Set the correct points for every option to make this slide scoreable."
    />
  );

  return (
    <SlideContentWrapper
      prompt={{
        idBase: `alloc-${question.id}`,
        value: prompt,
        placeholder: "Ask players to split the pool…",
        onChange: (html) => {
          setPrompt(html);
          editor.schedulePrompt(html);
        },
        onBlur: editor.flush,
      }}
      footer={footer}
    >
      <SettingsCard
        title="Pool"
        action={
          <span className={styles.poolBadge}>
            <strong>{totalPoints}</strong> pts across {options.length} options
          </span>
        }
      >
        <SettingsRow>
          <NumberInput
            label="Points to allocate"
            id={`alloc-total-${question.id}`}
            min={ALLOCATION_TOTAL_MIN}
            value={totalPoints}
            onChange={(next) => {
              setTotalPoints(next);
              editor.scheduleTotalPoints(next);
            }}
            onBlur={editor.flush}
          />
          <NumberInput
            label="Tolerance ±"
            id={`alloc-tolerance-${question.id}`}
            min={0}
            max={totalPoints}
            value={tolerance}
            onChange={(next) => {
              setTolerance(next);
              editor.scheduleTolerance(next);
            }}
            onBlur={editor.flush}
          />
        </SettingsRow>
      </SettingsCard>

      <SectionHeader label="Options" hint="players split the pool across these options" />
      <ItemList
        addLabel={
          editor.canAddOption
            ? "Add option"
            : `Maximum ${MAX_ALLOCATION_OPTIONS.toString()} options`
        }
        canAdd={editor.canAddOption}
        onAdd={editor.addOption}
      >
        {options.map((option, index) => (
          <AllocationOptionEditable
            key={option.id}
            option={option}
            sortIndex={index}
            color={resolveOptionColor(option.color, index)}
            menuOpen={openMenuId === option.id}
            canRemove={editor.canRemoveOption}
            totalPoints={totalPoints}
            answer={correctAllocations[option.id]}
            answerSeed={answerSeed}
            onMenuOpenChange={(open) => {
              setOpenMenuId(open ? option.id : null);
            }}
            onScheduleText={(text) => {
              editor.scheduleOptionText(option.id, text);
            }}
            onFlush={editor.flush}
            onSetColor={(color) => {
              editor.setOptionColor(option.id, color);
            }}
            onSetImage={(image) => {
              editor.setOptionImage(option.id, image);
            }}
            onScheduleAnswer={(points) => {
              editor.scheduleCorrectAllocation(option.id, points);
            }}
            onCommitAnswer={(points) => {
              editor.commitCorrectAllocation(option.id, points);
            }}
            onClearAnswer={() => {
              editor.clearCorrectAllocation(option.id);
            }}
            onRemove={() => {
              editor.removeOption(option.id);
            }}
            openPicker={openPicker}
          />
        ))}
      </ItemList>
    </SlideContentWrapper>
  );
};

export { AllocationSlideContent };
