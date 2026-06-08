package com.cephadex.ambi.presentation.deck;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

/**
 * {@link DeckRepositoryCustom} implementation. The {@code Impl} suffix is what
 * Spring Data wires into {@link DeckRepository} automatically.
 */
class DeckRepositoryImpl implements DeckRepositoryCustom {

    private final MongoTemplate mongoTemplate;

    DeckRepositoryImpl(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public void updateSlideSettings(String deckId, String slideId,
            Settings.SlideSettings settings, String editorUserId) {
        // Target one element of the embedded `slides` array by id (arrayFilter
        // `s`) and touch only its `settings` sub-document. We set the whole
        // sub-document rather than hand-written `settings.pointSettings` dot-paths
        // so the Mongo converter serializes the nested record with the same field
        // names a normal save would — no dependence on the camelCase/snake_case
        // convention. updateFirst() does NOT enforce optimistic locking, so the
        // deck's @Version is deliberately left unchanged.
        Query query = new Query(Criteria.where("_id").is(deckId));
        Update update = new Update()
                .set("slides.$[s].last_edited_by_user_id", editorUserId)
                .filterArray(Criteria.where("s.id").is(slideId));
        if (settings == null) {
            update.unset("slides.$[s].settings");
        } else {
            update.set("slides.$[s].settings", settings);
        }
        mongoTemplate.updateFirst(query, update, Deck.class);
    }
}
