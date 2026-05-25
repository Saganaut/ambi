package com.cephadex.ambi.model.deck;

import com.cephadex.ambi.model.enums.OwnershipType;

import lombok.Data;

@Data
public class DeckOwnership {
    private OwnershipType type;
    private String ownerId;
}
