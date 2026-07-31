/**
 * Author surface for a Place-on-Image slide (PlaceOnImageContent) — Axis's
 * sibling: players drop a pin on the backing image, correct when it lands
 * inside any target circle. The normalized coordinate plumbing is identical
 * to Axis but invisible here — no endpoint labels, no item bank; the image IS
 * the plane, rendered at its intrinsic aspect ratio so authored targets sit
 * exactly where players will see them. That plane is square: backing images
 * are cropped to 1:1 on upload and on gallery pick.
 *
 * Layout (mirrors Axis):
 *   - Prompt at the top (stored on the slide title, like TEXT/MCQ).
 *   - "Image" and "Targets" cards sit side by side (wrapping on narrow
 *     containers) so the surface and the target rows read as one workspace.
 *   - "Image" card: the choose/replace button in the header; the placement
 *     surface as the body — press open image to add a target and drag it,
 *     drag markers to move them.
 *   - "Targets" card: the tolerance percent input (2–50 %, every circle
 *     resizes live) in the header; one row per target — a
 *     `PlaceOnImageTargetEditable`, draggable by its grip because row order
 *     drives each marker's number, so reordering is how an author renumbers
 *     the set. It renumbers and nothing else: each target owns its coordinates
 *     and the color minted for it at creation, so no marker moves or changes
 *     hue — plus an "Add target" affordance (drops at the centre). Every row
 *     is `scored`: a target exists only by being placed, so there is no
 *     per-row answer to set. This composer owns which row's menu is open (at
 *     most one).
 *
 * Targets are addressed by id throughout, so a row and its marker keep
 * pointing at the same target across adds and removals — reordering is the one
 * position-addressed op, since it moves the list itself.
 *
 * Grading is INSIDE_RADIUS (pin inside any target's circle), the only mode
 * the grader implements, so `scoreMode` has no authoring knob. The footer
 * nudges until an image is chosen and at least one target exists — but only
 * nudges: a target-less slide is a legitimate collect-only pin drop.
 */
import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { DragDropWrapper } from "@components/Wrappers/DragDropWrapper";
import {
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
import type { SlideContentProps } from "../slideContentProps";
import { SlideContent, SlideContentSection } from "../SlideContentSection";
import { SlideWrapper } from "../SlideWrapper";
import { PlaceOnImageSurface } from "./PlaceOnImageSurface";
import { PlaceOnImageTargetEditable } from "./PlaceOnImageTargetEditable";

const PlaceOnImageSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const editor = usePlaceOnImageEditor(deckId, slideId);
  const { question } = editor;
  const openPicker = useGalleryPicker();
  const composer = useSlideComposerState(question);

  if (!question) return <EmptySelect title="Place on image" />;

  const { targets, tolerance } = question;
  const imageUrl = largestUrl(question.image, question.id);
  const hasImage = imageUrl != null;

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

  const footer = hasImage ? (
    targets.length > 0 ? (
      <p>Scored when a player&apos;s pin lands inside any target&apos;s tolerance circle.</p>
    ) : (
      <ScoringFooter visible message="Add at least one target to make this slide scoreable." />
    )
  ) : (
    <ScoringFooter visible message="Choose a backing image for players to pin." />
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
              onAddTarget={editor.addTarget}
              onMoveTarget={editor.moveTarget}
            />{" "}
          </SlideContentSection.Body>
        </SlideContentSection>
        <SlideContentSection>
          <SlideContentSection.Header>
            <span>Targets</span>
            <span>
              <ToleranceField
                id={`place-tolerance-${question.id}`}
                value={tolerance}
                min={PLACE_TOLERANCE_MIN}
                max={PLACE_TOLERANCE_MAX}
                disabled={targets.length === 0}
                onChange={editor.setTolerance}
              />
            </span>
          </SlideContentSection.Header>

          <SlideContentSection.Body>
            <DragDropWrapper onReorder={editor.handleItemDragEnd}>
              {targets.map((target, index) => (
                <PlaceOnImageTargetEditable
                  key={target.id}
                  target={target}
                  sortIndex={index}
                  menuOpen={composer.openMenuId === target.id}
                  canRemove
                  onMenuOpenChange={(open) => {
                    composer.setOpenMenuId(open ? target.id : null);
                  }}
                  onScheduleLabel={(label) => {
                    editor.scheduleTargetLabel(target.id, label);
                  }}
                  onFlush={editor.flush}
                  onSetColor={(color) => {
                    editor.setTargetColor(target.id, color);
                  }}
                  onSetImage={(image) => {
                    editor.setTargetImage(target.id, image);
                  }}
                  onRemove={() => {
                    editor.removeTarget(target.id);
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
