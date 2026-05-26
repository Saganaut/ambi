package com.cephadex.ambi.model.user;

import lombok.Data;

@Data
public class Avatar {
    // If external avatar is true we use external src, otherwise refer to internal
    // collection
    // If isExternal is true, we should check for a src key first, then an external
    // src
    private Boolean external;
    // The external url if provided, used before loading the avatar into our s3
    private String externalSrc;
    // Internal S3 key
    private String srcKey;

    // Use internal lookup
    private String internalAvatarId;
}
