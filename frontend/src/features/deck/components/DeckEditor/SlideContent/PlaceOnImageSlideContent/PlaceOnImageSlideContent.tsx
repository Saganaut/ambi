/**
 * Author surface for a Place-on-Image slide (PlaceOnImageContent) — Axis's
 * sibling: players drop one pin per item on the backing image, correct when
 * each lands inside its own target's circle. The normalized coordinate
 * plumbing is identical to Axis but invisible here — no endpoint labels; the
 * image IS the plane, rendered at its intrinsic aspect ratio so authored
 * targets sit exactly where players will see them. That plane is square:
 * backing images are cropped to 1:1 on upload and on gallery pick.
 *
 * Layout (mirrors Axis):
 *   - Prompt at the top (stored on the slide title, like TEXT/MCQ).
 *   - "Image" and target cards sit side by side (wrapping on narrow
 *     containers) so the surface and the target rows read as one workspace.
 *   - "Image" card: the choose/replace button in the header; the placement
 *     surface as the body — press open image to mint a target and drag it,
 *     drag markers to move them.
 *   - Target card: a "N of M placed" counter and the slide's tolerance percent
 *     input (2–50 %, every circle resizes live) in the header; one row per
 *     item — a `SortableItemBankRow`, draggable by its grip because row order
 *     drives each marker's number, so reordering is how an author renumbers
 *     the set. It renumbers and nothing else: the answer key is id-keyed and
 *     each item owns the color minted for it at creation, so no marker moves
 *     or changes hue — plus an "Add target" affordance, which mints the target
 *     UNPLACED (a row that exists but keys no right answer). This composer
 *     owns which row's menu is open and which row is armed (at most one each).
 *
 * A target gets its point one of three ways: minted placed by a press on open
 * image, placed by pressing the image while its row is armed (a row click or a
 * marker tap arms it), or seeded at the centre by the row menu's "Set target" —
 * which "Clear target" undoes, leaving the row unplaced again.
 *
 * Items are addressed by id throughout, so a row and its marker keep pointing
 * at the same item across adds and removals — reordering is the one
 * position-addressed op, since it moves the list itself.
 *
 * Grading is INSIDE_RADIUS (every keyed pin inside its own item's circle), the
 * only mode the grader implements, so `scoreMode` has no authoring knob. The
 * footer nudges until an image is chosen and every target is placed — but only
 * nudges: an unkeyed slide is a legitimate collect-only pin drop.
 */
import { resolveDatumColor } from "@/shared/components/Charts/optionPalette";
import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { DragDropWrapper } from "@components/Wrappers/DragDropWrapper";
import {
  isPlaced,
  MAX_PLACE_TARGETS,
  PLACE_TOLERANCE_MAX,
  PLACE_TOLERANCE_MIN,
  usePlaceOnImageEditor,
} from "@deck/hooks/usePlaceOnImageEditor";
import { Btn } from "@ui/Buttons/Btn";
import { largestUrl } from "@utils/image";
import {
  AddItemCard,
  EmptySelect,
  ScoringFooter,
  ToleranceField,
  useSlideComposerState,
} from "../_shared";
import shared from "../_shared/_shared.module.css";
import { SortableItemBankRow } from "../_shared/ItemBankRow/ItemBankRow";
import type { SlideContentProps } from "../slideContentProps";
import { SlideContent, SlideContentSection } from "../SlideContentSection";
import { SlideWrapper } from "../SlideWrapper";
import { PlaceOnImageSurface } from "./PlaceOnImageSurface";

const PlaceOnImageSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const editor = usePlaceOnImageEditor(deckId, slideId);
  const { question } = editor;
  const openPicker = useGalleryPicker();
  const composer = useSlideComposerState(question);

  if (!question) return <EmptySelect title="Place on image" />;

  const { targets, tolerance } = question;
  const imageUrl = largestUrl(question.image, question.id);
  const hasImage = imageUrl != null;
  const placedCount = targets.filter(isPlaced).length;
  const fullyAssigned = targets.length > 0 && placedCount === targets.length;

  const toggleSelect = (targetId: string) => {
    composer.setSelectedItemId((held) => (held === targetId ? null : targetId));
  };

  const removeTarget = (targetId: string) => {
    editor.removeTarget(targetId);
    if (composer.selectedItemId === targetId) composer.setSelectedItemId(null);
  };

  const pickImage = () => {
    editor.flush();
    // Backing images are square, so authored target coordinates land on the
    // same plane every player sees regardless of the source's shape. Uploads
    // and gallery picks alike crop to that frame.
    openPicker(editor.setImage, {
      title: "Backing image",
      cropWidth: 1,
      cropHeight: 1,
      cropGalleryPicks: true,
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
        value: composer.prompt,
        placeholder: "Ask players to pin a spot on the image…",
        onChange: (html) => {
          composer.setPrompt(html);
          editor.schedulePrompt(html);
        },
        onBlur: editor.flush,
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
              canAddTarget={editor.canAddTarget}
              selectedItemId={composer.selectedItemId}
              onToggleSelect={toggleSelect}
              onAddTarget={editor.addTarget}
              onSetTargetPosition={editor.setTargetPosition}
            />{" "}
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
                onChange={editor.setTolerance}
              />
            </span>
          </SlideContentSection.Header>

          <SlideContentSection.Body>
            <DragDropWrapper onReorder={editor.handleItemDragEnd}>
              {targets.map((item, idx) => (
                <SortableItemBankRow
                  type="placement"
                  key={item.id}
                  item={item}
                  index={idx}
                  color={resolveDatumColor(item.color, idx)}
                  hasTarget={isPlaced(item)}
                  selected={composer.selectedItemId === item.id}
                  menuOpen={composer.openMenuId === item.id}
                  canRemove={editor.canRemove}
                  onSelect={() => {
                    composer.setSelectedItemId(item.id);
                  }}
                  onMenuOpenChange={(open) => {
                    composer.setOpenMenuId(open ? item.id : null);
                    if (open) composer.setSelectedItemId(item.id);
                  }}
                  onScheduleLabel={(label) => {
                    editor.scheduleTargetLabel(item.id, label);
                  }}
                  onFlush={editor.flush}
                  onSetColor={(color) => {
                    editor.setTargetColor(item.id, color);
                  }}
                  onSetImage={(image) => {
                    editor.setTargetImage(item.id, image);
                  }}
                  onSetTarget={() => {
                    editor.setTargetPosition(item.id, { x: 0.5, y: 0.5 });
                  }}
                  onClearTarget={() => {
                    editor.setTargetPosition(item.id, null);
                  }}
                  onRemove={() => {
                    removeTarget(item.id);
                  }}
                  openPicker={openPicker}
                />
              ))}
              <AddItemCard
                label={
                  editor.canAddTarget
                    ? "Add target"
                    : `Maximum ${MAX_PLACE_TARGETS.toString()} targets`
                }
                disabled={!editor.canAddTarget}
                onAdd={() => {
                  editor.addTarget();
                }}
              />
            </DragDropWrapper>
          </SlideContentSection.Body>
        </SlideContentSection>
      </SlideContent>
    </SlideWrapper>
  );
};

export { PlaceOnImageSlideContent };
