package com.cephadex.ambi.media.gallery;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.cephadex.ambi.presentation.deck.enums.OwnershipType;

public interface GalleryRepository extends MongoRepository<Gallery, String> {

    /** The single gallery owned by a user or org — backs get-or-create. */
    Optional<Gallery> findByOwnershipTypeAndOwnershipOwnerId(OwnershipType type, String ownerId);

    /** The gallery owned by an organization (uses the denormalized indexed mirror). */
    Optional<Gallery> findByOrganizationId(String organizationId);
}
