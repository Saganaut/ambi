package com.cephadex.ambi.presentation.deck.dto;

import com.cephadex.ambi.common.validation.ValidationConstants;
import com.cephadex.ambi.presentation.deck.Deck;
import com.cephadex.ambi.presentation.deck.enums.PublishStatus;

import jakarta.validation.constraints.Size;

/**
 * A full replacement of a deck's editable metadata (EDIT capability). The
 * client submits the complete desired metadata state; every field is applied,
 * so an omitted field clears the corresponding value.
 *
 * <p>Cover and background images are intentionally absent: they have a single
 * owner in the dedicated {@code /cover-image} and {@code /background-image}
 * endpoints, so a metadata edit never touches them. Tags are likewise absent —
 * they have a single owner in the dedicated {@code /tags} endpoint. Settings
 * (point/answer/audience) are absent too: each embedded sub-document has a single
 * owner in its dedicated {@code /point-settings} / {@code /answer-settings} /
 * {@code /audience-settings} endpoint, which persists via a targeted update that
 * never re-versions the deck. Slides, visibility, ownership, ACL and identifiers
 * are also absent — slides flow through the {@code /slides} endpoints, and the
 * rest through the MANAGE-gated endpoints.
 */
public record UpdateDeckRequest(
        @Size(max = ValidationConstants.NAME_MAX) String name,
        @Size(max = ValidationConstants.NAME_MAX) String label,
        @Size(max = ValidationConstants.DECK_DESCRIPTION_MAX) String description,
        String themeId,
        @Size(max = ValidationConstants.LANGUAGE_MAX) String language,
        PublishStatus publishStatus) {

    /** Builds the {@code changes} {@link Deck} that {@code DeckService.update} copies from. */
    public Deck toDeck() {
        Deck changes = new Deck();
        changes.setName(name);
        changes.setLabel(label);
        changes.setDescription(description);
        changes.setThemeId(themeId);
        changes.setLanguage(language);
        changes.setPublishStatus(publishStatus);
        return changes;
    }
}
