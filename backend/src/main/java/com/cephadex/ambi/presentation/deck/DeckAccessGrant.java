package com.cephadex.ambi.presentation.deck;

import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.presentation.deck.enums.DeckAclRole;

/**
 * An explicit, named share of a deck to a single user. Carries a per-user
 * capability so a deck can be shared view-only or for editing independently of
 * its {@code visibility}. See the deck permissions README.
 */
public record DeckAccessGrant(
        @Field("user_id") String userId,
        @Field("role") DeckAclRole role) {
}