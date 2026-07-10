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
 *     resizes live) in the header; one row per target — numbered in its
 *     marker's palette color — with numeric X/Y inputs (percent of the image,
 *     top-left origin) as the accessible, pointer-free placement path, a
 *     remove button, and an "Add target" affordance (drops at the centre).
 *
 * Grading is INSIDE_RADIUS (pin inside any target's circle), the only mode
 * the grader implements, so `scoreMode` has no authoring knob. The footer
 * nudges until an image is chosen and at least one target exists — but only
 * nudges: a target-less slide is a legitimate collect-only pin drop.
 */
import { useState } from "react";

import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import { Btn } from "@ui/Buttons/Btn";
import {
  MAX_PLACE_TARGETS,
  PLACE_TOLERANCE_MAX,
  PLACE_TOLERANCE_MIN,
  usePlaceOnImageEditor,
} from "@deck/hooks/usePlaceOnImageEditor";
import { largestUrl } from "@utils/image";
import { EmptySelect, ItemCard, ItemList, ScoringFooter, SettingsCard } from "../_shared";
import type { SlideContentProps } from "../slideContentProps";
import { SlideContentWrapper } from "../SlideContentWrapper";
import { PlaceOnImageSurface } from "./PlaceOnImageSurface";
import { targetColor } from "./targetColor";
import styles from "./PlaceOnImageSlideContent.module.css";

/** Normalized [0, 1] coordinate → whole percent for the numeric inputs. */
const toPercent = (value: number): number => Math.round(value * 100);

const PlaceOnImageSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const editor = usePlaceOnImageEditor(deckId, slideId);
  const { question } = editor;
  const openPicker = useGalleryPicker();

  const [prompt, setPrompt] = useState(question?.prompt ?? "");
  const [syncedFromId, setSyncedFromId] = useState(question?.id);
  // Resync the local mirror when the active slide changes ("derive state
  // during render" — safe when the new value differs).
  if (question && syncedFromId !== question.id) {
    setSyncedFromId(question.id);
    setPrompt(question.prompt);
  }

  if (!question) return <EmptySelect title="Place on image" />;

  const { targets, tolerance } = question;
  const imageUrl = largestUrl(question.image, question.id);
  const hasImage = imageUrl != null;
  const tolerancePercent = Math.round(tolerance * 100);

  const pickImage = () => {
    editor.flush();
    openPicker(editor.setImage, { title: "Backing image" });
  };

  const setCoordinate = (index: number, coordinate: "x" | "y", percent: number) => {
    const target = targets[index];
    editor.moveTarget(index, { ...target, [coordinate]: percent / 100 });
  };

  const footer = hasImage ? (
    targets.length > 0 ? (
      <p>Scored when a player&apos;s pin lands inside any target&apos;s tolerance circle.</p>
    ) : (
      <ScoringFooter
        visible
        message="Add at least one target to make this slide scoreable."
      />
    )
  ) : (
    <ScoringFooter visible message="Choose a backing image for players to pin." />
  );

  return (
    <SlideContentWrapper
      prompt={{
        idBase: `place-${question.id}`,
        value: prompt,
        placeholder: "Ask players to pin a spot on the image…",
        onChange: (html) => {
          setPrompt(html);
          editor.schedulePrompt(html);
        },
        onBlur: editor.flush,
      }}
      footer={footer}
    >
      <div className={styles.editorRow}>
        <div className={styles.imageColumn}>
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

        <div className={styles.targetsColumn}>
          <SettingsCard
            title="Targets"
            action={
              <span className={styles.targetsMeta}>
                <span className={styles.targetsHint}>Press the image to add a target.</span>
                <NumberInput
                  compact
                  id={`place-tolerance-${question.id}`}
                  label="Tolerance %"
                  labelPosition="labelInFront"
                  min={Math.round(PLACE_TOLERANCE_MIN * 100)}
                  max={Math.round(PLACE_TOLERANCE_MAX * 100)}
                  value={tolerancePercent}
                  disabled={targets.length === 0}
                  onChange={(next) => {
                    editor.setTolerance(next / 100);
                  }}
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
                <ItemCard
                  key={target.id}
                  index={index}
                  indexColor={targetColor(index)}
                  removeLabel={`Remove target ${(index + 1).toString()}`}
                  onRemove={() => {
                    editor.removeTarget(index);
                  }}
                >
                  <div className={styles.targetFields}>
                    <NumberInput
                      compact
                      id={`place-target-x-${target.id}`}
                      label="X %"
                      labelPosition="labelInFront"
                      value={toPercent(target.x)}
                      min={0}
                      max={100}
                      onChange={(next) => {
                        setCoordinate(index, "x", next);
                      }}
                    />
                    <NumberInput
                      compact
                      id={`place-target-y-${target.id}`}
                      label="Y %"
                      labelPosition="labelInFront"
                      value={toPercent(target.y)}
                      min={0}
                      max={100}
                      onChange={(next) => {
                        setCoordinate(index, "y", next);
                      }}
                    />
                  </div>
                </ItemCard>
              ))}
            </ItemList>
          </SettingsCard>
        </div>
      </div>
    </SlideContentWrapper>
  );
};

export { PlaceOnImageSlideContent };
