import {
  ImageSlotConfig,
  SlotButton,
  slotButtons,
  SlotMapping,
} from "@/features/deck/contexts/ImageSlot.types";
import { useImageSlot } from "@/features/deck/contexts/useImageSlot";
import { Dispatch, SetStateAction } from "react";

import { Placement } from "@/features/deck/store/deckApi.gen";

import { returnImagePositonIcon } from "@/features/deck/utils/imageSlotUtil";
import styles from "./ImagePlacementPicker.module.css";

const PlacementIcon = ({
  button,
  setPreviewPlacement,
  imageConfig,
  handleClick,
}: {
  button: SlotButton;
  setPreviewPlacement: Dispatch<SetStateAction<Placement | null>>;
  imageConfig: ImageSlotConfig;
  handleClick: () => void;
}) => {
  const Icon = returnImagePositonIcon(button);

  //TODO: what is the performance cost of over the long run, definitely better ways of doing it
  const isSamePlacement = (a: Placement, b: Placement) =>
    a.start === b.start && a.end === b.end && a.top === b.top && a.bottom === b.bottom;

  return (
    <div
      onClick={handleClick}
      className={`${styles.iconWrapper} ${isSamePlacement(imageConfig.slot.placement, button.placement) && styles.isActive} `}
      onMouseEnter={() => setPreviewPlacement(button.placement)}
      onMouseLeave={() => setPreviewPlacement(null)}
      key={button.name}
    >
      <Icon />
    </div>
  );
};

const ImagePlacementPicker = ({
  updateSlidePlacement,
}: {
  updateSlidePlacement: (slotMapping: SlotMapping) => void;
}) => {
  const { imageConfig, setPreviewPlacement } = useImageSlot();

  if (imageConfig == null) return;

  console.log("Image config", imageConfig);

  return (
    <div className={styles.imagePlacementPicker}>
      <h5>Placement picker</h5>

      <div className={styles.placementContainer}>
        {slotButtons.map((button) => {
          return (
            <PlacementIcon
              key={button.name}
              button={button}
              handleClick={() => {
                updateSlidePlacement(button.placement);
              }}
              setPreviewPlacement={setPreviewPlacement}
              imageConfig={imageConfig}
            />
          );
        })}
      </div>
    </div>
  );
};

export { ImagePlacementPicker };
