import { createContext, Dispatch, SetStateAction, useCallback, useState, type ReactNode } from "react";

import type { Placement } from "@deck/store/deckApi.gen";


/** 
 * Divide slide into 6 columns and 4 rows. 
 * Start 1 end 4 would be take up the 1/3 of the screen from left to right 
 * Top 1 bottom 2, would be take up the top half of the screen
 * 
 * 
 * These need to be mapped to a slot ID, or the slot ID takes these values as their ID.
 * 
 * concerns:
 * - validation/typing
 * - re-usability
 * - refactoring potentatial 
 * - consistency will it really map to a grid?  Does it need to?
 * Consider how re-usable this needs to be.  Will we use this for other elements? 
 * We definitely need to re-use it for the live session.
 * 
 * 
 * left side half screen start:1 end:3 top: 1 end: 4  --> s1e3t1e4
 * right side half screen start:4 end:6, top: 1 end: 4  
 * 
 * left side centered start:2 end: 3: top:2 end:3
 * right side centered start:4 end: 5 top:2 end:3
 * 
 * **/

// The preset cover-image slots, expressed in the same shape the backend
// persists ({@link Placement} from the generated client) so there's a single
// source of truth for the grid coordinates. `satisfies` keeps each entry's
// literal types (so `SlotMapping` stays a union of the known slots) while
// guaranteeing every option is a valid `Placement`.
const slotMappingOptions = [
  {
    start: 1,
    end: 3,
    top: 1,
    bottom: 4,
  }, {
    start: 4,
    end: 6,
    top: 1,
    bottom: 4,
  }, {
    start: 2,
    end: 3,
    top: 2,
    bottom: 3,
  }, {
    start: 4,
    end: 5,
    top: 2,
    bottom: 3,
  },
] as const satisfies readonly Placement[];


export type SlotMapping = typeof slotMappingOptions[number];

export interface ImageSlotConfig {
  imgUrl: string;
  placement: SlotMapping;
}









export interface ImageSlotContextValue {
  imageConfig: null | ImageSlotConfig;
  setImageConfig: Dispatch<SetStateAction<ImageSlotConfig | null>>;
}
const ImageSlotContext = createContext<ImageSlotContextValue | null>(null);

const ImageSlotProvider = ({ children }: { children: ReactNode }) => {

  const [imageConfig, setImageConfig] = useState<ImageSlotConfig | null>(null);



  return (
    <ImageSlotContext.Provider value={{ imageConfig, setImageConfig }}>
      {children}
    </ImageSlotContext.Provider>
  );
};



export { ImageSlotContext, ImageSlotProvider };