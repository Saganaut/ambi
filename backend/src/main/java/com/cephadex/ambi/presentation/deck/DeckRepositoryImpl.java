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

    @Override
    public void updateDeckPointSettings(String deckId, Settings.PointSettings pointSettings) {
        updateDeckSettingsField(deckId, "pointSettings", pointSettings);
    }

    @Override
    public void updateDeckAnswerSettings(String deckId, Settings.AnswerSettings answerSettings) {
        updateDeckSettingsField(deckId, "answerSettings", answerSettings);
    }

    @Override
    public void updateDeckAudienceSettings(String deckId, Settings.AudienceSettings audienceSettings) {
        updateDeckSettingsField(deckId, "audienceSettings", audienceSettings);
    }

    /**
     * Sub-path {@code $set} of one of the deck's own settings sub-documents
     * ({@code settings.<field>}). As with {@link #updateSlideSettings}, the whole
     * sub-document is set so the Mongo converter serializes the nested record, and
     * {@code updateFirst} skips optimistic locking so the deck's {@code @Version}
     * is left unchanged. The {@code settings.<field>} sub-fields are records with
     * no {@code @Field}, so the path is camelCase.
     */
    private void updateDeckSettingsField(String deckId, String field, Object value) {
        Query query = new Query(Criteria.where("_id").is(deckId));
        Update update = new Update().set("settings." + field, value);
        mongoTemplate.updateFirst(query, update, Deck.class);
    }
}
