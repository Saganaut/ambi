package com.cephadex.ambi.config;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

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

/**
 * One-shot migration rewriting legacy {@code PLACE_ON_IMAGE} slide content from
 * the old {@code correctTargets} list into the item-bank + answer-key shape
 * ({@code items}, {@code correctPositions}, {@code tolerance}) that
 * {@code PlaceOnImageContent} now declares.
 *
 * <p>
 * <strong>Why a migration at all.</strong> Spring Data instantiates records by
 * component name: a legacy document carries none of the three new fields, and
 * {@code tolerance} is a primitive {@code double}, so reading one back would
 * fail outright rather than degrade. The old shape is not readable by the new
 * model, so it has to be rewritten at the document level.
 *
 * <p>
 * <strong>Activation.</strong> Wired only when
 * {@code migrate.placeOnImage.run=true} (passed by
 * {@code scripts/migrate-place-on-image.sh}); a normal {@code spring-boot:run}
 * boot does nothing. After migrating, the application exits — the script binds a
 * random port so this can run alongside a normally-running backend on 8080.
 * Pass {@code --migrate.placeOnImage.dryRun=true} to log what would change and
 * write nothing.
 *
 * <p>
 * <strong>Two collections.</strong> {@code LiveSession} persists a full
 * {@link com.cephadex.ambi.presentation.deck.Deck} snapshot, so legacy content
 * lives in {@code LiveSessions.deck.slides[]} as well as {@code decks.slides[]}.
 * Both are covered.
 *
 * <p>
 * <strong>Mechanism.</strong> Everything runs on raw {@link Document}s, never
 * the typed model — the whole point is that the typed model can no longer read
 * these documents. Each matched document is walked in memory and written back
 * with a single {@code replaceOne}.
 *
 * <p>
 * <strong>Idempotency.</strong> The presence of {@code correctTargets} is the
 * sole marker of a legacy slide, and the migration removes it; a second run
 * matches nothing. Nothing is deleted: every target becomes an item, and a
 * target carrying coordinates additionally becomes an answer-key entry. Targets
 * with no id get a server-minted one so the key can name them.
 */
