package com.cephadex.ambi.session.event.dto;

import java.util.List;

import com.cephadex.ambi.session.followUp.FollowUpOption;
import com.cephadex.ambi.session.followUp.FollowUpOptionSet;

/**
 * One candidate card on a follow-up board, carried on {@link FollowUpConfigView}
 * inside the round's {@link SlideView}.
 *
 * <p>Deliberately carries <strong>no author ids</strong> — the id→author mapping
 * stays server-side (the same rule {@link VoteOptionView} keeps), so a board
 * can't be read back to who wrote what. That mapping is also what rejects a
 * self-vote, so it has to stay on this side of the wire to be trustworthy.
 *
 * <p>For the same reason it carries <strong>no {@code authoredAnswer}
 * flag</strong>. On a {@code SPOT_THE_ANSWER} round one candidate is the
 * parent's own authored answer, and projecting that bit would hand the room the
 * answer it is being asked to spot — the secrecy is the game, exactly as
 * author anonymity is the dixit-style deception. It stays on
 * {@link FollowUpOption}, where grading reads it.
 *
 * @param optionId the opaque handle a pick is submitted against ({@code FollowUpAnswer})
 * @param text     the candidate's display text, or {@code null} for an image-only candidate
 * @param imageUrl presigned URL of the candidate's image, or {@code null} for a plain text candidate
 */
public record FollowUpOptionView(
        String optionId,
        String text,
        String imageUrl) {

    /**
     * The participant-safe views of a round's candidates (the authors are
     * dropped), <strong>in board order</strong>: unlike the vote options this
     * order is the payload — the set was minted as an ordered board and every
     * participant must read the same one.
     */
    public static List<FollowUpOptionView> from(FollowUpOptionSet options) {
        return options.options().stream()
                .map((FollowUpOption option) ->
                        new FollowUpOptionView(option.optionId(), option.text(), option.imageUrl()))
                .toList();
    }
}
