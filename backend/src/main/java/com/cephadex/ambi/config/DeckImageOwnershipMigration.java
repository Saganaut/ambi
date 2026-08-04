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
import org.springframework.stereotype.Component;

import com.cephadex.ambi.media.storage.ImageKeys;
import com.cephadex.ambi.media.storage.S3StorageService;

import com.mongodb.client.MongoCollection;

/**
 * One-shot migration giving every deck its own copies of the images placed in
 * it. Historically a deck embedded the selected gallery image's {@code AppImage}
 * verbatim, so deck and gallery shared the same S3 objects and a gallery delete
 * blanked the deck. Deck writes now adopt copies under {@code deck/{deckId}/}
 * at selection time ({@code DeckImageLifecycleService}); this migration performs
 * the same adoption for existing decks.
 *
 * <p><strong>Scope.</strong> The {@code decks} collection only — deliberately
 * not the deck snapshots inside {@code LiveSessions}, which are short-lived
 * historical records.
 *
 * <p><strong>Activation.</strong> Wired only when
 * {@code migrate.deckImages.run=true} (passed by
 * {@code scripts/migrate-deck-images.sh}); after migrating, the application
 * exits. Pass {@code --migrate.deckImages.dryRun=true} to log the affected
 * counts and write nothing (no S3 copies either).
 *
 * <p><strong>Mechanism.</strong> Raw {@link Document} walk: every sub-document
 * shaped like a stored {@code AppImage} ({@code src_key} present,
 * {@code external} != true) whose key is outside the deck's namespace gets a
 * fresh {@code deck/{deckId}/{uuid}} prefix, its original and recorded variants
 * copied to canonical keys under it, and its key fields rewritten. Each changed
 * deck is written back with a {@code replaceOne} filtered on {@code _id} AND
 * {@code version}; a concurrent edit fails the filter and the deck is re-read
 * and re-migrated.
 *
 * <p><strong>Idempotency.</strong> Adopted images live under the deck's own
 * prefix and are skipped on a re-run. A placement whose source object no longer
 * exists is logged and left unchanged — it renders exactly as broken as today,
 * and re-runs converge. Missing variant objects are tolerated: whatever exists
 * is copied, the recorded keys are rewritten regardless.
 */
