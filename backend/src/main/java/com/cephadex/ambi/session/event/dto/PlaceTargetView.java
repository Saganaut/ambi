package com.cephadex.ambi.session.event.dto;

import java.util.ArrayList;
import java.util.List;

import com.cephadex.ambi.presentation.slide.content.PlaceOnImageContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.PlaceItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.PlacePoint;

/**
 * One authored correct-location target on a Place-on-image slide, disclosed at
 * results reveal on
 * {@link com.cephadex.ambi.session.event.ResultsRevealed#placeTargets()} so the
 * board can draw the correct-location circles over the backing image.
 *
 * <p><strong>Reveal-only.</strong> The participant-facing
 * {@link PlaceOnImageConfigView} never carries the answer key. This view is
 * populated only once the round enters results reveal, and carries only the
 * circle geometry ({@code x}, {@code y}, {@code radius}, all normalized to
 * [0, 1]) against the {@code itemId} it belongs to.
 */
public record PlaceTargetView(String itemId, double x, double y, double radius) {

    /**
     * Projects the authored answer key into reveal views, walking {@code items}
     * in authored order so the disclosure order matches the bank, and emitting
     * one view per item that carries a {@code correctPositions} entry — an
     * unkeyed item simply has no circle, and a stale key naming no item is
     * dropped. Carries geometry only: the item's label, color and image are
     * already on the participant-safe {@link PlaceOnImageConfigView}, so the
     * board resolves them by {@code itemId} rather than re-receiving them here.
     * Returns an empty list when nothing is keyed (never {@code null}).
     */
    public static List<PlaceTargetView> from(PlaceOnImageContent content) {
        if (content.items() == null || content.correctPositions() == null) {
            return List.of();
        }
        List<PlaceTargetView> targets = new ArrayList<>();
        for (PlaceItem item : content.items()) {
            PlacePoint point = item.id() == null ? null : content.correctPositions().get(item.id());
            if (point != null) {
                targets.add(new PlaceTargetView(item.id(), point.x(), point.y(), content.tolerance()));
            }
        }
        return targets;
    }
}
