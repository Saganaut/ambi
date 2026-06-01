package com.cephadex.ambi.presentation.deck.dto;

import java.util.List;
import java.util.Set;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.deck.Deck;
import com.cephadex.ambi.presentation.deck.Settings;
import com.cephadex.ambi.presentation.deck.enums.PublishStatus;
import com.cephadex.ambi.presentation.slide.Slide;

import jakarta.validation.constraints.Size;

/**
 * A full replacement of a deck's editable metadata (EDIT capability). The
 * client submits the complete desired metadata state; every field is applied,
 * so an omitted field clears the corresponding value.
 *
 * <p>Slides, visibility, ownership, ACL and identifiers are intentionally absent:
 * slides flow through the {@code /slides} endpoints, and the rest flow through
 * the MANAGE-gated endpoints. {@link #toDeckChanges(List)} carries the deck's
 * current slides back through so {@code DeckService.update} (which replaces the
 * slide list from its argument) leaves them untouched.
 */
public record UpdateDeckRequest(
        @Size(max = 200) String name,
        @Size(max = 2000) String description,
        AppImage coverImage,
        AppImage backgroundImage,
        String themeId,
        @Size(max = 16) String language,
        Settings.DeckSettings settings,
        Set<String> tags,
        PublishStatus publishStatus) {

    /**
     * Builds the {@code changes} {@link Deck} that {@code DeckService.update}
     * copies from. {@code existingSlides} is the deck's current slide list,
     * passed straight through so the service's unconditional slide replacement
     * is a no-op — slides are only ever mutated via the slide endpoints.
     */
    public Deck toDeckChanges(List<Slide> existingSlides) {
        Deck changes = new Deck();
        changes.setName(name);
        changes.setDescription(description);
        changes.setCoverImage(coverImage);
        changes.setBackgroundImage(backgroundImage);
        changes.setThemeId(themeId);
        changes.setLanguage(language);
        changes.setSettings(settings);
        changes.setTags(tags);
        changes.setPublishStatus(publishStatus);
        changes.setSlides(existingSlides);
        return changes;
    }
}
