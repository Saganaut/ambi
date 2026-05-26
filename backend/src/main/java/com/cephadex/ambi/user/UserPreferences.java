package com.cephadex.ambi.user;

import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.theme.Theme;

public record UserPreferences

(
                @Field("newsletter") Boolean newsletter,
                @Field("marketing") boolean marketing,
                @Field("theme") Theme theme,
                @Field("stay_logged_in") boolean stayLoggedIn) {
}
