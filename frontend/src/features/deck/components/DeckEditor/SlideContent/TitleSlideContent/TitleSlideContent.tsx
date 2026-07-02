/**
 * Author surface for a non-scorable "title" slide — a large centred title used
 * to open a deck or a section. The headline is the slide's title (edited through
 * the shared prompt slot); the one authorable content field is an optional
 * subtitle rendered beneath it.
 */
import { useState } from "react";
import { useSlideEditor } from "@deck/hooks/useSlideEditor";
import { Input } from "@components/Forms/Input/Input/Input";
import { SlideContentWrapper } from "../SlideContentWrapper";
import type { SlideContentProps } from "../slideContentProps";

const TitleSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const { slide, updateMetadata, updateSlideContent, flush } = useSlideEditor(
    deckId,
    slideId,
    "TITLE",
  );

  // Local mirrors so typing stays responsive while commits debounce. Re-seed
  // when the active slide changes ("derive state during render", as in
  // FollowUpSlideContent).
  const [title, setTitle] = useState(slide?.title ?? "");
  const [subtitle, setSubtitle] = useState(slide?.content.subtitle ?? "");
  const [syncedFromId, setSyncedFromId] = useState(slide?.id);
  if (slide && syncedFromId !== slide.id) {
    setSyncedFromId(slide.id);
    setTitle(slide.title);
    setSubtitle(slide.content.subtitle ?? "");
  }

  if (!slide) {
    return (
      <SlideContentWrapper title='Title'>
        <p>Select a slide to edit.</p>
      </SlideContentWrapper>
    );
  }

  return (
    <SlideContentWrapper
      prompt={{
        idBase: `title-${slide.id}`,
        value: title,
        placeholder: "Slide title…",
        onChange: (html) => {
          setTitle(html);
          updateMetadata({ title: html });
        },
        onBlur: flush,
      }}>
      <Input
        label='Subtitle'
        id={`title-subtitle-${slide.id}`}
        type='text'
        fullWidth
        value={subtitle}
        placeholder='Optional line shown under the title'
        onChange={(e) => {
          const next = e.target.value;
          setSubtitle(next);
          updateSlideContent({ subtitle: next });
        }}
        onBlur={flush}
      />
    </SlideContentWrapper>
  );
};

export { TitleSlideContent };
