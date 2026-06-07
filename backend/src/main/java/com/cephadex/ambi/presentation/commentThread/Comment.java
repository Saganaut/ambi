package com.cephadex.ambi.presentation.commentThread;

import org.springframework.data.mongodb.core.mapping.Field;


/** 
 * 
 * @param id the id of the commment, use NanoID
 * @param author the author of the comment
 * @param body the body of the comment
 * @param parentCommentId the ID of the parent comment, 0 for top-level comments
 * All fields are required.
 * 
 
 * **/


public record Comment(
    String id,
    Author author,
    String body,
    @Field("parent_comment_id") String parentCommentId,
    Boolean edited,
    Boolean deleted
) {
}