package com.cephadex.ambi.session.event.dto;

import java.util.List;

import com.cephadex.ambi.presentation.slide.content.PlaceOnImageContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.Target;

/**
 * One authored correct-location target on a Place-on-image slide, disclosed at
 * results reveal on
 * {@link com.cephadex.ambi.session.event.ResultsRevealed#placeTargets()} so the
 * board can draw the correct-location circles over the backing image.
 *
 * <p><strong>Reveal-only.</strong> The participant-facing
 * {@link PlaceOnImageConfigView} never carries the targets — they are the answer
 * key. This view is populated only once the round enters results reveal, and
 * carries only what the reveal is meant to disclose: the circle geometry
 * ({@code x}, {@code y}, {@code radius}, all normalized to [0, 1]) plus the
 * target's author annotations ({@code label}, {@code color}, both optional and
 * possibly {@code null}). {@code id} is included solely as a stable client list
 * key. The per-target annotation image ({@link Target#image()}) is omitted for
 * v1 — the board renders labelled circles, not thumbnails, so nothing is
 * presigned here.
 */
public record PlaceTargetView(String id, double x, double y, double radius, String label, String color) {

    /**
     * Projects the slide's authored {@code correctTargets} into reveal views.
     * Returns an empty list when the slide defines no targets, so the reveal
     * simply draws no circles (never {@code null}); the caller returns
     * {@code null} for non-Place-on-image slides so the event field stays absent.
     */
    public static List<PlaceTargetView> from(PlaceOnImageContent content) {
        if (content.correctTargets() == null) {
            return List.of();
        }
        return content.correctTargets().stream()
                .map((Target target) -> new PlaceTargetView(
                        target.id(), target.x(), target.y(), target.radius(), target.label(), target.color()))
                .toList();
    }
}
