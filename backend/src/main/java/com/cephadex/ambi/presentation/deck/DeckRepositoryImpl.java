package com.cephadex.ambi.presentation.deck;

import com.cephadex.ambi.media.AppImage;
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

    @Override
    public void updateDeckInviteSettings(String deckId, Settings.InviteSettings inviteSettings) {
        updateDeckSettingsField(deckId, "inviteSettings", inviteSettings);
    }

    @Override
    public void promoteSettingsToDeck(String deckId, String field, Object value) {
        promoteFieldToDeck(deckId, "settings." + field, "slides.$[].settings." + field, value);
    }

    @Override
    public void promoteBackgroundImageToDeck(String deckId, AppImage image) {
        promoteFieldToDeck(deckId, "background_image", "slides.$[].background_image", image);
    }

    /**
     * Single {@code $set/$unset} update: write {@code value} to {@code deckPath} on
     * the deck document and remove {@code slidesPath} from every embedded slide. Uses
     * {@code $[]} to target all array elements without a filter. {@code updateFirst}
     * skips optimistic locking so the deck's {@code @Version} is left unchanged —
     * consistent with all other targeted writes in this class. Pass {@code null} as
     * {@code value} to unset the deck field too.
     */
    private void promoteFieldToDeck(String deckId, String deckPath, String slidesPath, Object value) {
        Query query = new Query(Criteria.where("_id").is(deckId));
        Update update = new Update();
        if (value == null) {
            update.unset(deckPath);
        } else {
            update.set(deckPath, value);
        }
        update.unset(slidesPath);
        mongoTemplate.updateFirst(query, update, Deck.class);
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

    @Override
    public void updateRatingStats(String deckId, Double average, long count) {
        // `stats` sub-fields are @Field-mapped on DeckStats, so the BSON paths are
        // the snake_case names. Set only the two rating fields — the rest of the
        // summary (play counts, etc.) is left untouched, and updateFirst skips
        // optimistic locking so the deck's @Version is unchanged.
        Query query = new Query(Criteria.where("_id").is(deckId));
        Update update = new Update()
                .set("stats.rating_average", average)
                .set("stats.rating_count", count);
        mongoTemplate.updateFirst(query, update, Deck.class);
    }
}
