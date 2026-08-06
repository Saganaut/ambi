package com.cephadex.ambi.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

import org.bson.Document;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.test.context.ActiveProfiles;

/**
 * The admission-marker backfill against the real Docker Mongo: a pre-existing
 * participant is stamped from its own {@code joined_at}, a document that already
 * carries {@code admitted_at} is left exactly as it was, and a second run is a
 * no-op.
 */
@SpringBootTest(classes = AmbiApplication.class)
@ActiveProfiles("test")
class ParticipantAdmittedAtMigrationIT {

    private static final String PARTICIPANTS = "participants";
    private static final String LEGACY = "it-admitted-legacy";
    private static final String STAMPED = "it-admitted-stamped";
    private static final String NO_JOINED_AT = "it-admitted-no-joined-at";

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private ConfigurableApplicationContext context;

    private ParticipantAdmittedAtMigration migration;

    @BeforeEach
    void setUp() {
        migration = new ParticipantAdmittedAtMigration(mongoTemplate, context);
        clean();
        // The shared test database may already hold un-stamped participants from
        // other fixtures. Draining them first (the migration is global and
        // idempotent) makes the counts asserted below describe this test's own
        // documents.
        migration.migrate(false);
    }

    @AfterEach
    void clean() {
        mongoTemplate.remove(new Query(Criteria.where("_id").in(LEGACY, STAMPED, NO_JOINED_AT)),
                Document.class, PARTICIPANTS);
    }

    @Test
    void stampsAdmittedAtFromJoinedAt() {
        Date joined = Date.from(Instant.now().minus(3, ChronoUnit.HOURS));
        Date admitted = Date.from(Instant.now().minus(1, ChronoUnit.HOURS));
        legacyParticipant(LEGACY, joined);
        alreadyStamped(STAMPED, joined, admitted);

        long stamped = migration.migrate(false);

        assertThat(stamped).isEqualTo(1);
        assertThat(admittedAtOf(LEGACY)).isEqualTo(joined);
        // A document that already carries the marker is neither counted nor rewritten.
        assertThat(admittedAtOf(STAMPED)).isEqualTo(admitted);
    }

    @Test
    void fallsBackToNowWhenTheDocumentHasNoJoinedAt() {
        legacyParticipant(NO_JOINED_AT, null);

        assertThat(migration.migrate(false)).isEqualTo(1);
        // No join timestamp to copy, so membership is dated from the migration itself
        // — the marker must never be left null.
        assertThat(admittedAtOf(NO_JOINED_AT)).isNotNull();
    }

    @Test
    void isIdempotent() {
        Date joined = Date.from(Instant.now().minus(2, ChronoUnit.HOURS));
        legacyParticipant(LEGACY, joined);

        migration.migrate(false);
        Date first = admittedAtOf(LEGACY);
        long second = migration.migrate(false);

        assertThat(second).isZero();
        assertThat(admittedAtOf(LEGACY)).isEqualTo(first);
    }

    @Test
    void aDryRunWritesNothing() {
        legacyParticipant(LEGACY, Date.from(Instant.now()));

        assertThat(migration.migrate(true)).isEqualTo(1);
        assertThat(admittedAtOf(LEGACY)).isNull();
    }

    // ── fixtures ──────────────────────────────────────────────────────────────

    /** A participant from before the marker existed; {@code joined} may be null. */
    private void legacyParticipant(String participantId, Date joined) {
        Document doc = new Document("_id", participantId)
                .append("session_id", "it-admitted-session")
                .append("display_name", participantId);
        if (joined != null) {
            doc.append("joined_at", joined);
        }
        mongoTemplate.getCollection(PARTICIPANTS).insertOne(doc);
    }

    private void alreadyStamped(String participantId, Date joined, Date admitted) {
        mongoTemplate.getCollection(PARTICIPANTS).insertOne(new Document("_id", participantId)
                .append("session_id", "it-admitted-session")
                .append("display_name", participantId)
                .append("joined_at", joined)
                .append("admitted_at", admitted));
    }

    private Date admittedAtOf(String participantId) {
        Document doc = mongoTemplate.findOne(
                new Query(Criteria.where("_id").is(participantId)), Document.class, PARTICIPANTS);
        return doc == null ? null : doc.getDate("admitted_at");
    }
}
