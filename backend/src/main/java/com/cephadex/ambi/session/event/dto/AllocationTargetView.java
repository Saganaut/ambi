package com.cephadex.ambi.session.event.dto;

import java.util.ArrayList;
import java.util.List;

import com.cephadex.ambi.presentation.slide.content.AllocationContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.McqOption;

/**
 * One authored correct allocation on an Allocation slide, disclosed at results
 * reveal on
 * {@link com.cephadex.ambi.session.event.ResultsRevealed#allocationTargets()} so
 * the board can mark the answer key against each option's bar.
 *
 * <p><strong>Reveal-only.</strong> The participant-facing
 * {@link AllocationConfigView} never carries the answer key, nor the
 * {@code tolerance} that grades it. This view is populated only once the round
 * enters results reveal, and carries only the keyed {@code points} and the
 * per-option {@code tolerance} against the {@code optionId} they belong to.
 */
public record AllocationTargetView(String optionId, int points, int tolerance) {

    /**
     * Projects the authored answer key into reveal views, walking {@code options}
     * in authored order so the disclosure order matches the board, and emitting
     * one view per option that carries a {@code correctAllocations} entry — an
     * unkeyed option simply has no target, and a stale key naming no option is
     * dropped. Carries the key only: the option's label, colour and image are
     * already on the participant-safe {@link AllocationConfigView}, so the board
     * resolves them by {@code optionId} rather than re-receiving them here.
     * Returns an empty list when nothing is keyed (never {@code null}).
     */
    public static List<AllocationTargetView> from(AllocationContent content) {
        if (content.options() == null || content.correctAllocations() == null) {
            return List.of();
        }
        List<AllocationTargetView> targets = new ArrayList<>();
        for (McqOption option : content.options()) {
            Integer points = option.id() == null ? null : content.correctAllocations().get(option.id());
            if (points != null) {
                targets.add(new AllocationTargetView(option.id(), points, content.tolerancePerOption()));
            }
        }
        return targets;
    }
}
