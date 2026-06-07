package com.cephadex.ambi.presentation.commentThread;

import java.util.List;

import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.common.Auditable;
import com.cephadex.ambi.presentation.commentThread.enums.CommentThreadStatus;

import lombok.Getter;
import lombok.ToString;


/** 
 * @param id the id of the comment thread, use NanoID
 * @param deckId the ID of the deck to which the comment thread belongs
 * @param slideId the ID of the slide to which the comment thread belongs
 * @param contextId the ID of the context to which the comment thread belongs
 * @param status the status of the comment thread
 * @param comments the list of comments in the thread
 * All fields are required.
 **/

//TODO: Figure out how context will work
@Getter
@ToString
public class CommentThread extends Auditable {
    
    private String id;

    @Field("deck_id")
    private String deckId;

    @Field("slide_id")
    private String slideId;

    @Field("context_id")
    private String contextId;

    private CommentThreadStatus status;

    private List<Comment> comments;

}
