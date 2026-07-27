/**
 * Author surface for a Place-on-Image slide (PlaceOnImageContent) — Axis's
 * sibling: players drop a pin on the backing image, correct when it lands
 * inside any target circle. The normalized coordinate plumbing is identical
 * to Axis but invisible here — no endpoint labels, no item bank; the image IS
 * the plane, rendered at its intrinsic aspect ratio so authored targets sit
 * exactly where players will see them.
 *
 * Layout (mirrors Axis):
 *   - Prompt at the top (stored on the slide title, like TEXT/MCQ).
 *   - "Image" and "Targets" cards sit side by side (wrapping on narrow
 *     containers) so the surface and the target rows read as one workspace.
 *   - "Image" card: the choose/replace button in the header; the placement
 *     surface as the body — press open image to add a target and drag it,
 *     drag markers to move them.
 *   - "Targets" card: the tolerance percent input (2–50 %, every circle
 *     resizes live) in the header; one row per target — the shared
 *     `PlacementItemRow`, gripless because target order is display-only
 *     (index drives the marker number and the palette default, and there is
 *     nothing to reorder against) — plus an "Add target" affordance (drops at
 *     the centre). This composer owns which row's menu is open (at most one).
 *     The row menu's "Center target" is the pointer-free placement path.
 *
 * Targets are addressed by id throughout, so a row and its marker keep
 * pointing at the same target across adds and removals.
 *
 * Grading is INSIDE_RADIUS (pin inside any target's circle), the only mode
 * the grader implements, so `scoreMode` has no authoring knob. The footer
 * nudges until an image is chosen and at least one target exists — but only
 * nudges: a target-less slide is a legitimate collect-only pin drop.
 */
import { ViewfinderCircleIcon } from "@heroicons/react/24/outline";

import { resolveDatumColor } from "@/shared/components/Charts/optionPalette";
import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { Btn } from "@ui/Buttons/Btn";
import {
  MAX_PLACE_TARGETS,
  PLACE_LABEL_MAX,
  PLACE_TOLERANCE_MAX,
  PLACE_TOLERANCE_MIN,
  usePlaceOnImageEditor,
} from "@deck/hooks/usePlaceOnImageEditor";
import { largestUrl } from "@utils/image";
import {
  EmptySelect,
  ItemList,
  PlacementItemRow,
  ScoringFooter,
  SettingsCard,
  ToleranceField,
  useSlideComposerState,
} from "../_shared";
import shared from "../_shared/_shared.module.css";
import type { SlideContentProps } from "../slideContentProps";
import { SlideContentWrapper } from "../SlideContentWrapper";
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

  const pickImage = () => {
    editor.flush();
    // "source" keeps an upload's own aspect ratio — the placement surface
    // renders the image at its intrinsic shape, so no frame to crop to.
    openPicker(editor.setImage, { title: "Backing image", cropAspect: "source" });
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
    <SlideContentWrapper
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
      <div className={shared.editorRow}>
        <div className={shared.editorColumnWide}>
          <SettingsCard
            title="Image"
            action={
              <Btn variant="secondary" size="sm" onClick={pickImage}>
                {hasImage ? "Replace image" : "Choose image"}
              </Btn>
            }
          >
            <PlaceOnImageSurface
              imageUrl={imageUrl}
              targets={targets}
              tolerance={tolerance}
              canAddTarget={editor.canAddTarget}
              onAddTarget={editor.addTarget}
              onMoveTarget={editor.moveTarget}
            />
          </SettingsCard>
        </div>

        <div className={shared.editorColumnNarrow}>
          <SettingsCard
            title="Targets"
            action={
              <span className={shared.cardHeaderMeta}>
                <span className={shared.cardHeaderHint}>Press the image to add a target.</span>
                <ToleranceField
                  id={`place-tolerance-${question.id}`}
                  value={tolerance}
                  min={PLACE_TOLERANCE_MIN}
                  max={PLACE_TOLERANCE_MAX}
                  disabled={targets.length === 0}
                  onChange={editor.setTolerance}
                />
              </span>
            }
          >
            <ItemList
              addLabel={
                editor.canAddTarget
                  ? "Add target"
                  : `Maximum ${MAX_PLACE_TARGETS.toString()} targets`
              }
              canAdd={editor.canAddTarget}
              onAdd={() => {
                editor.addTarget();
              }}
            >
              {targets.map((target, index) => (
                <PlacementItemRow
                  key={target.id}
                  item={target}
                  index={index}
                  color={resolveDatumColor(target.color, index)}
                  itemNoun="Target"
                  labelMaxLength={PLACE_LABEL_MAX}
                  menuOpen={composer.openMenuId === target.id}
                  canRemove
                  primaryAction={{
                    // The pointer-free placement path: park the target at the
                    // image's centre, ready for pointer nudging from there.
                    label: "Center target",
                    icon: ViewfinderCircleIcon,
                    onSelect: () => {
                      composer.setOpenMenuId(null);
                      editor.moveTarget(target.id, { x: 0.5, y: 0.5 });
                    },
                  }}
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
            </ItemList>
          </SettingsCard>
        </div>
      </div>
    </SlideContentWrapper>
  );
};

export { PlaceOnImageSlideContent };
