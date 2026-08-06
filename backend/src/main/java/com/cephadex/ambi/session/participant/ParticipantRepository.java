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
     *
     * <p>Only admitted documents count: a joiner's document is saved before the
     * roster admits it, so without the {@code admittedAt} filter this query would
     * report mid-flight joiners the admit may still refuse.
     */
    List<Participant> findBySessionIdAndLeftAtIsNullAndAdmittedAtNotNullOrderByJoinedAtAsc(String sessionId);

    /**
     * The caller's live participant on a session, resolved from their user id.
     *
     * <p>Deliberately <strong>not</strong> filtered on {@code admittedAt}: this
     * answers "which participant is this caller", not "is this caller a member" —
     * {@code SessionRoster.contains} is the membership gate. An unadmitted document
     * is unreachable by any other request anyway (the joining thread holds it until
     * its join returns), and the lookup must stay permissive so a double-failure
     * orphan (the admission stamp failed <em>and</em> the rollback delete failed)
     * can still resolve itself and leave.
     */
    Optional<Participant> findFirstBySessionIdAndUserIdAndLeftAtIsNull(String sessionId, String userId);

    /**
     * Membership fallback for when the Redis roster set has been evicted — an
     * eviction must degrade to a slower read, never lock a participant out. Only an
     * admitted document is membership, so a mid-flight joiner is invisible here too.
     */
    boolean existsByParticipantIdAndSessionIdAndLeftAtIsNullAndAdmittedAtNotNull(String participantId,
            String sessionId);
}
