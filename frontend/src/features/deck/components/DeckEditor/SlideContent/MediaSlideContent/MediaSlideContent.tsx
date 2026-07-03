/**
 * Author surface for a non-scorable "media" slide — either an image or an
 * embedded YouTube video, with an optional caption. We do not host video
 * ourselves: the only "video" option is an embedded YouTube URL, stored as
 * {@link MediaContent} with {@code mediaType: "EMBED"}. The slide title is edited
 * through the shared prompt slot.
 */
import { useState } from "react";
import { useSlideEditor } from "@deck/hooks/useSlideEditor";
import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { Input } from "@components/Forms/Input/Input/Input";
import { Toggle } from "@components/Forms/Input/Toggle/Toggle";
import { Btn } from "@ui/Buttons/Btn";
import type { AppImage } from "@deck/store/deckApi.gen";
import { SlideContentWrapper } from "../SlideContentWrapper";
import type { SlideContentProps } from "../slideContentProps";
import { youTubeEmbedUrl } from "./youTube";
import styles from "./MediaSlideContent.module.css";

const imagePreviewSrc = (image: AppImage): string | undefined =>
  image.variants?.XL ?? image.variants?.LG ?? image.externalSrc;

const MediaSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const { slide, updateMetadata, updateSlideContent, flush } = useSlideEditor(
    deckId,
    slideId,
    "MEDIA",
  );
  const openPicker = useGalleryPicker();

  const [title, setTitle] = useState(slide?.title ?? "");
  const [url, setUrl] = useState(slide?.content.url ?? "");
  const [caption, setCaption] = useState(slide?.content.caption ?? "");
  const [syncedFromId, setSyncedFromId] = useState(slide?.id);
  if (slide && syncedFromId !== slide.id) {
    setSyncedFromId(slide.id);
    setTitle(slide.title);
    setUrl(slide.content.url ?? "");
    setCaption(slide.content.caption ?? "");
  }

  if (!slide) {
    return (
      <SlideContentWrapper title='Media'>
        <p>Select a slide to edit.</p>
      </SlideContentWrapper>
    );
  }

  const { mediaType, image } = slide.content;
  const isYouTube = mediaType === "EMBED";
  const embedUrl = youTubeEmbedUrl(url);

  const pickImage = () => {
    openPicker(
      (picked) => {
        updateSlideContent({ mediaType: "IMAGE", image: picked });
        flush();
      },
      { title: "Slide media image", cropWidth: 16, cropHeight: 9 },
    );
  };

  return (
    <SlideContentWrapper
      prompt={{
        idBase: `media-${slide.id}`,
        value: title,
        placeholder: "Slide title…",
        onChange: (html) => {
          setTitle(html);
          updateMetadata({ title: html });
        },
        onBlur: flush,
      }}>
      <Toggle
        labelPosition='labelBefore'
        id={`media-mode-${slide.id}`}
        label='Embed a YouTube video instead of an image'
        checked={isYouTube}
        onChange={(e) => {
          updateSlideContent({ mediaType: e.currentTarget.checked ? "EMBED" : "IMAGE" });
          flush();
        }}
      />

      {isYouTube ? (
        <div className={styles.mediaBlock}>
          <Input
            label='YouTube URL'
            id={`media-url-${slide.id}`}
            type='text'
            fullWidth
            value={url}
            placeholder='https://www.youtube.com/watch?v=…'
            onChange={(e) => {
              const next = e.target.value;
              setUrl(next);
              updateSlideContent({ url: next });
            }}
            onBlur={flush}
          />
          {embedUrl ? (
            <div className={styles.embed}>
              <iframe
                src={embedUrl}
                title='YouTube preview'
                sandbox='allow-scripts allow-same-origin allow-presentation allow-popups'
                allow='accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                allowFullScreen
              />
            </div>
          ) : (
            url.trim() !== "" && (
              <p className={styles.hint}>
                Enter a valid YouTube link to preview the video.
              </p>
            )
          )}
        </div>
      ) : (
        <div className={styles.mediaBlock}>
          {image ? (
            <>
              <img
                className={styles.imagePreview}
                src={imagePreviewSrc(image)}
                alt={image.altText ?? "Slide media"}
              />
              <div className={styles.imageActions}>
                <Btn size='sm' fill='bordered' variant='secondary' onClick={pickImage}>
                  Replace image
                </Btn>
                <Btn
                  size='sm'
                  fill='ghost'
                  variant='secondary'
                  onClick={() => {
                    updateSlideContent({ image: undefined });
                    flush();
                  }}>
                  Remove
                </Btn>
              </div>
            </>
          ) : (
            <Btn fill='bordered' variant='secondary' onClick={pickImage}>
              Choose image
            </Btn>
          )}
        </div>
      )}

      <Input
        label='Caption'
        id={`media-caption-${slide.id}`}
        type='text'
        fullWidth
        value={caption}
        placeholder='Optional caption shown below the media'
        onChange={(e) => {
          const next = e.target.value;
          setCaption(next);
          updateSlideContent({ caption: next });
        }}
        onBlur={flush}
      />
    </SlideContentWrapper>
  );
};

export { MediaSlideContent };
