import { useMcqEditor, UseMcqEditorResult } from "@/features/deck/hooks/useMcqEditor";
import { useSlideSettings } from "@/features/deck/hooks/useSlideSettings";
import { AnswerSettings, McqOption } from "@/features/deck/store/deckApi.gen";
import { OpenGalleryPicker, useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { createContext, Dispatch, SetStateAction, useState, type ReactNode } from "react";

export interface McqSlideContextValue {
  editor: UseMcqEditorResult;
  openPicker: OpenGalleryPicker;
  answerSettings?: AnswerSettings;
  activeOption: McqOption | null;
  setActiveOption: Dispatch<SetStateAction<McqOption | null>>;
}

const McqSlideContext = createContext<McqSlideContextValue | null>(null);

export interface McqSlideProviderProps {
  children: ReactNode;
  slideId: string;
  deckId: string;
}
const McqSlideProvider = ({ deckId, slideId, children }: McqSlideProviderProps) => {
  const editor = useMcqEditor(deckId, slideId);
  const openPicker = useGalleryPicker(deckId);
  const [activeOption, setActiveOption] = useState<McqOption | null>(null);
  const { answerSettings } = useSlideSettings(deckId, slideId);

  return (
    <McqSlideContext.Provider
      value={{
        editor,
        openPicker,
        answerSettings,
        activeOption,
        setActiveOption,
      }}
    >
      {children}
    </McqSlideContext.Provider>
  );
};

export { McqSlideContext, McqSlideProvider };
