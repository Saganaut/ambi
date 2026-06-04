package com.cephadex.ambi.presentation.deck.dto;

import java.util.Set;

import com.cephadex.ambi.presentation.deck.Deck;
import com.cephadex.ambi.presentation.deck.Settings;
import com.cephadex.ambi.presentation.deck.enums.PublishStatus;

import jakarta.validation.constraints.Size;

/**
 * A full replacement of a deck's editable metadata (EDIT capability). The
 * client submits the complete desired metadata state; every field is applied,
 * so an omitted field clears the corresponding value.
 *
 * <p>Cover and background images are intentionally absent: they have a single
 * owner in the dedicated {@code /cover-image} and {@code /background-image}
 * endpoints, so a metadata edit never touches them. Slides, visibility,
 * ownership, ACL and identifiers are likewise absent — slides flow through the
 * {@code /slides} endpoints, and the rest through the MANAGE-gated endpoints.
 */
public record UpdateDeckRequest(
        @Size(max = 200) String name,
        @Size(max = 2000) String description,
        String themeId,
        @Size(max = 16) String language,
        Settings.DeckSettings settings,
        Set<String> tags,
        PublishStatus publishStatus) {

    /** Builds the {@code changes} {@link Deck} that {@code DeckService.update} copies from. */
    public Deck toDeck() {
        Deck changes = new Deck();
        changes.setName(name);
        changes.setDescription(description);
        changes.setThemeId(themeId);
        changes.setLanguage(language);
        changes.setSettings(settings);
        changes.setTags(tags);
        changes.setPublishStatus(publishStatus);
        return changes;
    }
}
