package com.cephadex.ambi.presentation.deck;

import com.cephadex.ambi.media.AppImage;

/**
 * Hand-written repository operations that Spring Data can't derive. Mixed into
 * {@link DeckRepository} so callers still see one repository.
 *
 * <p>These are the targeted settings writes: they touch a single embedded
 * settings sub-document <em>without</em> re-versioning the whole deck. Settings
 * (slide- or deck-level) live inside the deck aggregate, so a normal
 * {@code save(deck)} rewrites the entire document and bumps the deck's
 * {@code @Version} — fine for deck-structural edits, but a settings tweak
 * shouldn't contend with unrelated writes on that single version counter. A
 * positional / sub-path {@code $set} touches just the nested field instead.
 * See {@link DeckRepositoryImpl}.
 */
public interface DeckRepositoryCustom {

    /**
     * Set (or, when {@code settings} is {@code null}, unset) a single embedded
     * slide's settings sub-document via a positional update, leaving the deck's
     * {@code @Version} untouched. The deck and slide are assumed to already exist
     * and be authorized — the caller loads them first (for the permission check
     * and to build the response), so this is the persistence step only.
     *
     * @param deckId        owning deck id
     * @param slideId       embedded slide id (matched on {@code slides.id})
     * @param settings      the full {@code SlideSettings} to store, or {@code null} to clear it
     * @param editorUserId  stamped onto the slide's {@code last_edited_by_user_id}
     */
    void updateSlideSettings(String deckId, String slideId,
            Settings.SlideSettings settings, String editorUserId);

    /**
     * Replace the deck's point (scoring) settings sub-document
     * ({@code settings.pointSettings}) via a sub-path {@code $set}, leaving the
     * deck's {@code @Version} untouched. The deck is assumed to already exist and
     * be authorized — the caller loads it first.
     */
    void updateDeckPointSettings(String deckId, Settings.PointSettings pointSettings);

    /** As {@link #updateDeckPointSettings}, for the deck's answer settings. */
    void updateDeckAnswerSettings(String deckId, Settings.AnswerSettings answerSettings);

    /** As {@link #updateDeckPointSettings}, for the deck's audience settings. */
    void updateDeckAudienceSettings(String deckId, Settings.AudienceSettings audienceSettings);

    /** As {@link #updateDeckPointSettings}, for the deck's invite-display settings. */
    void updateDeckInviteSettings(String deckId, Settings.InviteSettings inviteSettings);

    /**
     * Atomically promote {@code value} to the deck's {@code settings.{field}} default
     * <em>and</em> clear that same field from every embedded slide's {@code settings}
     * sub-document — all in a single {@code $set/$unset} update without bumping the
     * deck's {@code @Version}.
     *
     * <p>This is the "apply to deck" persistence step: a slide's override is promoted
     * to the deck default and all per-slide overrides for that field are dropped so
     * every slide inherits the new default. The two-field {@link Settings.SlideSettings}
     * wrapper on a slide may remain non-null after the {@code $unset} if the other
     * half still carries an override — that is fine, since resolution checks the
     * individual sub-field, not the wrapper.
     *
     * @param deckId  owning deck id
     * @param field   camelCase sub-field name within {@code settings} (e.g. {@code "pointSettings"})
     * @param value   the new deck default
     */
    void promoteSettingsToDeck(String deckId, String field, Object value);

    /**
     * Atomically promote {@code image} to the deck's {@code background_image} field
     * <em>and</em> clear {@code background_image} from every embedded slide — all in
     * a single {@code $set/$unset} update without bumping the deck's {@code @Version}.
     *
     * @param deckId  owning deck id
     * @param image   the new deck background image to set
     */
    void promoteBackgroundImageToDeck(String deckId, AppImage image);

    /**
     * Atomically promote {@code color} to the deck's {@code background_color} field
     * <em>and</em> clear {@code background_color} from every embedded slide — all in
     * a single {@code $set/$unset} update without bumping the deck's {@code @Version}.
     * The shared {@code hide_background} flag is left untouched (a color composes
     * behind the image and never drives the suppress flag); pass {@code null} to
     * unset the deck color too.
     *
     * @param deckId owning deck id
     * @param color  the new deck background color to set, or {@code null} to unset
     */
    void promoteBackgroundColorToDeck(String deckId, String color);

    /**
     * Set the deck's denormalized rating headline ({@code stats.rating_average} and
     * {@code stats.rating_count}) via a sub-path {@code $set}, leaving the rest of
     * {@code stats} and the deck's {@code @Version} untouched. Called after a review
     * write so deck cards and list views stay current without recomputing the whole
     * {@code DeckStats} summary.
     *
     * @param deckId  the deck whose rating headline to update
     * @param average mean stars (1..5), or {@code null} when the deck has no reviews
     * @param count   number of reviews
     */
    void updateRatingStats(String deckId, Double average, long count);
}
