package com.cephadex.ambi.user.dto;

import com.cephadex.ambi.theme.ThemeSpec;
import com.cephadex.ambi.user.UserPreferences;

/**
 * {@code PUT /api/users/me/preferences} body — a full replacement of the user's
 * {@link UserPreferences}. PUT (not PATCH) because preferences are a small,
 * self-contained value object: the settings form sends the complete desired
 * state, so a wholesale replace is simpler and avoids per-field merge
 * ambiguity.
 *
 * @param newsletter   opt-in to the product newsletter; null means "not set".
 * @param marketing    opt-in to marketing email.
 * @param theme        chosen UI theme.
 * @param stayLoggedIn whether to issue a persistent refresh cookie at sign-in.
 */
public record UpdatePreferencesRequest(
        Boolean newsletter,
        boolean marketing,
        ThemeSpec theme,
        boolean stayLoggedIn) {

    /** Builds the immutable value object persisted on the {@code User}. */
    public UserPreferences toPreferences() {
        return new UserPreferences(newsletter, marketing, theme, stayLoggedIn);
    }
}
