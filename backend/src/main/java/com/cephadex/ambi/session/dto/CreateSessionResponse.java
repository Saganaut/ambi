package com.cephadex.ambi.session.dto;

import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.user.Avatar;
import com.cephadex.ambi.user.User;

/**
 * Result of creating a live session, returned to the host. Carries the
 * {@code publicId} so the host can subscribe to {@code /topic/session/{publicId}},
 * and the {@code roomCode} to share with players.
 */
public record CreateSessionResponse(
        String sessionId,
        String publicId,
        String roomCode,
        String hostParticipantId,
        String displayName,
        Avatar avatar) {

    public static CreateSessionResponse from(LiveSession session, User host) {
        return new CreateSessionResponse(
                session.getId(),
                session.getPublicId(),
                session.getRoomCode(),
                session.getHostParticipantId(),
                host.getDisplayName(),
                host.getAvatar());
    }
}
