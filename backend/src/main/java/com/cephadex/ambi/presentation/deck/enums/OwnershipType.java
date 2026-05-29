package com.cephadex.ambi.presentation.deck.enums;

/**
 * Who controls a deck. "Public" is a {@code DeckVisibility}, not an ownership —
 * a deck is always owned by a person or an organization. See the deck
 * permissions README.
 */
public enum OwnershipType {
    USER, ORGANIZATION
}