package com.cephadex.ambi.model.user;

import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.model.theme.Theme;

import lombok.Data;

@Data
public class UserPreferences {

    @Field("newsletter")
    private Boolean newsletter;

    @Field("marketing")
    private Boolean marketing;

    @Field("theme")
    private Theme theme;
}
