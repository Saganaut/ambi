package com.cephadex.ambi.auth.security;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import com.cephadex.ambi.auth.config.AuthProperties;
import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.service.AuthorityResolver;
import com.cephadex.ambi.auth.service.RedisTokenSessionService;
import com.cephadex.ambi.auth.service.SessionRecord;
import com.cephadex.ambi.user.User;
import com.cephadex.ambi.user.UserService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Resolves the identity state for every request from the {@code AMBI_AT} cookie.
 * Absent or invalid cookie → the request proceeds unauthenticated (a visitor);
 * the entry point only produces a 401 if a protected route is actually hit, so
 * the 401-vs-403 distinction is preserved.
 *
 * <p>For a guest/registered session the live {@link User} is loaded from Mongo
 * (so level/entitlement decisions are made on current data, never on the Redis
 * snapshot — Inv 7). A preRegistration session carries identity in the record
 * only, with no {@code User}.
 */
public class CookieAuthenticationFilter extends OncePerRequestFilter {

    private final AuthProperties props;
    private final RedisTokenSessionService tokenService;
    private final UserService userService;

    public CookieAuthenticationFilter(AuthProperties props, RedisTokenSessionService tokenService,
            UserService userService) {
        this.props = props;
        this.tokenService = tokenService;
        this.userService = userService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        // AnonymousAuthenticationFilter runs before this filter and sets an
        // anonymous token; treat that as "unauthenticated" so a valid cookie can
        // override it. Keeping anonymous enabled is what lets ExceptionTranslationFilter
        // map visitor→401 vs authenticated-but-denied→403 (Inv 8).
        if (isUnauthenticated(SecurityContextHolder.getContext().getAuthentication())) {
            readAccessCookie(request)
                    .flatMap(tokenService::validate)
                    .flatMap(this::toAuthentication)
                    .ifPresent(this::setContext);
        }
        chain.doFilter(request, response);
    }

    /**
     * Builds the authentication for a validated session, loading the live
     * {@link User} exactly once. Returns empty for a stale guest/registered
     * session whose User no longer exists.
     */
    private Optional<AmbiAuthenticationToken> toAuthentication(SessionRecord record) {
        IdentityState state = record.getState();

        // PRE_REGISTRATION holds identity in the session only — no User to load.
        if (state == IdentityState.PRE_REGISTRATION) {
            AmbiPrincipal principal = new AmbiPrincipal(state, null, null, null,
                    record.getProvider(), record.getExternalProviderId(), record.getEmail(),
                    record.getSessionId());
            return Optional.of(new AmbiAuthenticationToken(principal, AuthorityResolver.resolve(state, null)));
        }

        // GUEST / REGISTERED must be backed by a live User. A missing User means
        // a stale session (e.g. account deleted) — reject rather than trust the
        // Redis snapshot.
        User user = userService.findById(record.getUserId()).orElse(null);
        if (user == null) {
            return Optional.empty();
        }
        AmbiPrincipal principal = new AmbiPrincipal(
                state,
                user.getId(),
                user.getPublicId(),
                user.getUserLevel(),
                user.getAuth() != null ? user.getAuth().getAuthProvider() : record.getProvider(),
                user.getAuth() != null ? user.getAuth().getExternalProviderId() : record.getExternalProviderId(),
                user.getEmailAddress(),
                record.getSessionId());
        List<GrantedAuthority> authorities = AuthorityResolver.resolve(state, user);
        return Optional.of(new AmbiAuthenticationToken(principal, authorities));
    }

    private void setContext(AmbiAuthenticationToken token) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(token);
        SecurityContextHolder.setContext(context);
    }

    private static boolean isUnauthenticated(Authentication auth) {
        return auth == null || auth instanceof AnonymousAuthenticationToken;
    }

    private Optional<String> readAccessCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return Optional.empty();
        }
        String name = props.getCookie().getAccessName();
        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName())) {
                return Optional.ofNullable(cookie.getValue());
            }
        }
        return Optional.empty();
    }
}
