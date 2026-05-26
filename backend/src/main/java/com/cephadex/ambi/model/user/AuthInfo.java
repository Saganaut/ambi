package com.cephadex.ambi.model.user;

import com.cephadex.ambi.model.enums.user.AuthProvider;

import lombok.Data;

@Data
public class AuthInfo {

    private AuthProvider authProvier;

    // Null for internal
    private String externalProviderId;

}
