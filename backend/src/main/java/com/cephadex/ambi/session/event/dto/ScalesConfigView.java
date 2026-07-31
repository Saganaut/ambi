package com.cephadex.ambi.session.event.dto;

import java.util.List;

import com.cephadex.ambi.presentation.slide.content.ScalesContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScaleItem;

/**
 * The participant-safe slice of a Scales slide's content carried on
 * {@link SlideView}: the scale endpoints, anchor labels, and the statements
 * to rate.
 *
 * <p><strong>Never carries {@code correctValues} or {@code tolerance}</strong>
 * — the values are the answer key, and the tolerance is grading-only knowledge
 * pre-reveal. {@code min}/{@code max} <em>do</em> travel (unlike the axis
 * tolerance): the board needs them to render the scale-unit readout, and they
 * are not answer-key material. {@code ScaleItem} carries an optional image and
 * color for authoring, but neither reaches players yet (a named follow-up, same
 * presigned-URL story as grid item images), so an item travels as id + label
 * only.
 */
public record ScalesConfigView(
        double min,
        double max,
        String leftLabel,
        String rightLabel,
        List<ScaleItemView> items) {

    /** One statement to rate: the id positions are keyed by, and its label. */
    public record ScaleItemView(String id, String label) {
    }

    public static ScalesConfigView from(ScalesContent content) {
        List<ScaleItemView> items = content.items() == null ? List.of()
                : content.items().stream()
                        .map((ScaleItem item) -> new ScaleItemView(item.id(), item.label()))
                        .toList();
        return new ScalesConfigView(
                content.min(),
                content.max(),
                content.leftLabel(),
                content.rightLabel(),
                items);
    }
}
