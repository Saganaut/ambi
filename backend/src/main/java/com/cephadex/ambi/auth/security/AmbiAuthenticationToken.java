package com.cephadex.ambi.auth.security;

import java.util.Collection;

import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;

/**
 * The {@link org.springframework.security.core.Authentication} carried in the
 * security context for an authenticated Ambi request. Wraps an
 * {@link AmbiPrincipal} and its resolved authorities. Always pre-authenticated:
 * the {@link com.cephadex.ambi.auth.security.CookieAuthenticationFilter} only
 * builds one after Redis has validated the session, so there are no credentials.
 */
public final class AmbiAuthenticationToken extends AbstractAuthenticationToken {

    private static final long serialVersionUID = 1L;

    private final transient AmbiPrincipal principal;

    public AmbiAuthenticationToken(AmbiPrincipal principal, Collection<? extends GrantedAuthority> authorities) {
        super(authorities);
        this.principal = principal;
        setAuthenticated(true);
    }

    @Override
    public AmbiPrincipal getPrincipal() {
        return principal;
    }

    @Override
    public Object getCredentials() {
        return null;
    }

    @Override
    public String getName() {
        return principal.name();
    }
}
