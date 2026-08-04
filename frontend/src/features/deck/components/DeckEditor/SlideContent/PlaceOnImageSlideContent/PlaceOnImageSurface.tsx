/**
 * The Place-on-Image editor's placement surface: the backing image rendered at
 * its intrinsic aspect ratio (a plain block <img> sizes the wrapper, so the
 * normalized [0, 1] overlay coordinates always land where they will on the
 * player's screen — never letterboxed or stretched to a fixed frame), with the
 * placed target markers and their tolerance regions overlaid in percentages.
 *
 * A press on the image means one of two things, and an armed row always wins:
 * with a row armed (clicked in the bank, or its marker tapped) the press places
 * THAT target and then puts the row down again, so the next press adds rather
 * than silently relocating what was just finished; with nothing armed the press
 * mints a target at the pointer and keeps dragging it until release (Axis's
 * plane-drag, minus the selection step) — that in-flight placement is drawn as
 * a ghost marker, since it has no id to key on until it commits. Placed markers
 * drag directly — off the image to clear their target, the marker dimming while
 * a release would do so; a fresh placement released off the image is simply
 * abandoned — and a tap on one toggles its row's arming (Axis's
 * `onMarkerTap`).
 *
 * Coordinates are normalized [0, 1] in screen space over the image box —
 * (0, 0) is the image's top-left, y NOT inverted (unlike Axis), the natural
 * frame for an image and the space `RoundEvaluator.gradePlaceOnImage` measures
 * in; hence `invertY: false` here and no `invertY` on the markers. The
 * pointer-free path lives in the target rows' popover menus ("Set target" /
 * "Clear target", see `PlaceOnImageSlideContent`).
 */
import { resolveDatumColor } from "@/shared/components/Charts/optionPalette";
import { AppImg } from "@components/Images/AppImg";
import { isPlaced, type PlaceItemView } from "@deck/hooks/usePlaceOnImageEditor";
import type { PlacePoint } from "@deck/store/deckApi.gen";
import { PENDING_PLACEMENT_KEY, PlacementMarker, usePlacementSurface } from "../_shared";
import placement from "../_shared/placement/placement.module.css";
import styles from "./PlaceOnImageSlideContent.module.css";

interface PlaceOnImageSurfaceProps {
  /** Resolved backing-image URL, or null while none is chosen. */
  imageUrl: string | null;
  targets: PlaceItemView[];
  /** The slide's normalized tolerance radius, drawn around every marker. */
  tolerance: number;
  /** Whether a press on open image may MINT a target (max not reached). */
  canAddTarget: boolean;
  /** The row armed for placement — a press on the image places ITS target,
   * taking precedence over minting a new one. */
  selectedItemId: string | null;
  /** Toggle a row's arming (marker tap picks it up / puts it down). */
  onToggleSelect: (targetId: string) => void;
  /** Mint an item already placed at `point`. */
  onAddTarget: (point: PlacePoint) => void;
  /** Assign an existing item's target point; null (dragged off) unplaces it. */
  onSetTargetPosition: (targetId: string, point: PlacePoint | null) => void;
}

const PlaceOnImageSurface = ({
  imageUrl,
  targets,
  tolerance,
  canAddTarget,
  selectedItemId,
  onToggleSelect,
  onAddTarget,
  onSetTargetPosition,
}: PlaceOnImageSurfaceProps) => {
  const surface = usePlacementSurface({
    invertY: false,
    // An armed row wins: its press places THAT item's target. Only with nothing
    // armed does a press mint a new one, under the pending sentinel — the
    // target it becomes is minted by `addTarget` on release.
    pendingKey: () => {
      if (!imageUrl) return null;
      if (selectedItemId) return selectedItemId;
      return canAddTarget ? PENDING_PLACEMENT_KEY : null;
    },
    onSurfaceCommit: (key, point) => {
      if (key === PENDING_PLACEMENT_KEY) {
        onAddTarget(point);
        return;
      }
      onSetTargetPosition(key, point);
      // Put the row down: the next press on open image adds a target again
      // rather than silently relocating the one just finished.
      onToggleSelect(key);
    },
    onMarkerCommit: onSetTargetPosition,
    onMarkerTap: onToggleSelect,
  });
  const ghostIndex = targets.length;

  return (
    // Pointer placement surface; the pointer-free path is the target rows'
    // popover menus ("Set target" / "Clear target").
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={surface.surfaceRef}
      className={[
        placement.surface,
        styles.imageSurface,
        imageUrl && (selectedItemId || canAddTarget) ? placement.surfaceArmed : "",
        imageUrl ? "" : styles.surfaceEmpty,
      ]
        .filter(Boolean)
        .join(" ")}
      {...surface.surfaceProps}
    >
      {imageUrl ? (
        // The img is the box: block-level, full width, intrinsic ratio height.
        <AppImg className={styles.surfaceImage} src={imageUrl} alt="" draggable={false} />
      ) : (
        <span className={styles.surfacePlaceholder}>Choose an image to place targets on.</span>
      )}
      {imageUrl &&
        targets.map((target, index) => {
          // An unplaced target keys no answer, so it gets no marker rather than
          // one parked at a made-up coordinate (mirrors `AxisPlaneEditor`) —
          // until it is armed and dragged, when `pointFor` hands back the live
          // point and the marker materializes mid-gesture.
          const stored = isPlaced(target) ? { x: target.x, y: target.y } : undefined;
          const point = surface.pointFor(target.id, stored);
          if (!point) return null;
          const label = target.label?.trim() ?? "";
          const displayIndex = index + 1;
          return (
            <PlacementMarker
              key={target.id}
              point={point}
              color={resolveDatumColor(target.color, index)}
              displayIndex={displayIndex}
              label={label}
              tolerance={tolerance}
              ariaLabel={`Target ${displayIndex.toString()}${label ? ` (${label})` : ""} — drag to move`}
              selected={selectedItemId === target.id}
              outside={surface.drag?.key === target.id && !surface.drag.inside}
              {...surface.markerProps(target.id)}
            />
          );
        })}
      {imageUrl && surface.drag?.key === PENDING_PLACEMENT_KEY && (
        <PlacementMarker
          point={surface.drag.point}
          color={resolveDatumColor(undefined, ghostIndex)}
          displayIndex={ghostIndex + 1}
          tolerance={tolerance}
          ariaLabel={`New target ${(ghostIndex + 1).toString()}`}
          ghost
          outside={!surface.drag.inside}
        />
      )}
    </div>
  );
};

export { PlaceOnImageSurface };
