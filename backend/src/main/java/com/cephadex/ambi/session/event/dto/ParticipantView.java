package com.cephadex.ambi.session.event.dto;

import com.cephadex.ambi.session.participant.Participant;
import com.cephadex.ambi.session.participant.enums.ConnectionStatus;

/**
 * The wire view of a {@link Participant} broadcast to other players. Carries the
 * {@code participantId} (never the {@code userId} — stripped while the session is
 * live), the display profile, connection status, and the score breakdown.
 *
 * <p>The avatar is reduced to its built-in id for now; S3-backed custom avatar
 * images ({@code AppImage}) are deferred until the presigned-image-over-STOMP
 * path is settled (see plan).
 */
public record ParticipantView(
        String participantId,
        String displayName,
        String colorTag,
        String internalAvatarId,
        ConnectionStatus connectionStatus,
        ScoreView score) {

    /** Builds the view from a participant, stripping the {@code userId}. */
    public static ParticipantView from(Participant p) {
        String avatarId = p.getAvatar() == null ? null : p.getAvatar().getInternalAvatarId();
        return new ParticipantView(
                p.getParticipantId(),
                p.getDisplayName(),
                p.getColorTag(),
                avatarId,
                p.getConnectionStatus(),
                ScoreView.from(p.getScore()));
    }
}
