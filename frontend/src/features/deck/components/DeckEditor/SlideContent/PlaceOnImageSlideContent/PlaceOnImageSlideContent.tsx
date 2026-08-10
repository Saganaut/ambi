import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { DragDropWrapper } from "@components/Wrappers/DragDropWrapper";
import {
  isPlaced,
  MAX_PLACE_TARGETS,
  PLACE_TOLERANCE_MAX,
  PLACE_TOLERANCE_MIN,
  usePlaceOnImageEditor,
} from "@deck/hooks/usePlaceOnImageEditor";
import type { PlacePoint } from "@deck/store/deckApi.gen";
import { Btn } from "@ui/Buttons/Btn";
import { largestUrl } from "@utils/image";
import {
  AddItemCard,
  EmptySelect,
  ScoringFooter,
  SortableItemBankRow,
  ToleranceField,
} from "../_shared";
import shared from "../_shared/_shared.module.css";
import { SlideContentProps } from "../_shared/Item.types";
import { ItemToEditablePlaceOnImageItem } from "../AllocationSlideContent/ItemFormatters";
import { SlideContent, SlideContentSection } from "../SlideContentSection";
import { SlideWrapper } from "../SlideWrapper";
import { PlaceOnImageSurface } from "./PlaceOnImageSurface";
import { usePlaceOnImageDraft } from "./usePlaceOnImageDraft";

const PlaceOnImageSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const editor = usePlaceOnImageEditor(deckId, slideId);
  const { question } = editor;
  const openPicker = useGalleryPicker(deckId);
  const {
    prompt,
    setPrompt,
    tolerance,
    setTolerance,
    openMenuId,
    setOpenMenuId,
    selectedItemId,
    setSelectedItemId,
  } = usePlaceOnImageDraft({ question });

  if (!question) return <EmptySelect title="Place on image" />;

  const { targets, correctPositions } = question;
  const imageUrl = largestUrl(question.image, question.id);
  const hasImage = imageUrl != null;
  const placedCount = targets.filter(isPlaced).length;
  const fullyAssigned = targets.length > 0 && placedCount === targets.length;

  const toggleSelect = (targetId: string) => {
    setSelectedItemId((held) => (held === targetId ? null : targetId));
  };

  const setTargetPosition = (targetId: string, point: PlacePoint | null) => {
    if (point == null) {
      editor.actions.clearCorrectAnswer(targetId);
      return;
    }
    editor.actions.commitCorrectAnswer(targetId, point);
  };

  const pickImage = () => {
    editor.actions.flush();
    // Backing images are square, so authored target coordinates land on the
    // same plane every player sees regardless of the source's shape. Uploads
    // and gallery picks alike crop to that frame.
    openPicker(editor.actions.setImage, {
      title: "Backing image",
      current: question.image,
      crop: { mode: "required", aspect: 1 },
    });
  };

  const footer = !hasImage ? (
    <ScoringFooter visible message="Choose a backing image for players to pin." />
  ) : fullyAssigned ? (
    <p>Scored when every pin lands inside its own target&apos;s tolerance circle.</p>
  ) : (
    <ScoringFooter
      visible
      message={
        targets.length === 0
          ? "Add at least one target to make this slide scoreable."
          : "Give every target a position to make this slide scoreable."
      }
    />
  );

  return (
    <SlideWrapper
      prompt={{
        idBase: `place-${question.id}`,
        value: prompt,
        placeholder: "Ask players to pin a spot on the image…",
        onChange: (html) => {
          setPrompt(html);
          editor.actions.scheduleQuestionPrompt(html);
        },
        onBlur: editor.actions.flush,
      }}
      footer={footer}
    >
      <SlideContent>
        <SlideContentSection>
          <SlideContentSection.Header>
            <span>Image plane</span>
            <Btn variant="secondary" size="sm" onClick={pickImage}>
              {hasImage ? "Replace image" : "Choose image"}
            </Btn>
          </SlideContentSection.Header>
          <SlideContentSection.Body>
            <PlaceOnImageSurface
              imageUrl={imageUrl}
              targets={targets}
              tolerance={tolerance}
              canAddTarget={editor.state.canAddItem}
              selectedItemId={selectedItemId}
              onToggleSelect={toggleSelect}
              onAddTarget={editor.actions.addItemAtPoint}
              onSetTargetPosition={setTargetPosition}
            />
          </SlideContentSection.Body>
        </SlideContentSection>
        <SlideContentSection>
          <SlideContentSection.Header>
            <span className={shared.placedCount}>
              {placedCount} of {targets.length} placed
            </span>
            <span>
              <ToleranceField
                id={`place-tolerance-${question.id}`}
                value={tolerance}
                min={PLACE_TOLERANCE_MIN}
                max={PLACE_TOLERANCE_MAX}
                disabled={placedCount === 0}
                onChange={(next) => {
                  setTolerance(next);
                  editor.actions.setTolerance(next);
                }}
              />
            </span>
          </SlideContentSection.Header>

          <SlideContentSection.Body>
            <DragDropWrapper onReorder={editor.actions.handleItemDragEnd}>
              {targets.map((item, index) => (
                <SortableItemBankRow
                  key={item.id}
                  {...ItemToEditablePlaceOnImageItem(
                    item,
                    index,
                    editor.actions,
                    editor.state,
                    tolerance,
                    openPicker,
                    setOpenMenuId,
                    openMenuId,
                    selectedItemId,
                    setSelectedItemId,
                    correctPositions,
                  )}
                />
              ))}
              <AddItemCard
                label={
                  editor.state.canAddItem
                    ? "Add target"
                    : `Maximum ${MAX_PLACE_TARGETS.toString()} targets`
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

export { PlaceOnImageSlideContent };
