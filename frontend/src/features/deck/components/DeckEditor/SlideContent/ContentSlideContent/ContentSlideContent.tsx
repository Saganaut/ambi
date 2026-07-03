/**
 * Author surface for a non-scorable "content" slide — a single block of rich
 * text, the plain "PowerPoint body" slide. The slide title is edited through the
 * shared prompt slot; the body uses the block variant of RichTextInput, which
 * fills the slide vertically and exposes list and heading controls. The body is
 * persisted as HTML on {@link RichTextContent}.
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
        variant='block'
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
