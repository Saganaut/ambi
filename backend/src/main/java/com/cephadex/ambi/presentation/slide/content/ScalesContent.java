package com.cephadex.ambi.presentation.slide.content;

import java.util.List;
import java.util.Map;

import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScaleItem;
import com.cephadex.ambi.presentation.slide.enums.Difficulty;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

/**
 * Slider slide — players drag one or more items to a position on a scale.
 *
 * <p>Runtime answer: {@code Map<String, Double>} (itemId → value).
 *
 * @param min           left-most value of the scale
 * @param max           right-most value of the scale
 * @param step          snap increment (e.g. {@code 1.0}, {@code 0.5})
 * @param leftLabel     label rendered at the left end of the slider
 * @param rightLabel    label rendered at the right end of the slider
 * @param items         items players must position; single-item lists show one handle
 * @param correctValues target position per item (itemId → value)
 * @param tolerance     ± margin around each target that counts as correct
 */
public record ScalesContent(
        int pointValue,
        Difficulty difficulty,
        String explanation,
        double min,
        double max,
        double step,
        String leftLabel,
        String rightLabel,
        List<ScaleItem> items,
        Map<String, Double> correctValues,
        double tolerance
) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.SCALES;
    }
}
