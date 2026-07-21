package com.cephadex.ambi.session.event.dto;

import java.util.List;
import java.util.Map;

import com.cephadex.ambi.session.redis.VoteOption;

/**
 * One votable submission as shown to voters, carried on
 * {@link com.cephadex.ambi.session.event.VotingOpened} for a voting round (D3).
 *
 * <p>Deliberately <strong>author-less</strong>: the option id is an opaque
 * server-minted handle whose mapping back to the submitting participant lives
 * only in the server-side {@code VoteStore}, so a deception round's client can
 * never tell whose answer an option is. Exactly one of {@code text} /
 * {@code imageUrl} is set — a drawing submission travels as a pre-resolved
 * presigned URL (see {@link DrawingSubmissionView} for why).
 *
 * @param optionId the opaque handle to vote for ({@code POST /votes})
 * @param text     the submission's preview text, or {@code null} for a drawing
 * @param imageUrl presigned URL of a drawing submission, or {@code null}
 */
public record VoteOptionView(
        String optionId,
        String text,
        String imageUrl) {

    /**
     * The participant-safe views of a round's vote options (the author is
     * dropped), sorted by their random option ids — a stable order that carries
     * no authorship hint and matches what a reconnecting client seeds from the
     * snapshot.
     */
    public static List<VoteOptionView> from(Map<String, VoteOption> optionsById) {
        return optionsById.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> new VoteOptionView(e.getKey(), e.getValue().text(), e.getValue().imageUrl()))
                .toList();
    }
}
