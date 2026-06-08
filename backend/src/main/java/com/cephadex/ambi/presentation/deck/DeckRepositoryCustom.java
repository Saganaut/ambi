package com.cephadex.ambi.presentation.deck;

/**
 * Hand-written repository operations that Spring Data can't derive. Mixed into
 * {@link DeckRepository} so callers still see one repository.
 *
 * <p>Currently a single targeted write: updating one embedded slide's settings
 * sub-document <em>without</em> re-versioning the whole deck. Slides are embedded
 * in the deck aggregate, so a normal {@code save(deck)} rewrites the entire
 * document and bumps the deck's {@code @Version} — fine for deck-structural
 * edits, but a per-slide settings tweak shouldn't contend with deck-level writes
 * on that single version counter. A positional update touches just the nested
 * field instead. See {@link DeckRepositoryImpl}.
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
}
