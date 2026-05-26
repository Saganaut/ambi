package com.cephadex.ambi.model.deck;

import com.cephadex.ambi.model.enums.deck.OwnershipType;

import lombok.Data;

@Data
public class DeckOwnership {
    private OwnershipType type;
    private String ownerId;
}
