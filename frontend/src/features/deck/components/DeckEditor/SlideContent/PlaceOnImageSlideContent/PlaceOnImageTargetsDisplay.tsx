/**
 * The Place-on-Image slide's target-editing surface — the backing image an
 * author pins targets on, its image picker and tolerance control, and the
 * target bank beneath it. It is what the canvas shows whenever no results
 * visualisation is previewed (see `renderPlacementResultsDisplay`).
 */
import { DragDropWrapper } from "@components/Wrappers/DragDropWrapper";
import {
  isPlaced,
  MAX_PLACE_TARGETS,
  PLACE_TOLERANCE_MAX,
  PLACE_TOLERANCE_MIN,
} from "@deck/hooks/usePlaceOnImageEditor";
import type { PlacePoint } from "@deck/store/deckApi.gen";
import { Btn } from "@saganaut/ambi-ui";
import { largestUrl } from "@utils/image";
import { AddItemCard, SortableItemBankRow, ToleranceField } from "../_shared";
import shared from "../_shared/_shared.module.css";
import type { PlaceOnImageResultsDisplayOptions } from "../_shared/placement/placementResults.types";
import { ItemToEditablePlaceOnImageItem } from "../AllocationSlideContent/ItemFormatters";
import { SlideContent, SlideContentSection } from "../SlideContentSection";
import { PlaceOnImageSurface } from "./PlaceOnImageSurface";

const PlaceOnImageTargetsDisplay = ({
  question,
  editor,
  openPicker,
  openMenuId,
  setOpenMenuId,
  selectedItemId,
  setSelectedItemId,
  tolerance,
  setTolerance,
}: PlaceOnImageResultsDisplayOptions) => {
  const { targets, correctPositions } = question;
  const imageUrl = largestUrl(question.image, question.id);
  const placedCount = targets.filter(isPlaced).length;

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

  return (
    <SlideContent>
      <SlideContentSection>
        <SlideContentSection.Header>
          <span>Image plane</span>
          <Btn variant="secondary" size="sm" onClick={pickImage}>
            {imageUrl != null ? "Replace image" : "Choose image"}
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
  );
};

export { PlaceOnImageTargetsDisplay };
