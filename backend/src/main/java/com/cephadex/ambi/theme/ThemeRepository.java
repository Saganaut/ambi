package com.cephadex.ambi.theme;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.cephadex.ambi.common.enums.OwnershipType;

public interface ThemeRepository extends MongoRepository<Theme, String> {

    /** "My personal themes" — themes a user currently owns. */
    List<Theme> findByOwnershipTypeAndOwnershipOwnerId(OwnershipType type, String ownerId);

    /** All themes owned by an organization (uses the denormalized indexed mirror). */
    List<Theme> findByOrganizationId(String organizationId);

    /** App-provided preset themes, available to everyone. */
    List<Theme> findByBuiltInTrue();
}
