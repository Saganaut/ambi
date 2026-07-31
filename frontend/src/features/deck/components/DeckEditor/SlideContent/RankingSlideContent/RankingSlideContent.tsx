/**
 * Author surface for a Ranking slide.
 * Order IS the answer key, so there is nothing to set per row.
 */
import { resolveDatumColor } from "@/shared/components/Charts/optionPalette";
import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { DragDropWrapper } from "@components/Wrappers/DragDropWrapper";
import { MAX_RANKING_ITEMS, useRankingEditor } from "@deck/hooks/useRankingEditor";
import { SlideContent, SlideContentSection } from "../SlideContentSection";
import { SlideWrapper } from "../SlideWrapper";
import { AddItemCard, EmptySelect, useSlideComposerState } from "../_shared";
import { SortableItemBankRow } from "../_shared/ItemBankRow/ItemBankRow";

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
    <SlideWrapper
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
      {" "}
      <SlideContent>
        <SlideContentSection>
          <SlideContentSection.Header>
            <span>Items</span>
            <span>top → bottom is the correct order</span>
          </SlideContentSection.Header>
          <SlideContentSection.Body>
            <DragDropWrapper onReorder={handleItemDragEnd}>
              {question.items.map((item, idx) => (
                <SortableItemBankRow
                  type="ranking"
                  key={item.id}
                  item={item}
                  index={idx}
                  color={resolveDatumColor(item.color, idx)}
                  menuOpen={composer.openMenuId === item.id}
                  canRemove={canRemove}
                  onMenuOpenChange={(open) => {
                    composer.setOpenMenuId(open ? item.id : null);
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
              {canAddItem && (
                <AddItemCard
                  label={canAddItem ? "Add item" : `Maximum ${MAX_RANKING_ITEMS.toString()} items`}
                  disabled={!canAddItem}
                  onAdd={addItem}
                />
              )}
            </DragDropWrapper>
          </SlideContentSection.Body>
        </SlideContentSection>
      </SlideContent>
    </SlideWrapper>
  );
};

export { RankingSlideContent };
