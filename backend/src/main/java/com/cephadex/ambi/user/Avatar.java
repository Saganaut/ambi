package com.cephadex.ambi.user;

import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.media.AppImage;

import lombok.Data;

/**
 * A user's avatar. Exactly one of the two sources is set:
 * <ul>
 * <li>{@link #internalAvatarId} — id of a frontend-bundled built-in avatar
 * (e.g. {@code "avatar-07"}); the frontend resolves it to an asset URL.</li>
 * <li>{@link #image} — a gallery-backed custom avatar. Stored with raw S3
 * keys; the {@code AppImage} Jackson serializer presigns them on every
 * response, so no per-DTO hydration is needed.</li>
 * </ul>
 */
@Data
public class Avatar {
    // Id of a built-in avatar from the frontend-bundled collection
    @Field("internal_avatar_id")
    private String internalAvatarId;

    // Gallery-backed custom avatar image
    @Field("image")
    private AppImage image;
}
