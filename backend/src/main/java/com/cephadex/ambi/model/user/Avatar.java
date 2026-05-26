package com.cephadex.ambi.model.user;

import org.springframework.data.mongodb.core.mapping.Field;

import lombok.Data;

@Data
public class Avatar {
    // If external avatar is true we use external src, otherwise refer to internal
    // collection
    // If isExternal is true, we should check for a src key first, then an external
    // src
    @Field("external")
    private Boolean external;

    // The external url if provided, used before loading the avatar into our s3
    @Field("external_src")
    private String externalSrc;

    // Internal S3 key
    @Field("src_key")
    private String srcKey;

    // Use internal lookup
    @Field("internal_avatar_id")
    private String internalAvatarId;
}
