package com.cephadex.ambi.presentation.slide;

import java.util.Map;

import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.slide.content.SlideContent;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

import lombok.Getter;
import lombok.Setter;

/**
 * A single screen within a deck. Slides are <strong>embedded</strong> in their
 * {@link com.cephadex.ambi.presentation.deck.Deck} (the deck is the aggregate
 * root and the persistence boundary) — this is a plain nested document, not a
 * top-level {@code @Document}. It has no permissions of its own; all access
 * flows through the owning deck. See the package README.
 * 
 * 
 */
@Setter
@Getter
public class Slide {

    // The slide's identity. A UUID the client mints optimistically; it targets
    // a specific slide in the deck's array AND is the stable handle the session
    // layer keys on (snapshots copy slides verbatim, so a round/answer references
    // a slide by this id — see RoundResult / Answer). Never reassigned on update.
    @Field("id")
    private String id;

    @Field("title")
    // This is question for ScorableContent
    private String title;

    @Field("styled_title")
    private Map<String, Object> styledTitle;

    @Field("section")
    private String section;

    @Field("slide_type")
    private SlideType slideType;

    @Field("background_image")
    private AppImage backgroundImage;

    @Field("cover_image")
    private AppImage coverImage;

    @Field("created_by_user_id")
    private String createdByUserId;

    @Field("last_edited_by_user_id")
    private String lastEditedByUserId;

    /**
     * If there is a parentId then we don't need a sort order
     * If we remove the parent, find the parents sort order, put it after that
     * These are used as some slides are Linked, the following slide depends on what
     * happens with the current slide.
     * If a slide has a child we should never go straight to results.
     * They should also always be sequential
     **/
    @Field("parent_id")
    private String parentId;

    @Field("child_id")
    private String childId;

    @Field("version")
    private Integer version;

    // The ordering key (Lexorank). Server-owned: assigned on add and rewritten on
    // move, never by the client. Slides sort by this string under natural ordering;
    // see SlideRankService and Deck.reorderSlide. Null only for legacy slides not
    // yet backfilled, which sort last.
    @Field("sort_order")
    private String sortOrder;

    // The typed, polymorphic body keyed by the slide's contentType. Spring Data
    // writes a `_class` hint for the concrete subtype (e.g. McqContent) so it
    // round-trips through Mongo; only MCQ is wired in so far.
    @Field("content")
    private SlideContent content;

}
