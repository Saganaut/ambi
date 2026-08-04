package com.cephadex.ambi.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

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
 * The roster inversion migration against the real Docker Mongo: a legacy
 * session's {@code roster} array is stamped onto its participants as
 * {@code session_id} and then removed, participants of other sessions are left
 * alone, and a second run is a no-op.
 */
@SpringBootTest(classes = AmbiApplication.class)
@ActiveProfiles("test")
class ParticipantSessionIdMigrationIT {

    private static final String SID = "it-migration-session";
    private static final String OTHER_SID = "it-migration-session-other";
    private static final String SESSIONS = "LiveSessions";
    private static final String PARTICIPANTS = "participants";

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private ConfigurableApplicationContext context;

    private ParticipantSessionIdMigration migration;

    @BeforeEach
    void setUp() {
        migration = new ParticipantSessionIdMigration(mongoTemplate, context);
        clean();
        // The shared test database may already hold legacy sessions from other
        // fixtures. Draining them first (the migration is global and idempotent)
        // makes the counts asserted below describe this test's own documents.
        migration.migrate(false);
    }

    @AfterEach
    void clean() {
        mongoTemplate.remove(new Query(Criteria.where("_id").in(SID, OTHER_SID)), Document.class, SESSIONS);
        mongoTemplate.remove(new Query(Criteria.where("_id").in("p-host", "p-2", "p-outsider")),
                Document.class, PARTICIPANTS);
    }

    @Test
    void backfillsSessionIdOntoRosterParticipantsAndUnsetsTheArray() {
        legacySession(SID, List.of("p-host", "p-2"));
        participant("p-host");
        participant("p-2");
        participant("p-outsider");

        ParticipantSessionIdMigration.Result result = migration.migrate(false);

        assertThat(result.sessions()).isEqualTo(1);
        assertThat(result.participants()).isEqualTo(2);
        assertThat(sessionIdOf("p-host")).isEqualTo(SID);
        assertThat(sessionIdOf("p-2")).isEqualTo(SID);
        // A participant nobody's roster named is untouched.
        assertThat(sessionIdOf("p-outsider")).isNull();
        // The array is gone, so the session document no longer duplicates membership.
        assertThat(session(SID).get("roster")).isNull();
    }

    @Test
    void isIdempotent() {
        legacySession(SID, List.of("p-host"));
        participant("p-host");

        migration.migrate(false);
        ParticipantSessionIdMigration.Result second = migration.migrate(false);

        assertThat(second.sessions()).isZero();
        assertThat(second.participants()).isZero();
        assertThat(sessionIdOf("p-host")).isEqualTo(SID);
    }

    @Test
    void aDryRunWritesNothing() {
        legacySession(SID, List.of("p-host"));
        participant("p-host");

        ParticipantSessionIdMigration.Result result = migration.migrate(true);

        assertThat(result.sessions()).isEqualTo(1);
        assertThat(sessionIdOf("p-host")).isNull();
        assertThat(session(SID).get("roster")).isNotNull();
    }

    // ── fixtures ──────────────────────────────────────────────────────────────

    private void legacySession(String sessionId, List<String> roster) {
        mongoTemplate.getCollection(SESSIONS).insertOne(
                new Document("_id", sessionId).append("roster", roster).append("status", "LOBBY"));
    }

    private void participant(String participantId) {
        mongoTemplate.getCollection(PARTICIPANTS).insertOne(
                new Document("_id", participantId).append("display_name", participantId));
    }

    private Document session(String sessionId) {
        return mongoTemplate.findOne(new Query(Criteria.where("_id").is(sessionId)), Document.class, SESSIONS);
    }

    private String sessionIdOf(String participantId) {
        Document doc = mongoTemplate.findOne(
                new Query(Criteria.where("_id").is(participantId)), Document.class, PARTICIPANTS);
        return doc == null ? null : doc.getString("session_id");
    }
}
