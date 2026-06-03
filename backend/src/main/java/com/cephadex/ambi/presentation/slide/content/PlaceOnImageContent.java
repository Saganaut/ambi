package com.cephadex.ambi.presentation.slide.content;

import java.util.List;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScoreMode;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.Target;
import com.cephadex.ambi.presentation.slide.enums.Difficulty;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

/**
 * Click-on-image slide — players pin point(s) on the provided image.
 *
 * <p>Runtime answer: {@code List<double[]>} of {@code [x, y]} pairs, normalized to [0, 1].
 *
 * @param image     the image players click on
 * @param targets   correct target regions; coordinates and radius normalized to [0, 1]
 * @param scoreMode {@code INSIDE_RADIUS} (point inside target circle),
 *                  {@code NEAREST} (closest target wins), or
 *                  {@code DISTANCE} (inverse-distance scoring)
 */
public record PlaceOnImageContent(
        int pointValue,
        Difficulty difficulty,
        String explanation,
        AppImage image,
        List<Target> targets,
        ScoreMode scoreMode
) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.PLACE_ON_IMAGE;
    }
}
