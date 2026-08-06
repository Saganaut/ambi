package com.cephadex.ambi.session.participant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.IndexOperations;
import org.springframework.stereotype.Component;

/**
 * Creates the {@code participants} collection indexes explicitly at startup.
 *
 * <p>This is the <strong>single source of truth</strong> for them — not the
 * {@code @Indexed} annotation on {@link Participant}. Spring Data MongoDB leaves
 * {@code spring.data.mongodb.auto-index-creation} <em>false</em>, so
 * annotation-driven indexes are never created, and {@code session_id} is the
 * only session→participant link: without an index every roster read and every
 * authorization check would be a collection scan. Mirrors
 * {@code UserIndexInitializer}.
 *
 * <p>{@link IndexOperations#createIndex} is idempotent for an unchanged
 * definition, so this is safe to run on every boot.
 */
@Component
public class ParticipantIndexInitializer {

    private static final Logger log = LoggerFactory.getLogger(ParticipantIndexInitializer.class);

    private final MongoTemplate mongoTemplate;

    public ParticipantIndexInitializer(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void ensureIndexes() {
        IndexOperations ops = mongoTemplate.indexOps(Participant.class);

        // The roster listing, in the join order the snapshot renders — and, on its
        // (session_id, left_at) prefix, the membership existence check that backs
        // an evicted Redis roster set. Both also filter admitted_at, left out of the
        // keys deliberately: $ne is a range predicate (it would not narrow the scan),
        // per-session documents are bounded by the cap, so it evaluates as a residual
        // predicate on the fetched docs — and re-issuing this index name with new
        // keys would throw IndexKeySpecsConflict against existing deployments.
        ops.createIndex(new Index().named("roster_by_session")
                .on("session_id", Sort.Direction.ASC)
                .on("left_at", Sort.Direction.ASC)
                .on("joined_at", Sort.Direction.ASC));

        // "Which participant is this caller" — the hottest read on the collection:
        // every session REST mutation and every STOMP subscribe resolves through it.
        ops.createIndex(new Index().named("participant_by_session_user")
                .on("session_id", Sort.Direction.ASC)
                .on("user_id", Sort.Direction.ASC)
                .on("left_at", Sort.Direction.ASC));

        log.info("Ensured participants indexes (session roster + session/user lookup)");
    }
}
