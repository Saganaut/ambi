package com.cephadex.ambi.presentation.deck.dto;

import java.time.Instant;
import java.util.List;
import java.util.Set;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.deck.Deck;
import com.cephadex.ambi.presentation.deck.DeckAccessGrant;
import com.cephadex.ambi.presentation.deck.DeckOwnership;
import com.cephadex.ambi.presentation.deck.DeckStats;
import com.cephadex.ambi.presentation.deck.Settings;
import com.cephadex.ambi.presentation.deck.enums.DeckVisibility;
import com.cephadex.ambi.presentation.deck.enums.PublishStatus;

/**
 * The metadata view of a {@link Deck}. Slides are deliberately excluded — the
 * deck is their persistence boundary but they are read and edited through the
 * dedicated {@code /api/decks/{id}/slides} endpoints, so a deck read stays
 * cheap and a deck list never drags every slide along with it.
 */
public record DeckResponse(
        String id,
        String publicId,
        String name,
        String description,
        AppImage coverImage,
        AppImage backgroundImage,
        String themeId,
        Long version,
        PublishStatus publishStatus,
        DeckVisibility visibility,
        Instant publishedAt,
        String language,
        String creatorUserId,
        String originalAuthorUserId,
        Settings.DeckSettings settings,
        Set<String> tags,
        String organizationId,
        DeckOwnership ownership,
        List<DeckAccessGrant> acl,
        String parentDeckId,
        DeckStats stats,
        Instant createdAt,
        Instant updatedAt) {

    /** Projects a persisted {@link Deck} onto its metadata response (slides omitted). */
    public static DeckResponse from(Deck deck) {
        return new DeckResponse(
                deck.getId(),
                deck.getPublicId(),
                deck.getName(),
                deck.getDescription(),
                deck.getCoverImage(),
                deck.getBackgroundImage(),
                deck.getThemeId(),
                deck.getVersion(),
                deck.getPublishStatus(),
                deck.getVisibility(),
                deck.getPublishedAt(),
                deck.getLanguage(),
                deck.getCreatorUserId(),
                deck.getOriginalAuthorUserId(),
                deck.getSettings(),
                deck.getTags(),
                deck.getOrganizationId(),
                deck.getOwnership(),
                deck.getAcl(),
                deck.getParentDeckId(),
                deck.getStats(),
                deck.getCreatedAt(),
                deck.getUpdatedAt());
    }
}