@Component
@ConditionalOnProperty(name = "migrate.placeOnImage.run", havingValue = "true")
public class PlaceOnImageContentMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(PlaceOnImageContentMigration.class);

    /** The legacy field whose presence marks a slide as un-migrated. */
    static final String LEGACY_FIELD = "correctTargets";

    /** Tolerance for a legacy slide whose targets all lack a radius. */
    static final double DEFAULT_TOLERANCE = 0.1;

    private static final String DRY_RUN_OPTION = "migrate.placeOnImage.dryRun";

    /** A collection and the dotted path to its slides array. */
    private record Scope(String collection, String slidesPath) {
    }

    private static final List<Scope> SCOPES = List.of(
            new Scope("decks", "slides"),
            new Scope("LiveSessions", "deck.slides"));

    private final MongoTemplate mongoTemplate;
    private final ConfigurableApplicationContext context;

    public PlaceOnImageContentMigration(MongoTemplate mongoTemplate,
            ConfigurableApplicationContext context) {
        this.mongoTemplate = mongoTemplate;
        this.context = context;
    }

    @Override
    public void run(ApplicationArguments args) {
        boolean dryRun = args.containsOption(DRY_RUN_OPTION)
                && parseFlag(args.getOptionValues(DRY_RUN_OPTION));

        log.info("PlaceOnImageContentMigration starting (dryRun={})", dryRun);
        int slides = 0;
        for (Scope scope : SCOPES) {
            slides += migrateScope(scope, dryRun);
        }
        log.info("PlaceOnImageContentMigration finished — {} slide(s) {} — exiting.",
                slides, dryRun ? "would be migrated" : "migrated");

        int code = SpringApplication.exit(context, () -> 0);
        System.exit(code);
    }

    // ── Per-collection sweep ───────────────────────────────────────────────────

    private int migrateScope(Scope scope, boolean dryRun) {
        Query query = new Query(
                Criteria.where(scope.slidesPath() + ".content." + LEGACY_FIELD).exists(true));
        List<Document> documents = mongoTemplate.find(query, Document.class, scope.collection());

        int migratedSlides = 0;
        int migratedDocuments = 0;
        for (Document document : documents) {
            int changed = migrateSlides(resolve(document, scope.slidesPath()));
            if (changed == 0) {
                continue;
            }
            migratedSlides += changed;
            migratedDocuments++;
            if (!dryRun) {
                mongoTemplate.getCollection(scope.collection())
                        .replaceOne(new Document("_id", document.get("_id")), document);
            }
        }
        log.info("{}: {} document(s) matched, {} {}, {} slide(s) affected",
                scope.collection(), documents.size(), migratedDocuments,
                dryRun ? "would be rewritten" : "rewritten", migratedSlides);
        return migratedSlides;
    }

    /** Walks a dotted path from the document root, tolerating any missing hop. */
    private static Object resolve(Document document, String path) {
        Object current = document;
        for (String segment : path.split("\\.")) {
            if (!(current instanceof Document node)) {
                return null;
            }
            current = node.get(segment);
        }
        return current;
    }

    // ── Transform ──────────────────────────────────────────────────────────────

    /**
     * Migrates every legacy slide in a raw slides array, returning how many were
     * rewritten. Non-slide entries and slides with no legacy content are skipped
     * untouched, so a partially-migrated deck converges on a re-run.
     *
     * @param slides the raw value at the scope's slides path — anything that is
     *               not a list is treated as nothing to do
     * @return how many slides were rewritten
     */
    static int migrateSlides(Object slides) {
        if (!(slides instanceof List<?> entries)) {
            return 0;
        }
        int migrated = 0;
        for (Object entry : entries) {
            if (entry instanceof Document slide
                    && slide.get("content") instanceof Document content
                    && migrateContent(content)) {
                migrated++;
            }
        }
        return migrated;
    }

    /**
     * Rewrites one legacy {@code PlaceOnImageContent} document in place: every
     * target becomes an {@code items} entry (id, label, image, color), every
     * target carrying both coordinates additionally becomes a
     * {@code correctPositions} entry keyed by that id, and the slide's single
     * {@code tolerance} takes the first radius any target declared — the editor
     * only ever wrote one value across a slide — falling back to
     * {@value #DEFAULT_TOLERANCE}.
     *
     * @return {@code true} when the content was legacy and has been rewritten
     */
    static boolean migrateContent(Document content) {
        if (!(content.get(LEGACY_FIELD) instanceof List<?> targets)) {
            return false;
        }

        List<Document> items = new ArrayList<>();
        Document positions = new Document();
        Double tolerance = null;
        for (Object entry : targets) {
            if (!(entry instanceof Document target)) {
                continue;
            }
            String id = idOf(target);
            Document item = new Document("_id", id);
            copyIfPresent(target, item, "label");
            copyIfPresent(target, item, "image");
            copyIfPresent(target, item, "color");
            items.add(item);

            if (target.get("x") instanceof Number x && target.get("y") instanceof Number y) {
                positions.put(id, new Document("x", x.doubleValue()).append("y", y.doubleValue()));
            }
            if (tolerance == null && target.get("radius") instanceof Number radius) {
                tolerance = radius.doubleValue();
            }
        }

        content.remove(LEGACY_FIELD);
        content.put("items", items);
        content.put("correctPositions", positions);
        content.put("tolerance", tolerance == null ? DEFAULT_TOLERANCE : tolerance.doubleValue());
        return true;
    }

    /**
     * The target's persisted id, or a freshly minted 8-character one when the
     * target predates ids — the answer key is keyed by id, so an id-less target
     * would otherwise be ungradeable.
     */
    private static String idOf(Document target) {
        return target.get("_id") instanceof String id && !id.isBlank()
                ? id
                : UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    }

    private static void copyIfPresent(Document source, Document destination, String field) {
        Object value = source.get(field);
        if (value != null) {
            destination.put(field, value);
        }
    }

    private static boolean parseFlag(List<String> values) {
        return values == null || values.isEmpty() || Boolean.parseBoolean(values.get(0));
    }
}
