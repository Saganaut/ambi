package com.cephadex.ambi.session.dto;

import java.time.Instant;

import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.session.participant.Participant;
import com.cephadex.ambi.user.Avatar;

/**
 * Result of joining a live session, returned to the player. Carries the
 * {@code publicId} so the client can subscribe to {@code /topic/session/{publicId}}
 * and the minted {@code participantId} that identifies them for the rest of the run.
 */
public record JoinSessionResponse(
        String sessionId,
        String publicId,
        String participantId,
        String displayName,
        Avatar avatar,
        Instant joinedAt) {

    public static JoinSessionResponse from(LiveSession session, Participant participant) {
        return new JoinSessionResponse(
                session.getId(),
                session.getPublicId(),
                participant.getParticipantId(),
                participant.getDisplayName(),
                participant.getAvatar(),
                participant.getJoinedAt());
    }
}
