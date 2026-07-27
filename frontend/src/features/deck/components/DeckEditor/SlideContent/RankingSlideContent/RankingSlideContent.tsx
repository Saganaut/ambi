/**
 * Author surface for a Ranking slide.
 *
 * Prompt on top, then a vertical list of up to eight items. The on-screen order
 * is the correct order (top → bottom); at play time the items are shuffled and
 * the player drags them back into order. Drag a row's grip handle to reorder —
 * `useRankingEditor` mirrors the list order into `correctOrder` on every
 * structural change so the backend stays consistent.
 *
 * There is exactly one `useRankingEditor` here; each row is a controlled
 * `RankingItemEditable` that receives its slice of the editor surface as props,
 * so all writes funnel through a single draft + debounce buffer.
 */
import { useState } from "react";

import { resolveDatumColor } from "@/shared/components/Charts/optionPalette";
import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { DragDropWrapper } from "@components/Wrappers/DragDropWrapper";
import { MAX_RANKING_ITEMS, useRankingEditor } from "@deck/hooks/useRankingEditor";
import { SlideContentWrapper } from "../SlideContentWrapper";
import { EmptySelect, ItemList, SectionHeader } from "../_shared";
import { RankingItemEditable } from "./RankingItemEditable";

interface RankingSlideContentProps {
  deckId: string;
  slideId: string;
}

const RankingSlideContent = ({ deckId, slideId }: RankingSlideContentProps) => {
  const {
    question,
    schedulePrompt,
    flush,
    canAddItem,
    addItem,
    handleItemDragEnd,
    canRemove,
    scheduleItem,
    setItemColor,
    setItemImage,
    removeItem,
  } = useRankingEditor(deckId, slideId);
  const openPicker = useGalleryPicker();

  const [prompt, setPrompt] = useState(question?.prompt ?? "");
  // Which row's menu is open — at most one per slide. Focusing a row's label
  // opens its menu (and thereby closes any other); the menu owns dismissal.
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [syncedFromId, setSyncedFromId] = useState(question?.id);

  // Resync the local mirror when the active slide changes ("derive state during
  // render" — safe when the new value differs).
  if (question && syncedFromId !== question.id) {
    setSyncedFromId(question.id);
    setPrompt(question.prompt);
    setOpenMenuId(null);
  }

  if (!question) return <EmptySelect title="Ranking" />;

  return (
    <SlideContentWrapper
      prompt={{
        idBase: `rank-${question.id}`,
        value: prompt,
        placeholder: "How should players rank these?",
        onChange: (html: string) => {
          setPrompt(html);
          schedulePrompt(html);
        },
        onBlur: flush,
      }}
      footer={<p>Drag the grip to set the correct order — top is first.</p>}
    >
      <SectionHeader label="Items" hint="top → bottom is the correct order" />
      <ItemList
        addLabel={canAddItem ? "Add item" : `Maximum ${MAX_RANKING_ITEMS.toString()} items`}
        canAdd={canAddItem}
        onAdd={addItem}
      >
        <DragDropWrapper onReorder={handleItemDragEnd}>
          {question.items.map((item, idx) => (
            <RankingItemEditable
              key={item.id ?? idx}
              item={item}
              sortIndex={idx}
              color={resolveDatumColor(item.color, idx)}
              menuOpen={item.id != null && openMenuId === item.id}
              canRemove={canRemove}
              onMenuOpenChange={(open) => {
                setOpenMenuId(open ? (item.id ?? null) : null);
              }}
              onScheduleLabel={(next) => {
                scheduleItem(item.id, next);
              }}
              onFlush={flush}
              onSetColor={(next) => {
                setItemColor(item.id, next);
              }}
              onSetImage={(image) => {
                setItemImage(item.id, image);
              }}
              onRemove={() => {
                removeItem(item.id);
              }}
              openPicker={openPicker}
            />
          ))}
        </DragDropWrapper>
      </ItemList>
    </SlideContentWrapper>
  );
};

export { RankingSlideContent };
