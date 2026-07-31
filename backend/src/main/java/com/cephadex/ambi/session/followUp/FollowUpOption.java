package com.cephadex.ambi.session.followUp;

import java.util.Set;

/**
 * One candidate on a follow-up board, minted from the parent round's
 * submissions (or from the parent slide's authored choices) and voted on by
 * picking exactly one.
 *
 * <p>{@code authorParticipantIds} and {@code authoredAnswer} are both
 * <strong>server-only</strong> and must never reach a wire DTO: a board that
 * showed whose submission a candidate came from would de-anonymise the parent
 * round, and one that flagged the authored answer would give away the whole
 * {@code SPOT_THE_ANSWER} game. Self-vote rejection and scoring both need the
 * two to stay on this side of the wire.
 *
 * @param optionId             stable within a round — re-minting the same
 *                             submissions yields the same id, so a round
 *                             restart doesn't invalidate a cast vote
 * @param text                 the candidate's display text, or {@code null} for
 *                             a drawing candidate
 * @param imageUrl             presigned URL of the candidate's image ({@code null}
 *                             for a plain text candidate; non-null for a drawing
 *                             and for an image MCQ choice). Resolved once at
 *                             minting — a follow-up round is minutes long, far
 *                             inside the presign validity
 * @param authorParticipantIds every participant whose submission this candidate
 *                             stands for (more than one when identical text was
 *                             merged); empty for a candidate minted from an
 *                             authored MCQ choice, which has no submitter
 * @param authoredAnswer       whether this candidate is the parent's own
 *                             authored answer, seeded into the board by a
 *                             {@code SPOT_THE_ANSWER} mint. False for every
 *                             candidate of every other mode — and for the
 *                             candidates of a {@code SPOT_THE_ANSWER} round
 *                             whose parent lost its answer key before the mint.
 *                             A participant submission whose wording matched the
 *                             authored answer merges into this same candidate,
 *                             so it can carry both the flag and its submitters
 */
public record FollowUpOption(String optionId, String text, String imageUrl, Set<String> authorParticipantIds,
        boolean authoredAnswer) {
}
