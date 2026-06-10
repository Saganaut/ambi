package com.cephadex.ambi.presentation.deck;

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
}
