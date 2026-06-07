package com.cephadex.ambi.common;

import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.common.enums.OwnershipType;

public record Ownership(
        @Field("type") OwnershipType type,
        @Field("owner_id") String ownerId

) {
}
