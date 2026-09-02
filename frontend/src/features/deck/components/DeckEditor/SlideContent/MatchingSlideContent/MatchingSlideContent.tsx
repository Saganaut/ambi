import { useState } from "react";

import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { MAX_MATCHING_PAIRS, useMatchingEditor } from "@deck/hooks/useMatchingEditor";
import { Toggle } from "@saganaut/ambi-ui";
import { SlideWrapper } from "../SlideWrapper";
import { AddItemCard, EmptySelect, ScoringFooter, SectionHeader } from "../_shared";
import { SlideContentProps } from "../_shared/Item.types";
import shared from "../_shared/_shared.module.css";
import { MatchingPairEditable } from "./MatchingPairEditable";
import styles from "./MatchingSlideContent.module.css";

const MatchingSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const editor = useMatchingEditor(deckId, slideId);
  const { question } = editor;
  const openPicker = useGalleryPicker(deckId);

  const [prompt, setPrompt] = useState(question?.prompt ?? "");
  // Which card's menu is open — at most one per slide. Focusing a card's
  // field opens its menu (and thereby closes any other); the menu owns
  // dismissal.
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [syncedFromId, setSyncedFromId] = useState(question?.id);
  // Resync the local mirror when the active slide changes ("derive state
  // during render" — safe when the new value differs).
  if (question && syncedFromId !== question.id) {
    setSyncedFromId(question.id);
    setPrompt(question.prompt);
    setOpenMenuId(null);
  }

  if (!question) return <EmptySelect title="Matching" />;

  const { pairs, scorable } = question;

  return (
    <SlideWrapper
      prompt={{
        idBase: `matching-${question.id}`,
        value: prompt,
        placeholder: "Ask players to match the pairs…",
        onChange: (html) => {
          setPrompt(html);
          editor.schedulePrompt(html);
        },
        onBlur: editor.flush,
      }}
      footer={
        scorable ? (
          <p>Scored when a player reproduces every match.</p>
        ) : (
          <ScoringFooter visible message="Toggle Scorable to award points for a correct match." />
        )
      }
    >
      <SectionHeader
        label="Pairs"
        hint={`${pairs.length.toString()} / ${MAX_MATCHING_PAIRS.toString()} · each card holds a phrase or an image`}
        action={
          <Toggle
            id={`matching-scorable-${question.id}`}
            label="Scorable"
            checked={scorable}
            onChange={(e) => {
              editor.setScorable(e.target.checked);
            }}
          />
        }
      />
      <div className={shared.itemList}>
        <div className={styles.pairsGrid}>
          {pairs.map((pair, index) =>
            pair.left.id ? (
              <MatchingPairEditable
                key={pair.left.id}
                pair={pair}
                pairIndex={index}
                openMenuId={openMenuId}
                canRemovePair={editor.canRemovePair}
                onMenuOpenChange={(cardId, open) => {
                  setOpenMenuId(open ? (cardId ?? null) : null);
                }}
                onScheduleLabel={editor.scheduleCardLabel}
                onFlush={editor.flush}
                onSetColor={editor.setCardColor}
                onSetImage={editor.setCardImage}
                onRemovePair={() => {
                  editor.removePair(pair.left.id);
                }}
                openPicker={openPicker}
              />
            ) : null,
          )}
        </div>
        <AddItemCard
          label={editor.canAddPair ? "Add pair" : `Maximum ${MAX_MATCHING_PAIRS.toString()} pairs`}
          disabled={!editor.canAddPair}
          onAdd={editor.addPair}
        />
      </div>
    </SlideWrapper>
  );
};

export { MatchingSlideContent };
