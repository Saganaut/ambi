import { SlotMapping } from "../contexts/ImageSlot.types";
import { useImageSlot } from "../contexts/useImageSlot";
import { doesImageSlotConfigMatchSlotId } from "../utils/imageSlotUtil";

const ImageSlot = ({ slotId, className }: { slotId: SlotMapping, className?: string }) => {
    const { imageConfig } = useImageSlot()
    console.log("image config", imageConfig)
    if (imageConfig == null) return null;

    if (!doesImageSlotConfigMatchSlotId(imageConfig, slotId)) return null


    return (
        <div className={className}>
            <div style={{ backgroundImage: `url(${imageConfig.imgUrl})` }} />
        </div>
    );
};

export { ImageSlot } 