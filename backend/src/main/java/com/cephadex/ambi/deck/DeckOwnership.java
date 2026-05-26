package com.cephadex.ambi.deck;

import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.deck.enums.OwnershipType;

import lombok.Data;

@Data
public class DeckOwnership {

    @Field("type")
    private OwnershipType type;

    @Field("owner_id")
    private String ownerId;
}
