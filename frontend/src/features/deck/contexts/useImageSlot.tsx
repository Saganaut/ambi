import { useContext } from "react";

import { ImageSlotContext } from "./ImageSlotContext";

const useImageSlot = () => {
  const context = useContext(ImageSlotContext);
  if (!context) {
    throw new Error("useImageSlot must be used within an ImageSlotProvider");
  }
  return context;
};

export { useImageSlot };
