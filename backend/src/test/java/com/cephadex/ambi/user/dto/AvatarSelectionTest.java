package com.cephadex.ambi.user.dto;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.Test;

import com.cephadex.ambi.common.exception.ValidationException;
import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.user.Avatar;

/**
 * Pins {@link AvatarSelectionRequest#toAvatar()}'s exactly-one-source contract: a
 * built-in id XOR a gallery-backed image. Both or neither must reject with
 * {@code VALIDATION_FAILED} so a PATCH can't silently wipe an avatar.
 */
class AvatarSelectionTest {

    private static AppImage internalImage() {
        AppImage image = new AppImage();
        image.setExternal(false);
        image.setSrcKey("gallery/abc/original");
        return image;
    }

    @Test
    void builtinSelectionMapsToInternalAvatarId() {
        Avatar avatar = new AvatarSelectionRequest("avatar-07", null).toAvatar();

        assertThat(avatar.getInternalAvatarId()).isEqualTo("avatar-07");
        assertThat(avatar.getImage()).isNull();
    }

    @Test
    void imageSelectionMapsToImage() {
        AppImage image = internalImage();
        Avatar avatar = new AvatarSelectionRequest(null, image).toAvatar();

        assertThat(avatar.getInternalAvatarId()).isNull();
        assertThat(avatar.getImage()).isSameAs(image);
    }

    @Test
    void bothSourcesRejected() {
        AvatarSelectionRequest selection = new AvatarSelectionRequest("avatar-07", internalImage());

        assertThatThrownBy(selection::toAvatar)
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("exactly one");
    }

    @Test
    void neitherSourceRejected() {
        assertThatThrownBy(() -> new AvatarSelectionRequest(null, null).toAvatar())
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("exactly one");
    }

    @Test
    void blankInternalAvatarIdCountsAsAbsent() {
        assertThatThrownBy(() -> new AvatarSelectionRequest("  ", null).toAvatar())
                .isInstanceOf(ValidationException.class);
    }
}
