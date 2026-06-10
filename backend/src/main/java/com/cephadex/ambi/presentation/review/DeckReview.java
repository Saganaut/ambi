package com.cephadex.ambi.presentation.review;

import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.common.Auditable;
import com.cephadex.ambi.presentation.commentThread.Author;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

/**
 * A single user's review of a deck — a {@code stars} score (1..5) and an optional
 * written {@code body} — keyed to a {@code (deckId, userId)} pair. The unique
 * compound index makes the relationship one-per-user-per-deck: re-rating overwrites
 * the existing row (an upsert), rather than stacking a second review.
 *
 * <p>The {@code id} is inherited from {@link Auditable} → {@code BaseDocument} (the
 * Mongo {@code _id}); audit timestamps come from {@code Auditable}. {@code userId} is
 * the author's <em>public</em> id (matching the {@link Author} snapshot convention),
 * so the same id identifies the row's owner and the author. The {@link Author} record
 * is reused from the comment-thread feature — a snapshot of the reviewer at write
 * time, overlaid with the user's current profile on read.
 */
@Getter
@Setter
@ToString
@Document(collection = "deck_reviews")
@CompoundIndex(name = "deck_user_unique", def = "{'deck_id': 1, 'user_id': 1}", unique = true)
public class DeckReview extends Auditable {

    @Indexed
    @Field("deck_id")
    private String deckId;

    @Field("user_id")
    private String userId;

    @Field("author")
    private Author author;

    private int stars;

    @Field("body")
    private String body;
}
