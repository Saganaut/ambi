package com.cephadex.ambi.session.event.dto;

import java.util.List;
import java.util.function.Function;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.slide.content.AllocationContent;

/**
 * The participant-safe slice of an Allocation slide's content carried on
 * {@link SlideView}: the options to split points across, and the size of the
 * point pool.
 *
 * <p><strong>Never carries {@code correctAllocations} or
 * {@code tolerancePerOption}</strong> — the allocations are the answer key, and
 * the tolerance is grading-only knowledge pre-reveal (the same rule as
 * {@link ScalesConfigView}). {@code totalPointsToAllocate} <em>does</em> travel:
 * the board needs it to drive the pool counter, and it is not answer-key
 * material. The tolerance ships at reveal instead, on
 * {@link AllocationTargetView}. Option images travel as pre-resolved URLs so raw
 * storage keys never enter the STOMP/Redis event path.
 */
public record AllocationConfigView(
        List<McqOptionView> options,
        int totalPointsToAllocate) {

    public static AllocationConfigView from(AllocationContent content, Function<AppImage, String> imageUrl) {
        List<McqOptionView> options = content.options() == null ? List.of()
                : content.options().stream()
                        .map(option -> McqOptionView.from(option, imageUrl))
                        .toList();
        return new AllocationConfigView(options, content.totalPointsToAllocate());
    }
}
