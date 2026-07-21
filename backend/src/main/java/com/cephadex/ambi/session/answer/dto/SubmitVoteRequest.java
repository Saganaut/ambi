package com.cephadex.ambi.session.answer.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Body of {@code POST /api/liveSessions/{id}/votes}: which voting slide the vote
 * is for, plus the opaque option id being voted for (minted server-side when
 * voting opened and carried on {@code VotingOpened} / the snapshot's
 * {@code voteOptions}). The session id is the path variable, not part of the
 * body.
 */
public record SubmitVoteRequest(
        @NotBlank String slideId,
        @NotBlank String optionId) {
}
