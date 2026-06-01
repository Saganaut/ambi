package com.cephadex.ambi.theme;

import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.presentation.deck.enums.OwnershipType;

/**
 * Who controls a theme — mirrors {@code DeckOwnership}. A theme is owned either
 * by a single user (a personal theme) or by an organization (a shared theme
 * usable by its members). {@code ownerId} is the user id or organization id
 * accordingly.
 *
 * @param type    USER for a personal theme, ORGANIZATION for an org-shared one
 * @param ownerId the owning user id or organization id
 */
public record ThemeOwnership(
        @Field("type") OwnershipType type,
        @Field("owner_id") String ownerId) {
}
