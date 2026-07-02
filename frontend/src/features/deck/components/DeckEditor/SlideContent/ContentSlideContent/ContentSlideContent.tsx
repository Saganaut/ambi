/**
 * Author surface for a non-scorable "content" slide — a single block of rich
 * text, the plain "PowerPoint body" slide. The slide title is edited through the
 * shared prompt slot; the body is a rich-text input persisted as HTML on
 * {@link RichTextContent}. A richer editing surface is a planned follow-up.
 */
import { useState } from "react";
import { useSlideEditor } from "@deck/hooks/useSlideEditor";
import { RichTextInput } from "@components/Forms/Input/RichTextInput/RichTextInput";
import { SlideContentWrapper } from "../SlideContentWrapper";
import type { SlideContentProps } from "../slideContentProps";

const ContentSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const { slide, updateMetadata, updateSlideContent, flush } = useSlideEditor(
    deckId,
    slideId,
    "CONTENT",
  );

  const [title, setTitle] = useState(slide?.title ?? "");
  const [body, setBody] = useState(slide?.content.body ?? "");
  const [syncedFromId, setSyncedFromId] = useState(slide?.id);
  if (slide && syncedFromId !== slide.id) {
    setSyncedFromId(slide.id);
    setTitle(slide.title);
    setBody(slide.content.body ?? "");
  }

  if (!slide) {
    return (
      <SlideContentWrapper title='Content'>
        <p>Select a slide to edit.</p>
      </SlideContentWrapper>
    );
  }

  return (
    <SlideContentWrapper
      prompt={{
        idBase: `content-${slide.id}`,
        value: title,
        placeholder: "Slide title…",
        onChange: (html) => {
          setTitle(html);
          updateMetadata({ title: html });
        },
        onBlur: flush,
      }}>
      <RichTextInput
        id={`content-body-${slide.id}`}
        value={body}
        placeholder='Write your slide content…'
        onChange={(html) => {
          setBody(html);
          updateSlideContent({ body: html });
        }}
        onBlur={flush}
      />
    </SlideContentWrapper>
  );
};

export { ContentSlideContent };
