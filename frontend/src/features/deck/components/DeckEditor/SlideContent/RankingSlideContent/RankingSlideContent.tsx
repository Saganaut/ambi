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
 * shared `PlacementRow` that receives its slice of the editor surface as
 * props, so all writes funnel through a single draft + debounce buffer. Every
 * row is `scored`: the authored order IS the answer key, so there is nothing
 * to set per row (and hence no `primaryAction` in its menu either).
 */
import { resolveDatumColor } from "@/shared/components/Charts/optionPalette";
import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { DragDropWrapper } from "@components/Wrappers/DragDropWrapper";
import {
  MAX_RANKING_ITEMS,
  RANKING_LABEL_MAX,
  useRankingEditor,
} from "@deck/hooks/useRankingEditor";
import { SlideContentWrapper } from "../SlideContentWrapper";
import {
  EmptySelect,
  ItemList,
  PlacementRow,
  SectionHeader,
  useSlideComposerState,
} from "../_shared";

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
  // The prompt mirror and which row's menu is open — at most one per slide.
  // Focusing a row's label opens its menu (and thereby closes any other); the
  // menu owns dismissal. Ranking arms no row, so `selectedItemId` goes unused.
  const composer = useSlideComposerState(question);

  if (!question) return <EmptySelect title="Ranking" />;

  return (
    <SlideContentWrapper
      prompt={{
        idBase: `rank-${question.id}`,
        value: composer.prompt,
        placeholder: "How should players rank these?",
        onChange: (html: string) => {
          composer.setPrompt(html);
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
            <PlacementRow
              key={item.id ?? idx}
              item={item}
              index={idx}
              color={resolveDatumColor(item.color, idx)}
              itemNoun="Item"
              labelMaxLength={RANKING_LABEL_MAX}
              scored
              draggable
              gripLabel={`Reorder item ${(idx + 1).toString()}`}
              menuOpen={item.id != null && composer.openMenuId === item.id}
              canRemove={canRemove}
              onMenuOpenChange={(open) => {
                composer.setOpenMenuId(open ? (item.id ?? null) : null);
              }}
              onScheduleLabel={(label) => {
                scheduleItem(item.id, { ...item, label });
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
