package com.cephadex.ambi.presentation.deck;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import com.cephadex.ambi.presentation.deck.enums.DeckVisibility;
import com.cephadex.ambi.presentation.deck.enums.OwnershipType;
import com.cephadex.ambi.presentation.deck.enums.PublishStatus;

public interface DeckRepository extends MongoRepository<Deck, String> {

    /** Resolve a deck by its public share id ({@code publicId} is unique-indexed). */
    Optional<Deck> findByPublicId(String publicId);

    /** "My personal decks" — decks a user currently owns. */
    List<Deck> findByOwnershipTypeAndOwnershipOwnerId(OwnershipType type, String ownerId);

    /** All decks owned by an organization (uses the denormalized indexed mirror). */
    List<Deck> findByOrganizationId(String organizationId);

    /** Discoverable listing — only {@code PUBLIC} + {@code PUBLISHED} decks. */
    Page<Deck> findByVisibilityAndPublishStatus(
            DeckVisibility visibility, PublishStatus publishStatus, Pageable pageable);
}