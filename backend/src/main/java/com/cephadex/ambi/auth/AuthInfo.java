package com.cephadex.ambi.auth;

import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.auth.enums.AuthProvider;

import lombok.Data;
import lombok.Setter;

//TODO: should we have a setter here?
@Setter
@Data
public class AuthInfo {

    @Field("auth_provider")
    private AuthProvider authProvider;

    // Null for internal
    @Field("external_provider_id")
    private String externalProviderId;

}
