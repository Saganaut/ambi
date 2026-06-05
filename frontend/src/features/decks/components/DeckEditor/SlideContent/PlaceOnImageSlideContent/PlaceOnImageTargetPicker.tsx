// Click-to-set target picker. Renders the configured target image with two
// overlays:
//   - the tolerance ring (radius = tolerance × imageWidth)
//   - the bullseye marker at (correctX, correctY)
// Clicking anywhere on the image updates (correctX, correctY) in normalised
// 0–1 coords so the parent's existing commit flow can persist them.
import { useRef } from "react";
import styles from "./PlaceOnImageSlideContent.module.css";

interface PlaceOnImageTargetPickerProps {
  imageUrl: string;
  correctX: number;
  correctY: number;
  tolerance: number;
  onPick: (coords: { x: number; y: number }) => void;
}

const PlaceOnImageTargetPicker = ({
  imageUrl,
  correctX,
  correctY,
  tolerance,
  onPick,
}: PlaceOnImageTargetPickerProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    onPick({ x: +x.toFixed(3), y: +y.toFixed(3) });
  };

  return (
    <div
      ref={ref}
      className={styles.targetPicker}
      style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
      onClick={handleClick}
      role='button'
      tabIndex={0}
      aria-label='Click to set target point'>
      {!imageUrl && (
        <span className={styles.targetEmpty}>Pick an image to set a target</span>
      )}
      <div
        className={styles.toleranceRing}
        style={{
          left: `${(correctX * 100).toString()}%`,
          top: `${(correctY * 100).toString()}%`,
          width: `${(tolerance * 200).toString()}%`,
          paddingTop: `${(tolerance * 200).toString()}%`,
        }}
      />
      <div
        className={styles.targetMarker}
        style={{
          left: `${(correctX * 100).toString()}%`,
          top: `${(correctY * 100).toString()}%`,
        }}
      />
    </div>
  );
};

export { PlaceOnImageTargetPicker };