@Component
@ConditionalOnProperty(name = "migrate.deckImages.run", havingValue = "true")
public class DeckImageOwnershipMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DeckImageOwnershipMigration.class);

    private static final String DRY_RUN_OPTION = "migrate.deckImages.dryRun";
    private static final int MAX_ATTEMPTS_PER_DECK = 3;

    /** Copies one stored object; returns {@code false} when the source is absent. */
    interface ObjectCopier {
        boolean copy(String sourceKey, String destinationKey);
    }

    private final MongoTemplate mongoTemplate;
    private final S3StorageService storage;
    private final ConfigurableApplicationContext context;

    public DeckImageOwnershipMigration(MongoTemplate mongoTemplate, S3StorageService storage,
            ConfigurableApplicationContext context) {
        this.mongoTemplate = mongoTemplate;
        this.storage = storage;
        this.context = context;
    }

    @Override
    public void run(ApplicationArguments args) {
        boolean dryRun = args.containsOption(DRY_RUN_OPTION)
                && parseFlag(args.getOptionValues(DRY_RUN_OPTION));

        log.info("DeckImageOwnershipMigration starting (dryRun={})", dryRun);
        int images = migrateDecks(dryRun);
        log.info("DeckImageOwnershipMigration finished — {} image placement(s) {} — exiting.",
                images, dryRun ? "would be adopted" : "adopted");

        int code = SpringApplication.exit(context, () -> 0);
        System.exit(code);
    }

    private int migrateDecks(boolean dryRun) {
        MongoCollection<Document> decks = mongoTemplate.getCollection("decks");
        List<Object> ids = decks.distinct("_id", Object.class).into(new ArrayList<>());

        // Dry run pretends every source exists and copies nothing.
        ObjectCopier copier = dryRun ? (source, destination) -> true : this::copyIfExists;

        int adoptedImages = 0;
        int adoptedDecks = 0;
        for (Object id : ids) {
            for (int attempt = 1; attempt <= MAX_ATTEMPTS_PER_DECK; attempt++) {
                Document deck = decks.find(new Document("_id", id)).first();
                if (deck == null) {
                    break;
                }
                int adopted = adoptImages(deck, copier);
                if (adopted == 0) {
                    break;
                }
                if (dryRun) {
                    adoptedImages += adopted;
                    adoptedDecks++;
                    break;
                }
                Document filter = new Document("_id", id).append("version", deck.get("version"));
                if (decks.replaceOne(filter, deck).getModifiedCount() == 1) {
                    adoptedImages += adopted;
                    adoptedDecks++;
                    break;
                }
                log.warn("Deck {}: version changed under the migration (attempt {}/{}) — retrying",
                        id, attempt, MAX_ATTEMPTS_PER_DECK);
            }
        }
        log.info("decks: {} document(s) scanned, {} {}, {} image placement(s) affected",
                ids.size(), adoptedDecks, dryRun ? "would be rewritten" : "rewritten", adoptedImages);
        return adoptedImages;
    }

    private boolean copyIfExists(String sourceKey, String destinationKey) {
        return storage.copyIfExists(sourceKey, destinationKey);
    }

    // ── Transform ──────────────────────────────────────────────────────────────

    /**
     * Adopts every stored image embedded anywhere in a raw deck document whose
     * key lies outside the deck's own namespace, rewriting the document in
     * place. Returns how many images were adopted.
     */
    static int adoptImages(Document deck, ObjectCopier copier) {
        String deckId = String.valueOf(deck.get("_id"));
        return walk(deck, deckId, "deck", copier);
    }

    /**
     * Recursively finds image-shaped sub-documents; {@code location} is the
     * nearest enclosing slide's id (or {@code "deck"}) purely for logging.
     */
    private static int walk(Object node, String deckId, String location, ObjectCopier copier) {
        if (node instanceof Document document) {
            if (isStoredImage(document)) {
                return adoptImage(document, deckId, location, copier) ? 1 : 0;
            }
            int adopted = 0;
            for (Object value : document.values()) {
                adopted += walk(value, deckId, location, copier);
            }
            return adopted;
        }
        if (node instanceof List<?> entries) {
            int adopted = 0;
            for (Object entry : entries) {
                String where = entry instanceof Document slide
                        && slide.get("id") instanceof String slideId
                                ? "slide " + slideId
                                : location;
                adopted += walk(entry, deckId, where, copier);
            }
            return adopted;
        }
        return 0;
    }

    /** An AppImage sub-document backed by stored objects (not an external URL). */
    static boolean isStoredImage(Document document) {
        return document.get("src_key") instanceof String key && !key.isBlank()
                && !Boolean.TRUE.equals(document.get("external"));
    }

    private static boolean adoptImage(Document image, String deckId, String location,
            ObjectCopier copier) {
        String srcKey = image.getString("src_key");
        if (ImageKeys.isOwnedByDeck(srcKey, deckId)) {
            return false;
        }
        String prefix = ImageKeys.newDeckImagePrefix(deckId);
        String adoptedSrcKey = ImageKeys.originalKey(prefix);
        if (!copier.copy(srcKey, adoptedSrcKey)) {
            log.warn("Deck {} ({}): source object {} is missing — leaving the placement unchanged",
                    deckId, location, srcKey);
            return false;
        }
        if (image.get("variants") instanceof Document variants) {
            for (String tier : variants.keySet()) {
                if (variants.get(tier) instanceof String variantKey && !variantKey.isBlank()) {
                    String adoptedKey = prefix + "/" + tier.toLowerCase() + ".webp";
                    copier.copy(variantKey, adoptedKey);
                    variants.put(tier, adoptedKey);
                }
            }
        }
        image.put("src_key", adoptedSrcKey);
        return true;
    }

    private static boolean parseFlag(List<String> values) {
        return values == null || values.isEmpty() || Boolean.parseBoolean(values.get(0));
    }
}
