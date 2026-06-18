import { ImageSlotContext } from "./ImageSlotContext";
import { useContext } from 'react';


const useImageSlot = () => {
    const context = useContext(ImageSlotContext);
    if (!context) {
        throw new Error("useImageSlot must be used within an ImageSlotProvider");
    }
    return context;
};

export { useImageSlot }