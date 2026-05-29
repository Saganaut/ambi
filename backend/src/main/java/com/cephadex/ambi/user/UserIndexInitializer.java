package com.cephadex.ambi.user;

import java.time.Duration;

import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.IndexOperations;
import org.springframework.data.mongodb.core.index.PartialIndexFilter;
import org.springframework.stereotype.Component;

/**
 * Creates the {@code users} collection indexes explicitly at startup.
 *
 * <p>This is the <strong>single source of truth</strong> for those indexes —
 * not the {@code @Indexed} annotations on {@link User}. Spring Data MongoDB
 * leaves {@code spring.data.mongodb.auto-index-creation} <em>false</em> by
 * default, so annotation-driven indexes are never created; without this runner
 * Invariant 9 (uniqueness enforced by the DB) and the guest TTL reaper
 * (auth/README.md) would both silently do nothing. An explicit runner is also
 * the only place we can express the partial-filter and compound-key shapes the
 * annotations can't capture cleanly.
 *
 * <p>{@link IndexOperations#createIndex} is idempotent for an unchanged
 * definition, so this is safe to run on every boot.
 */
@Component
public class UserIndexInitializer {

    private static final Logger log = LoggerFactory.getLogger(UserIndexInitializer.class);

    /**
     * Partial-filter predicate that matches only documents where the field
     * holds an actual string. This excludes both absent fields and explicit
     * {@code null}s regardless of how the mapper serialises them — the property
     * we rely on to let guests (no email, no external id) coexist under unique
     * indexes.
     */
    private static Document isString(String field) {
        return new Document(field, new Document("$type", "string"));
    }

    private final MongoTemplate mongoTemplate;

    public UserIndexInitializer(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void ensureIndexes() {
        IndexOperations ops = mongoTemplate.indexOps(User.class);

        // Always-present identifiers — plain unique.
        ops.createIndex(new Index().named("uniq_public_id").on("public_id", Sort.Direction.ASC).unique());
        ops.createIndex(new Index().named("uniq_username").on("username", Sort.Direction.ASC).unique());

        // Email is optional (guests have none). A plain unique index would treat
        // every emailless guest as colliding on null, so make it partial: only
        // documents with a string email participate (Inv 9, without breaking
        // guest creation).
        ops.createIndex(new Index().named("uniq_email_address").on("email_address", Sort.Direction.ASC).unique()
                .partial(PartialIndexFilter.of(isString("email_address"))));

        // The real identity key for an external account is the pair
        // (authProvider, externalProviderId) — see auth/README.md. Enforce it as
        // a DB constraint so OAuth de-dup is not a check-then-act race. Partial on
        // external_provider_id so INTERNAL guests (null external id) are excluded.
        ops.createIndex(new Index().named("uniq_oauth_identity")
                .on("auth.auth_provider", Sort.Direction.ASC)
                .on("auth.external_provider_id", Sort.Direction.ASC)
                .unique()
                .partial(PartialIndexFilter.of(isString("auth.external_provider_id"))));

        // Guest TTL reaper: expireAfterSeconds = 0 means "delete when the date in
        // this field passes". Registered accounts clear the field on upgrade and
        // documents without a date are ignored by the TTL monitor.
        ops.createIndex(new Index().named("ttl_guest_expires_at").on("guest_expires_at", Sort.Direction.ASC)
                .expire(Duration.ZERO));

        log.info("Ensured users-collection indexes (public_id, username, email, oauth identity, guest TTL)");
    }
}
