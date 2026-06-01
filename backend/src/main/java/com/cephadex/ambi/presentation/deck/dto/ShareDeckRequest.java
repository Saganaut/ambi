package com.cephadex.ambi.presentation.deck.dto;

import com.cephadex.ambi.presentation.deck.enums.DeckAclRole;

import jakarta.validation.constraints.NotNull;

/**
 * The role to grant a user in an explicit share (MANAGE capability). The grantee
 * is identified by the path {@code userId}; the upsert is idempotent — re-issuing
 * with a different role replaces the existing grant.
 */
public record ShareDeckRequest(
        @NotNull DeckAclRole role) {
}
