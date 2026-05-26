package com.cephadex.ambi.user;

import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.theme.Theme;

public record UserPreferences

(
        @Field("newsletter") Boolean newsletter,

        @Field("marketing") Boolean marketing,
        @Field("theme") Theme theme) {
}
