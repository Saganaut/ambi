/**
 * Author surface for a Ranking slide.
 * Order IS the answer key, so there is nothing to set per row.
 */
import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { DragDropWrapper } from "@components/Wrappers/DragDropWrapper";
import { MAX_RANKING_ITEMS, useRankingEditor } from "@deck/hooks/useRankingEditor";
import { AddItemCard, EmptySelect, SortableItemBankRow } from "../_shared";
import { SlideContentProps } from "../_shared/Item.types";
import { ItemToEditableRankingItem } from "../AllocationSlideContent/ItemFormatters";
import { SlideContent, SlideContentSection } from "../SlideContentSection";
import { SlideWrapper } from "../SlideWrapper";
import { useRankingDraft } from "./useRankingDraft";

const RankingSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const editor = useRankingEditor(deckId, slideId);
  const { question } = editor;
  const { prompt, setPrompt, openMenuId, setOpenMenuId } = useRankingDraft({ question });
  const openPicker = useGalleryPicker(deckId);

  if (!question) return <EmptySelect title="Ranking" />;

  return (
    <SlideWrapper
      prompt={{
        idBase: `rank-${question.id}`,
        value: prompt,
        placeholder: "How should players rank these?",
        onChange: (html: string) => {
          setPrompt(html);
          editor.actions.scheduleQuestionPrompt(html);
        },
        onBlur: editor.actions.flush,
      }}
      footer={<p>Drag the grip to set the correct order — top is first.</p>}
    >
      <SlideContent>
        <SlideContentSection>
          <SlideContentSection.Header>
            <span>Items</span>
            <span>top → bottom is the correct order</span>
          </SlideContentSection.Header>
          <SlideContentSection.Body>
            <DragDropWrapper onReorder={editor.actions.handleItemDragEnd}>
              {question.items.map((item, index) => (
                <SortableItemBankRow
                  key={item.id}
                  {...ItemToEditableRankingItem(
                    item,
                    index,
                    editor.actions,
                    editor.state,
                    openPicker,
                    setOpenMenuId,
                    openMenuId,
                  )}
                />
              ))}
              <AddItemCard
                label={
                  editor.state.canAddItem
                    ? "Add item"
                    : `Maximum ${MAX_RANKING_ITEMS.toString()} items`
                }
                disabled={!editor.state.canAddItem}
                onAdd={editor.actions.addItem}
              />
            </DragDropWrapper>
          </SlideContentSection.Body>
        </SlideContentSection>
      </SlideContent>
    </SlideWrapper>
  );
};

export { RankingSlideContent };
