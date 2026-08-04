package com.cephadex.ambi.session.participant;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface ParticipantRepository extends MongoRepository<Participant, String> {

    List<Participant> findByBanned(boolean banned);

    /**
     * The session's roster in join order — the durable source of truth the Redis
     * roster set is only a cache of. Ordered by {@code joinedAt} because the
     * snapshot's roster order is load-bearing (clients render it as-is).
     */
    List<Participant> findBySessionIdAndLeftAtIsNullOrderByJoinedAtAsc(String sessionId);

    /** The caller's live participant on a session, resolved from their user id. */
    Optional<Participant> findFirstBySessionIdAndUserIdAndLeftAtIsNull(String sessionId, String userId);

    /**
     * Membership fallback for when the Redis roster set has been evicted — an
     * eviction must degrade to a slower read, never lock a participant out.
     */
    boolean existsByParticipantIdAndSessionIdAndLeftAtIsNull(String participantId, String sessionId);
}
