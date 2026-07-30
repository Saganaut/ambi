package com.cephadex.ambi.presentation.slide;

import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.deck.Settings;
import com.cephadex.ambi.presentation.slide.content.SlideContent;
import com.cephadex.ambi.presentation.slide.enums.Difficulty;

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
    private String title;

    @Field("section")
    private String section;

    // Per-slide background override. Resolves in three states against the deck's
    // default (see Deck#backgroundImage): a non-null image wins outright; null +
    // hideBackground=false inherits the deck background; null + hideBackground=true
    // suppresses it entirely (no background, even when the deck has one). Cleared
    // to null on every slide when a background is promoted to the deck, since the
    // deck then carries the value — see DeckService#promoteBackgroundImageToDeck.
    @Field("background_image")
    private AppImage backgroundImage;

    // The third background state: when this slide has no backgroundImage of its
    // own, true means "render no background and ignore the deck default" while
    // false (the default) means "inherit the deck default". Without this flag a
    // null backgroundImage could only mean "inherit", leaving no way to opt a
    // single slide out of a deck-wide background. Meaningless (and normalized to
    // false) whenever backgroundImage is set — an explicit image always wins.
    @Field("hide_background")
    private boolean hideBackground;

    // Per-slide background-color override (hex "#RRGGBB"), the color counterpart
    // to backgroundImage. Composes BEHIND any background image: it paints this
    // slide's base layer while an image (own or inherited) draws on top, so the
    // two are independent and can both apply at once. Resolves against the deck
    // default (see Deck#backgroundColor): a non-null color wins its layer
    // outright; null inherits the deck color — unless the shared hideBackground
    // flag is set, which suppresses the inherited image AND color alike (an own
    // color still wins regardless, exactly like an own image). Cleared to null on
    // every slide when a color is promoted to the deck — see
    // DeckService#promoteBackgroundColorToDeck.
    @Field("background_color")
    private String backgroundColor;

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
    // round-trips through Mongo. Every SlideType has a registered subtype — the
    // one place to add another is SlideContent's @JsonSubTypes/@Schema pair.
    @Field("content")
    private SlideContent content;

    // Author-set question metadata, moved off the typed content so every scorable
    // kind shares one home (content is now just the options + correct-answer key).
    // difficulty is the analytics "configured difficulty"; explanation is the
    // post-answer rationale. Null on non-scorable slides (TITLE / MEDIA / Q&A).
    @Field("difficulty")
    private Difficulty difficulty;

    @Field("explanation")
    private String explanation;

    @Field("speaker_notes")
    private String speakerNotes;

    @Field("participant_instructions")
    private String participantInstructions;


    // Per-slide overrides for scoring (point_settings) and answering (answer_settings).
    // Either half may be null, in which case the deck's defaults apply at session time
    // (see Settings.SlideSettings#resolvePoints). The two halves are edited independently
    // through the dedicated .../point-settings and .../answer-settings endpoints, never
    // through updateSlide — exactly like cover/background images.
    @Field("settings")
    private Settings.SlideSettings settings;

}
