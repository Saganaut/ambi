package com.cephadex.ambi.session.event.dto;

import java.util.List;

import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.FollowUpContent;
import com.cephadex.ambi.presentation.slide.enums.FollowUpMode;
import com.cephadex.ambi.session.followUp.FollowUpOptionSet;

/**
 * The runtime config of a follow-up round carried on {@link SlideView}: what it
 * asks ({@code mode}), which parent round it reads, and the candidates the board
 * votes on.
 *
 * <p>Unlike every other {@code *ConfigView} the {@code options} are
 * <strong>runtime state, not slide content</strong> — they are minted from the
 * parent round's submissions when the round opens and read back from the
 * server-side snapshot, so this view can only be built where that snapshot is
 * reachable (never from the {@link Slide} alone). The parent's title travels so
 * the board can name what it is asking about without a second lookup.
 *
 * @param mode          what the follow-up asks about its parent's submissions
 * @param parentSlideId the parent round this follow-up reads
 * @param parentTitle   the parent round's prompt, or {@code null} if it had none
 * @param options       the candidates in board order, author-less
 *                      ({@link FollowUpOptionView})
 */
public record FollowUpConfigView(
        FollowUpMode mode,
        String parentSlideId,
        String parentTitle,
        List<FollowUpOptionView> options) {

    /**
     * Builds the round's config from its content, its resolved {@code parent}
     * slide (may be {@code null} if the snapshot no longer holds it), and the
     * candidate set snapshotted when the round opened.
     */
    public static FollowUpConfigView from(FollowUpContent content, Slide parent, FollowUpOptionSet options) {
        return new FollowUpConfigView(
                content.mode(),
                parent == null ? null : parent.getId(),
                parent == null ? null : parent.getTitle(),
                FollowUpOptionView.from(options));
    }
}
