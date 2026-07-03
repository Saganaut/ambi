/**
 * Author surface for a non-scorable "content" slide — a single block of rich
 * text, the plain "PowerPoint body" slide. The slide title is edited through the
 * shared prompt slot; the body uses the block variant of RichTextInput, which
 * fills the slide vertically and exposes list, size, and alignment controls. The
 * body HTML plus its whole-box horizontal/vertical alignment are persisted on
 * {@link RichTextContent}.
 */
import { useState } from "react";
import { useSlideEditor } from "@deck/hooks/useSlideEditor";
import {
  RichTextInput,
  type HorizontalAlign,
  type VerticalAlign,
} from "@components/Forms/Input/RichTextInput/RichTextInput";
import { SlideContentWrapper } from "../SlideContentWrapper";
import type { SlideContentProps } from "../slideContentProps";

// The stored alignment is the backend enum (LEFT/CENTER/RIGHT, TOP/MIDDLE/…);
// RichTextInput speaks the semantic lowercase form. Map between the two, with
// the client default (left / top) for a slide that has never set alignment.
type StoredHAlign = "LEFT" | "CENTER" | "RIGHT";
type StoredVAlign = "TOP" | "MIDDLE" | "BOTTOM";

const toHAlign = (v: StoredHAlign | undefined): HorizontalAlign =>
  v === "CENTER" ? "center" : v === "RIGHT" ? "right" : "left";
const fromHAlign = (v: HorizontalAlign): StoredHAlign =>
  v === "center" ? "CENTER" : v === "right" ? "RIGHT" : "LEFT";
const toVAlign = (v: StoredVAlign | undefined): VerticalAlign =>
  v === "MIDDLE" ? "middle" : v === "BOTTOM" ? "bottom" : "top";
const fromVAlign = (v: VerticalAlign): StoredVAlign =>
  v === "middle" ? "MIDDLE" : v === "bottom" ? "BOTTOM" : "TOP";

const ContentSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const { slide, updateMetadata, updateSlideContent, flush } = useSlideEditor(
    deckId,
    slideId,
    "CONTENT",
  );

  const [title, setTitle] = useState(slide?.title ?? "");
  const [body, setBody] = useState(slide?.content.body ?? "");
  const [hAlign, setHAlign] = useState<HorizontalAlign>(
    toHAlign(slide?.content.horizontalAlign),
  );
  const [vAlign, setVAlign] = useState<VerticalAlign>(
    toVAlign(slide?.content.verticalAlign),
  );
  const [syncedFromId, setSyncedFromId] = useState(slide?.id);
  if (slide && syncedFromId !== slide.id) {
    setSyncedFromId(slide.id);
    setTitle(slide.title);
    setBody(slide.content.body ?? "");
    setHAlign(toHAlign(slide.content.horizontalAlign));
    setVAlign(toVAlign(slide.content.verticalAlign));
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
        horizontalAlign={hAlign}
        verticalAlign={vAlign}
        // Alignment is a discrete click, so commit it right away rather than
        // waiting out the debounce.
        onHorizontalAlignChange={(value) => {
          setHAlign(value);
          updateSlideContent({ horizontalAlign: fromHAlign(value) });
          flush();
        }}
        onVerticalAlignChange={(value) => {
          setVAlign(value);
          updateSlideContent({ verticalAlign: fromVAlign(value) });
          flush();
        }}
      />
    </SlideContentWrapper>
  );
};

export { ContentSlideContent };
