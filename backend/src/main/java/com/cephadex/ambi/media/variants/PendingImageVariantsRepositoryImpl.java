package com.cephadex.ambi.media.variants;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import com.cephadex.ambi.media.enums.ImageSizeOptions;

/**
 * {@link PendingImageVariantsRepositoryCustom} implementation. The {@code Impl}
 * suffix is what Spring Data wires into {@link PendingImageVariantsRepository}
 * automatically — which is also why it declares exactly one constructor.
 *
 * <p>{@code MongoTemplate} updates bypass Spring Data auditing, so
 * {@code created_at}/{@code updated_at} are stamped here — a stale
 * {@code updated_at} is precisely what the repair sweep selects on, so it cannot
 * be left unset.
 */
class PendingImageVariantsRepositoryImpl implements PendingImageVariantsRepositoryCustom {

    private final MongoTemplate mongoTemplate;

    PendingImageVariantsRepositoryImpl(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public void openPending(String keyRoot, Set<ImageSizeOptions> requested, String contentType) {
        Instant now = Instant.now();
        Update update = new Update()
                .setOnInsert("requested_tiers", names(requested))
                .setOnInsert("ready_tiers", List.of())
                .setOnInsert("content_type", contentType)
                .setOnInsert("terminal", false)
                .setOnInsert("attempts", 0)
                .setOnInsert("created_at", now)
                .set("updated_at", now);
        mongoTemplate.upsert(byKeyRoot(keyRoot), update, PendingImageVariants.class);
    }

    @Override
    public boolean recordReady(String keyRoot, Set<ImageSizeOptions> tiers, boolean terminal) {
        Update update = new Update()
                .inc("attempts", 1)
                .set("updated_at", Instant.now());
        if (tiers != null && !tiers.isEmpty()) {
            update.addToSet("ready_tiers").each(names(tiers).toArray());
        }
        if (terminal) {
            update.set("terminal", true);
        }
        PendingImageVariants updated = mongoTemplate.findAndModify(byKeyRoot(keyRoot), update,
                FindAndModifyOptions.options().returnNew(true), PendingImageVariants.class);
        return updated != null && updated.unreadyTiers().isEmpty();
    }

    @Override
    public void deleteByKeyRootPrefix(String prefix) {
        Query query = new Query(Criteria.where("_id").regex("^" + Pattern.quote(prefix)));
        mongoTemplate.remove(query, PendingImageVariants.class);
    }

    private static Query byKeyRoot(String keyRoot) {
        return new Query(Criteria.where("_id").is(keyRoot));
    }

    /**
     * Enum constants as their stored names. The driver has no codec for our
     * enums, and these updates skip the mapping converter a {@code save()} would
     * run, so the conversion has to be explicit.
     */
    private static List<String> names(Set<ImageSizeOptions> tiers) {
        List<String> names = new ArrayList<>();
        for (ImageSizeOptions tier : tiers) {
            names.add(tier.name());
        }
        return names;
    }
}
