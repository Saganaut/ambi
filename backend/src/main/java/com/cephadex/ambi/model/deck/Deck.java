package com.cephadex.ambi.model.deck;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import com.cephadex.ambi.model.enums.PublishStatus;
import com.cephadex.ambi.model.image.AppImage;
import com.cephadex.ambi.model.shared.Auditable;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@Document(collection = "decks")
// Adding this due to extending AUditable, see if we can remove later
@EqualsAndHashCode(callSuper = false)
public class Deck extends Auditable {

    @Id
    // This is a UUID which allows us to optimastically create decks on the frontend
    private String id;

    // Used for sharing, presnetations..
    private String publicId;

    private String name = "Untitled Deck";

    private String description;

    private AppImage coverImage;

    private AppImage backgroundImage;

    // TODO consider where this should be a theme class instead
    private String themeId;

    private int version = 1;

    private PublishStatus publishStatus = PublishStatus.DRAFT;

    private Instant publishedAt;

    private String language = "en";

    private String creatorUserId; // null for system seeds

    private String originalAuthorUserId; // Never changes after first write

    private DeckSettings settings = new DeckSettings();

    private Set<String> tags = new LinkedHashSet<>();

    private String organizationId;

    private DeckOwnership ownership;

    private Set<String> acl = new LinkedHashSet<>();

    private String parentDeckId;

    private DeckStats stats;

}
