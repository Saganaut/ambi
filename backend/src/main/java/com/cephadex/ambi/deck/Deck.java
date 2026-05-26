package com.cephadex.ambi.deck;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.common.Auditable;
import com.cephadex.ambi.deck.enums.PublishStatus;
import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.slide.Slide;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
@Document(collection = "decks")
// Adding this due to extending AUditable, see if we can remove later
public class Deck extends Auditable {

    @Id
    // This is a UUID which allows us to optimastically create decks on the frontend
    private String id;

    // Used for sharing, presnetations..
    @Indexed(unique = true)
    @Field("public_id")
    private String publicId;

    @Field("name")
    private String name = "Untitled Deck";

    @Field("description")
    private String description;

    @Field("cover_image")
    private AppImage coverImage;

    @Field("background_image")
    private AppImage backgroundImage;

    @Field("theme_id")
    private String themeId;

    @Version
    @Field("version")
    private Long version;

    @Field("publish_status")
    private PublishStatus publishStatus = PublishStatus.DRAFT;

    @Field("published_at")
    private Instant publishedAt;

    @Field("language")
    private String language = "en";

    @Indexed
    @Field("creator_user_id")
    private String creatorUserId;

    @Field("original_author_user_id")
    private String originalAuthorUserId;

    @Field("settings")
    private DeckSettings settings = new DeckSettings();

    @Indexed
    @Field("tags")
    private Set<String> tags = new LinkedHashSet<>();

    @Indexed
    @Field("organization_id")
    private String organizationId;

    @Field("ownership")
    private DeckOwnership ownership;

    @Field("acl")
    private Set<String> acl = new LinkedHashSet<>();

    @Indexed
    @Field("parent_deck_id")
    private String parentDeckId;

    @Field("stats")
    private DeckStats stats;

    @Field("slides")
    private List<Slide> slide = new ArrayList<>();

}
