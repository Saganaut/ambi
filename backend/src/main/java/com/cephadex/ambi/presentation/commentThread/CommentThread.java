package com.cephadex.ambi.presentation.commentThread;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.common.Auditable;
import com.cephadex.ambi.presentation.commentThread.enums.CommentThreadStatus;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

/**
 * A discussion thread anchored to a slide — a {@code (deckId, slideId)} pair —
 * holding a flat, ordered list of {@link Comment}s (the opener first, then
 * replies). A slide may have many threads, each with its own {@link
 * CommentThreadStatus} lifecycle. {@code contextId} is reserved for future
 * in-slide anchoring (a tagged region/element) and is unused for now.
 *
 * <p>The {@code id} is inherited from {@link Auditable} → {@code BaseDocument}
 * (the Mongo {@code _id}); audit timestamps come from {@code Auditable}. Comments
 * are an embedded list — small per thread, mutated through {@code CommentThreadService}.
 */
// TODO: Figure out how context (in-slide anchoring) will work.
@Getter
@Setter
@ToString
@Document(collection = "comment_threads")
public class CommentThread extends Auditable {

    @Indexed
    @Field("deck_id")
    private String deckId;

    @Field("slide_id")
    private String slideId;

    @Field("context_id")
    private String contextId;

    private CommentThreadStatus status;

    private List<Comment> comments = new ArrayList<>();
}
