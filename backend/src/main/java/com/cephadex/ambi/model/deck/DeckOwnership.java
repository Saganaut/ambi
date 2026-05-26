package com.cephadex.ambi.model.deck;

import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.model.enums.deck.OwnershipType;

import lombok.Data;

@Data
public class DeckOwnership {

    @Field("type")
    private OwnershipType type;

    @Field("owner_id")
    private String ownerId;
}
