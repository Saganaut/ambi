import type { SlideContentProps } from "../slideContentProps";
import { McqSlideContentView } from './McqSlideContentView';
import { useMcqEditor } from '@/features/deck/hooks/useMcqEditor';
import { useGalleryPicker } from '@/shared/hooks/useGalleryPicker';

const McqSlideContent = ({ deckId, slideId }: SlideContentProps) => {

    const editor = useMcqEditor(deckId, slideId);
    const openPicker = useGalleryPicker();


    return (
        <McqSlideContentView openPicker={openPicker} UseMcqEditorResult={editor} />
    );
}

export { McqSlideContent };