import { SlotMapping } from "../contexts/ImageSlot.types";
import { useImageSlot } from "../contexts/useImageSlot";
import { doesImageSlotConfigMatchSlotId, resolveSlot } from "../utils/imageSlotUtil";
import styles from "./ImageSlot.module.css";

// Every slot stays mounted so placement changes animate (collapsed slots sit at
// `max-width: 0`; the active one expands) — returning `null` would drop the
// element from the DOM and CSS couldn't transition it. The slot's size class
// comes from its own `slotId`, not the active placement, so each slot keeps a
// stable identity; `.active` gates the expanded size.
const ImageSlot = ({ slotId, className }: { slotId: SlotMapping; className?: string }) => {
  const { imageConfig } = useImageSlot();
  const isActive = imageConfig != null && doesImageSlotConfigMatchSlotId(imageConfig, slotId);
  const slotName = resolveSlot(slotId)?.name;

  return (
    <div
      className={[className, styles.imageSlot, slotName && styles[slotName], isActive && styles.active]
        .filter(Boolean)
        .join(" ")}
    >
      <div style={{ backgroundImage: imageConfig ? `url(${imageConfig.imgUrl})` : undefined }} />
    </div>
  );
};

export { ImageSlot };
