/**
 * The Place-on-Image editor's placement surface: the backing image rendered at
 * its intrinsic aspect ratio (a plain block <img> sizes the wrapper, so the
 * normalized [0, 1] overlay coordinates always land where they will on the
 * player's screen — never letterboxed or stretched to a fixed frame), with the
 * placed target markers and their tolerance regions overlaid in percentages.
 *
 * Placement is direct: targets carry no bank to arm, so a press on open image
 * adds a target at the pointer and keeps dragging it until release (Axis's
 * plane-drag, minus the selection step) — the in-flight placement is drawn as
 * a ghost marker, since it has no id to key on until it commits. Placed
 * markers drag directly, and a press on one means nothing but "move me", so
 * this surface passes `usePlacementSurface` no `onMarkerTap`.
 *
 * Coordinates are normalized [0, 1] in screen space over the image box —
 * (0, 0) is the image's top-left, y NOT inverted (unlike Axis), the natural
 * frame for an image and the space `RoundEvaluator.gradePlaceOnImage` measures
 * in; hence `invertY: false` here and no `invertY` on the markers. The
 * pointer-free path lives in the target rows' popover menus ("Center target",
 * see `PlaceOnImageSlideContent`).
 */
import { resolveDatumColor } from "@/shared/components/Charts/optionPalette";
import type { PlacePoint, PlaceTargetView } from "@deck/hooks/usePlaceOnImageEditor";
import { PENDING_PLACEMENT_KEY, PlacementMarker, usePlacementSurface } from "../_shared";
import placement from "../_shared/placement/placement.module.css";
import styles from "./PlaceOnImageSlideContent.module.css";

interface PlaceOnImageSurfaceProps {
  /** Resolved backing-image URL, or null while none is chosen. */
  imageUrl: string | null;
  targets: PlaceTargetView[];
  /** The shared normalized tolerance radius, drawn around every marker. */
  tolerance: number;
  /** Whether a press on open image may add a target (max not reached). */
  canAddTarget: boolean;
  onAddTarget: (point: PlacePoint) => void;
  onMoveTarget: (targetId: string, point: PlacePoint) => void;
}

const PlaceOnImageSurface = ({
  imageUrl,
  targets,
  tolerance,
  canAddTarget,
  onAddTarget,
  onMoveTarget,
}: PlaceOnImageSurfaceProps) => {
  const surface = usePlacementSurface({
    invertY: false,
    // Every press on open image places a target, so the pending placement is
    // the sentinel rather than any row's id — the target it becomes is minted
    // by `addTarget` on release.
    pendingKey: () => (imageUrl && canAddTarget ? PENDING_PLACEMENT_KEY : null),
    onSurfaceCommit: (_key, point) => {
      onAddTarget(point);
    },
    onMarkerCommit: onMoveTarget,
  });
  const ghostIndex = targets.length;

  return (
    // Pointer placement surface; the pointer-free path is the target rows'
    // popover menus ("Center target").
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={surface.surfaceRef}
      className={[
        placement.surface,
        styles.imageSurface,
        imageUrl && canAddTarget ? placement.surfaceArmed : "",
        imageUrl ? "" : styles.surfaceEmpty,
      ]
        .filter(Boolean)
        .join(" ")}
      {...surface.surfaceProps}
    >
      {imageUrl ? (
        // The img is the box: block-level, full width, intrinsic ratio height.
        <img className={styles.surfaceImage} src={imageUrl} alt="" draggable={false} />
      ) : (
        <span className={styles.surfacePlaceholder}>Choose an image to place targets on.</span>
      )}
      {imageUrl &&
        targets.map((target, index) => {
          // A placed target always has a point; the fallback is only the hook's
          // "stored point may be missing" signature (Axis clears targets).
          const point = surface.pointFor(target.id, target) ?? target;
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
        />
      )}
    </div>
  );
};

export { PlaceOnImageSurface };
