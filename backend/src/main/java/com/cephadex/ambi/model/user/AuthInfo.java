package com.cephadex.ambi.model.user;

import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.model.enums.user.AuthProvider;

import lombok.Data;

@Data
public class AuthInfo {

    @Field("auth_provider")
    private AuthProvider authProvider;

    // Null for internal
    @Field("external_provider_id")
    private String externalProviderId;

}
