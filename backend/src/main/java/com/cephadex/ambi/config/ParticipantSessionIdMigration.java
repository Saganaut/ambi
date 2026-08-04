package com.cephadex.ambi.config;

import java.util.ArrayList;
import java.util.List;

import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Component;

import com.mongodb.client.result.UpdateResult;

/**
 * One-shot migration inverting the live-session roster. Historically a
 * {@code LiveSession} owned a {@code roster} array of participant ids and the
 * {@code Participant} document carried no back-reference, so a join had to
 * rewrite the whole session document (embedded deck snapshot included) under a
 * lock. Membership now hangs off {@code participants.session_id} like every other
 * child of a run, so this backfills that field from each session's roster array
 * and then {@code $unset}s the array.
 *
 * <p><strong>Activation.</strong> Wired only when
 * {@code migrate.participantSessionId.run=true} (passed by
 * {@code scripts/migrate-participant-session-id.sh}); a normal
 * {@code spring-boot:run} boot does nothing. After migrating, the application
 * exits. Pass {@code --migrate.participantSessionId.dryRun=true} to log what
 * would change and write nothing.
 *
 * <p><strong>Mechanism.</strong> Raw {@link Document}s, because the typed model
 * no longer declares {@code roster}. Each session's roster ids are stamped onto
 * their participants with one bulk {@code updateMany}, and only once that
 * succeeds is the array removed — so an interrupted run leaves the roster intact
 * and simply re-runs.
 *
 * <p><strong>Idempotency.</strong> The presence of {@code roster} is the sole
 * marker of an un-migrated session and the migration removes it, so a second run
 * matches nothing. Nothing is deleted: participants keep every field they had,
 * gaining only {@code session_id}. The Redis roster sets are not seeded —
 * {@code SessionRoster} rehydrates them from these documents on first use.
 */
@Component
@ConditionalOnProperty(name = "migrate.participantSessionId.run", havingValue = "true")
public class ParticipantSessionIdMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ParticipantSessionIdMigration.class);

    /** The legacy field whose presence marks a session as un-migrated. */
    static final String LEGACY_FIELD = "roster";

    private static final String SESSIONS = "LiveSessions";
    private static final String PARTICIPANTS = "participants";
    private static final String SESSION_ID_FIELD = "session_id";
    private static final String DRY_RUN_OPTION = "migrate.participantSessionId.dryRun";

    private final MongoTemplate mongoTemplate;
    private final ConfigurableApplicationContext context;

    public ParticipantSessionIdMigration(MongoTemplate mongoTemplate, ConfigurableApplicationContext context) {
        this.mongoTemplate = mongoTemplate;
        this.context = context;
    }

    @Override
    public void run(ApplicationArguments args) {
        boolean dryRun = args.containsOption(DRY_RUN_OPTION) && parseFlag(args.getOptionValues(DRY_RUN_OPTION));

        log.info("ParticipantSessionIdMigration starting (dryRun={})", dryRun);
        Result result = migrate(dryRun);
        log.info("ParticipantSessionIdMigration finished — {} roster array(s) {}, {} participant(s) {} — exiting.",
                result.sessions(), dryRun ? "would be unset" : "unset",
                result.participants(), dryRun ? "would be backfilled" : "backfilled");

        int code = SpringApplication.exit(context, () -> 0);
        System.exit(code);
    }

    /**
     * The sweep itself, separated from {@link #run} (which exits the JVM) so it is
     * callable from a test. Backfills each un-migrated session's roster ids onto
     * their participants, then removes the array — in that order, so an
     * interrupted run leaves the roster intact and simply re-runs.
     */
    Result migrate(boolean dryRun) {
        List<Document> sessions = mongoTemplate.find(
                new Query(Criteria.where(LEGACY_FIELD).exists(true)), Document.class, SESSIONS);

        int backfilled = 0;
        int migratedSessions = 0;
        for (Document session : sessions) {
            Object sessionId = session.get("_id");
            if (sessionId == null) {
                continue;
            }
            List<String> rosterIds = rosterOf(session);
            if (dryRun) {
                backfilled += rosterIds.size();
                migratedSessions++;
                continue;
            }
            if (!rosterIds.isEmpty()) {
                UpdateResult result = mongoTemplate.getCollection(PARTICIPANTS).updateMany(
                        new Document("_id", new Document("$in", rosterIds)),
                        new Document("$set", new Document(SESSION_ID_FIELD, sessionId.toString())));
                backfilled += (int) result.getModifiedCount();
            }
            mongoTemplate.getCollection(SESSIONS).updateOne(
                    new Document("_id", sessionId),
                    new Document("$unset", new Document(LEGACY_FIELD, "")));
            migratedSessions++;
        }
        return new Result(migratedSessions, backfilled);
    }

    /** How much one sweep changed (or would change, on a dry run). */
    record Result(int sessions, int participants) {
    }

    /** The session's legacy roster as participant ids, tolerating any non-string entry. */
    static List<String> rosterOf(Document session) {
        if (!(session.get(LEGACY_FIELD) instanceof List<?> entries)) {
            return List.of();
        }
        List<String> ids = new ArrayList<>(entries.size());
        for (Object entry : entries) {
            if (entry instanceof String id && !id.isBlank()) {
                ids.add(id);
            }
        }
        return ids;
    }

    private static boolean parseFlag(List<String> values) {
        return values == null || values.isEmpty() || Boolean.parseBoolean(values.get(0));
    }
}
