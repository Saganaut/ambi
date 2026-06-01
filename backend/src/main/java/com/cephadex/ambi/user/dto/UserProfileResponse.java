package com.cephadex.ambi.user.dto;

import com.cephadex.ambi.user.Avatar;
import com.cephadex.ambi.user.User;
import com.cephadex.ambi.user.UserPreferences;
import com.cephadex.ambi.user.enums.UserLevel;

/**
 * The caller's own profile, as returned by the {@code /api/users/me} endpoints.
 * This is the self view: it carries fields the owner may see and edit
 * ({@code timezone}, {@code avatar}, {@code preferences}) that the leaner
 * {@code /api/auth/me} session probe ({@code MeResponse}) omits. It is never
 * used to expose another user — a public view would drop {@code email} and the
 * internal avatar {@code srcKey}.
 *
 * @param publicId    stable public user id.
 * @param username    account handle (not editable here).
 * @param displayName friendly name.
 * @param email       the owner's email (self view only).
 * @param timezone    IANA zone id, or null if unset.
 * @param userLevel   account level.
 * @param avatar      current avatar, or null if none chosen.
 * @param preferences current preferences, or null if never set.
 */
public record UserProfileResponse(
        String publicId,
        String username,
        String displayName,
        String email,
        String timezone,
        UserLevel userLevel,
        Avatar avatar,
        UserPreferences preferences) {

    /** Projects a persisted {@link User} onto its self-view response. */
    public static UserProfileResponse from(User user) {
        return new UserProfileResponse(
                user.getPublicId(),
                user.getUsername(),
                user.getDisplayName(),
                user.getEmailAddress(),
                user.getTimezone(),
                user.getUserLevel(),
                user.getAvatar(),
                user.getPreferences());
    }
}
