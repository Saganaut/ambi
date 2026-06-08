package com.cephadex.ambi.user;

import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.theme.ThemeSpec;

public record UserPreferences

(
        @Field("newsletter") boolean newsletter,
        @Field("marketing") boolean marketing,
        @Field("theme") ThemeSpec theme,
        @Field("stay_logged_in") boolean stayLoggedIn) {
}
