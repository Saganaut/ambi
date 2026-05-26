package com.cephadex.ambi.model.user;

import com.cephadex.ambi.model.theme.Theme;

import lombok.Data;

@Data
public class UserPreferences {
    private Boolean newsletter;
    private Boolean marketing;
    private Theme theme;
}
