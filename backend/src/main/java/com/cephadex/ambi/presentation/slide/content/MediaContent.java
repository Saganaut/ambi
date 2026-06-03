package com.cephadex.ambi.presentation.slide.content;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.MediaType;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

/**
 * Display-only media slide — no player answer, no scoring.
 *
 * @param mediaType the kind of media being shown
 * @param image     used when {@code mediaType} is {@code IMAGE}; otherwise {@code null}
 * @param url       video or embed source URL; used when not {@code IMAGE}
 * @param caption   optional caption shown below the media
 * @param autoplay  start playback automatically when the slide opens
 * @param loop      loop playback
 * @param muted     start with audio muted
 */
public record MediaContent(
        MediaType mediaType,
        AppImage image,
        String url,
        String caption,
        boolean autoplay,
        boolean loop,
        boolean muted
) implements NonScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.MEDIA;
    }
}
