package com.cephadex.ambi.config;

import java.time.Instant;
import java.util.Date;
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
import org.springframework.stereotype.Component;

import com.mongodb.client.result.UpdateResult;

/**
 * One-shot migration backfilling the participants' durable admission marker.
 * Roster membership used to be "a participant document with no {@code left_at}",
 * which cannot tell an admitted member from a join still in flight; it is now
 * "a document carrying {@code admitted_at}". Every pre-existing participant
 * predates that field, so without this backfill they would vanish from every
 * roster read.
 *
 * <p><strong>Activation.</strong> Wired only when
 * {@code migrate.participantAdmittedAt.run=true} (passed by
 * {@code scripts/migrate-participant-admitted-at.sh}); a normal
 * {@code spring-boot:run} boot does nothing. After migrating, the application
 * exits. Pass {@code --migrate.participantAdmittedAt.dryRun=true} to log what
 * would change and write nothing.
 *
 * <p><strong>Mechanism.</strong> A single pipeline {@code updateMany} stamps
 * {@code admitted_at = $ifNull(joined_at, now)} on every document lacking the
 * field — raw {@link Document}s, because a pipeline update has no typed
 * equivalent here. Departed participants are stamped too: {@code left_at} filters
 * independently, and analytics wants an admission time on members who have since
 * left.
 *
 * <p><strong>Idempotency.</strong> The <em>absence</em> of {@code admitted_at} is
 * the sole marker of an un-migrated document and the migration sets it, so a
 * second run matches nothing and no existing timestamp is ever rewritten. Nothing
 * is deleted. The Redis roster sets are not seeded — {@code SessionRoster}
 * rehydrates them from these documents on first use.
 *
 * <p><strong>Hazard.</strong> A join that is mid-flight while this runs gets
 * stamped a moment before its own admit may refuse it; that only makes the
 * document briefly visible to a roster read, and the refusal's rollback deletes
 * it anyway. Running before the new backend boots avoids the window entirely.
 */
@Component
@ConditionalOnProperty(name = "migrate.participantAdmittedAt.run", havingValue = "true")
public class ParticipantAdmittedAtMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ParticipantAdmittedAtMigration.class);

    /** The field whose absence marks a participant as un-migrated. */
    static final String ADMITTED_AT_FIELD = "admitted_at";

    private static final String PARTICIPANTS = "participants";
    private static final String JOINED_AT_FIELD = "joined_at";
    private static final String DRY_RUN_OPTION = "migrate.participantAdmittedAt.dryRun";

    private final MongoTemplate mongoTemplate;
    private final ConfigurableApplicationContext context;

    public ParticipantAdmittedAtMigration(MongoTemplate mongoTemplate, ConfigurableApplicationContext context) {
        this.mongoTemplate = mongoTemplate;
        this.context = context;
    }

    @Override
    public void run(ApplicationArguments args) {
        boolean dryRun = args.containsOption(DRY_RUN_OPTION) && parseFlag(args.getOptionValues(DRY_RUN_OPTION));

        log.info("ParticipantAdmittedAtMigration starting (dryRun={})", dryRun);
        long stamped = migrate(dryRun);
        log.info("ParticipantAdmittedAtMigration finished — {} participant(s) {} — exiting.",
                stamped, dryRun ? "would be stamped" : "stamped");

        int code = SpringApplication.exit(context, () -> 0);
        System.exit(code);
    }

    /**
     * The sweep itself, separated from {@link #run} (which exits the JVM) so it is
     * callable from a test. Stamps {@code admitted_at} on every participant lacking
     * it, from its {@code joined_at} when there is one and from the migration's own
     * clock when there is not.
     *
     * @return how many documents were stamped, or would be on a dry run
     */
    long migrate(boolean dryRun) {
        Document filter = new Document(ADMITTED_AT_FIELD, new Document("$exists", false));
        if (dryRun) {
            return mongoTemplate.getCollection(PARTICIPANTS).countDocuments(filter);
        }
        UpdateResult result = mongoTemplate.getCollection(PARTICIPANTS).updateMany(filter,
                List.of(new Document("$set", new Document(ADMITTED_AT_FIELD,
                        new Document("$ifNull", List.of("$" + JOINED_AT_FIELD, Date.from(Instant.now())))))));
        return result.getModifiedCount();
    }

    private static boolean parseFlag(List<String> values) {
        return values == null || values.isEmpty() || Boolean.parseBoolean(values.get(0));
    }
}
