package com.cephadex.ambi.presentation.commentThread;

import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.user.Avatar;


/** 
 * @param userId the public ID of the user that made the comment
 * @param displayName the display name of the user that made the comment
 * @param avatar the avatar of the user that made the comment
 * 
 * All fields are required
 * **/
public record Author(    
    @Field("user_id") String userId,
    @Field("display_name") String displayName,
    @Field("avatar") Avatar avatar
) {

}
