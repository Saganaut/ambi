package com.cephadex.ambi.presentation.slide;

import java.util.Map;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.common.Auditable;
import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
@Document(collection = "slides")
public class Slide extends Auditable {

    @Id
    @Indexed(unique = true) // UUID that can be generated optimistcally on the frontend
    private String Id;

    @Indexed(unique = true)
    @Field("public_id")
    private String publicId;

    @Field("deck_id")
    private String deckId;

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

    @Indexed
    @Field("sort_order")
    // Use Lexorank technique;
    // TODO: add Lexorank implementation
    private String sortOrder;

}
