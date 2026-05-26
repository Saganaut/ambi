package com.cephadex.ambi.presentation.deck;

import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.presentation.deck.enums.OwnershipType;

public record DeckOwnership(
        @Field("type") OwnershipType type,
        @Field("owner_id") String ownerId

) {
}
