package com.cephadex.ambi.presentation.deck.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.List;
import java.util.Set;

import com.cephadex.ambi.common.Ownership;
import com.cephadex.ambi.common.ViewerPermissions;
import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.deck.Deck;
import com.cephadex.ambi.presentation.deck.DeckAccessGrant;
import com.cephadex.ambi.presentation.deck.DeckStats;
import com.cephadex.ambi.presentation.deck.Settings;
import com.cephadex.ambi.presentation.deck.enums.DeckVisibility;
import com.cephadex.ambi.presentation.deck.enums.PublishStatus;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The metadata view of a {@link Deck}. Slides are deliberately excluded — the
 * deck is their persistence boundary but they are read and edited through the
 * dedicated {@code /api/decks/{id}/slides} endpoints, so a deck read stays
 * cheap and a deck list never drags every slide along with it.
 */
public record DeckResponse(
        @Schema(requiredMode = REQUIRED) String id,
        @Schema(requiredMode = REQUIRED) String publicId,
        @Schema(requiredMode = REQUIRED) String name,
        String description,
        AppImage coverImage,
        AppImage backgroundImage,
        String themeId,
        @Schema(requiredMode = REQUIRED) Long version,
        @Schema(requiredMode = REQUIRED) PublishStatus publishStatus,
        @Schema(requiredMode = REQUIRED) DeckVisibility visibility,
        Instant publishedAt,
        @Schema(requiredMode = REQUIRED) String language,
        @Schema(requiredMode = REQUIRED) String creatorUserId,
        @Schema(requiredMode = REQUIRED) String originalAuthorUserId,
        Settings.DeckSettings settings,
        @Schema(requiredMode = REQUIRED) Set<String> tags,
        String organizationId,
        @Schema(requiredMode = REQUIRED) Ownership ownership,
        @Schema(requiredMode = REQUIRED) List<DeckAccessGrant> acl,
        String parentDeckId,
        DeckStats stats,
        @Schema(requiredMode = REQUIRED) Instant createdAt,
        @Schema(requiredMode = REQUIRED) Instant updatedAt,
        @Schema(requiredMode = REQUIRED) ViewerPermissions permissions) {

    /**
     * Projects a persisted {@link Deck} onto its metadata response (slides omitted),
     * stamping the requesting principal's {@code permissions} as computed by
     * {@code DeckService}.
     */
    public static DeckResponse from(Deck deck, ViewerPermissions permissions) {
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
                deck.getUpdatedAt(),
                permissions);
    }
}
