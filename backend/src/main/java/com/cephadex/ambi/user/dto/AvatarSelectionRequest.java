package com.cephadex.ambi.user.dto;

import com.cephadex.ambi.common.exception.ValidationException;
import com.cephadex.ambi.common.validation.ValidationConstants;
import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.user.Avatar;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

/**
 * The user-settable half of an {@link Avatar}. The client picks exactly one
 * source — an {@code internalAvatarId} (a pick from the frontend-bundled
 * built-in collection) or an {@code image} (a gallery-backed {@link AppImage},
 * e.g. picked or uploaded through the gallery picker). Incoming images arrive
 * with presigned URLs already stripped back to raw keys by the
 * {@code AppImage} deserializer, so nothing here needs sanitizing.
 *
 * @param internalAvatarId id of a built-in avatar.
 * @param image            gallery-backed custom avatar image.
 */
public record AvatarSelectionRequest(
        @Size(max = ValidationConstants.AVATAR_ID_MAX) String internalAvatarId,
        @Valid AppImage image) {

    /**
     * Maps this selection onto a fresh {@link Avatar}. Exactly one source must
     * be provided — PATCH semantics already express "leave unchanged" by
     * omitting the {@code avatar} field entirely, so an empty selection is
     * never meaningful.
     *
     * @throws ValidationException when both or neither source is set.
     */
    public Avatar toAvatar() {
        boolean hasId = internalAvatarId != null && !internalAvatarId.isBlank();
        boolean hasImage = image != null;
        if (hasId == hasImage) {
            throw new ValidationException(
                    "Avatar selection must provide exactly one of internalAvatarId or image.");
        }
        Avatar avatar = new Avatar();
        avatar.setInternalAvatarId(hasId ? internalAvatarId : null);
        avatar.setImage(image);
        return avatar;
    }
}
