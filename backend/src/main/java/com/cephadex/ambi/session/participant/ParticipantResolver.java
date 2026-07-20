package com.cephadex.ambi.session.participant;

import java.util.Optional;

import org.springframework.stereotype.Component;

import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.exception.ForbiddenException;
import com.cephadex.ambi.session.liveSession.LiveSession;

/**
 * Resolves an authenticated caller to their (non-banned) participant on a live
 * session's roster. The roster holds participant ids while a request carries a user
 * id, so this is the single place that turns "who is calling" into "which
 * participant" for the session command endpoints (answer, leave, host checks).
 */
@Component
public class ParticipantResolver {

    private final ParticipantRepository participants;

    public ParticipantResolver(ParticipantRepository participants) {
        this.participants = participants;
    }

    /**
     * The caller's participant on {@code session}'s roster.
     *
     * @throws ForbiddenException if the caller has no user id, or no non-banned
     *                            participant on the roster
     */
    public Participant resolve(LiveSession session, AmbiPrincipal principal) {
        return find(session, principal)
                .orElseThrow(() -> new ForbiddenException("NOT_A_PARTICIPANT", "not a participant in this session"));
    }

    /**
     * The caller's participant on {@code session}'s roster, if present — the
     * non-throwing counterpart to {@link #resolve}. Returns empty when the caller
     * carries no user id, or has no non-banned participant on the roster. Used by
     * the boundary that must decide roster membership without treating a miss as an
     * error (the STOMP subscribe authorization).
     */
    public Optional<Participant> find(LiveSession session, AmbiPrincipal principal) {
        String userId = principal == null ? null : principal.userId();
        if (userId == null) {
            return Optional.empty();
        }
        return participants.findAllById(session.getRoster()).stream()
                .filter(p -> !p.isBanned() && userId.equals(p.getUserId()))
                .findFirst();
    }
}
