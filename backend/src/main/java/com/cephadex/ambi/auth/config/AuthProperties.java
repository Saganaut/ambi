package com.cephadex.ambi.auth.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

import lombok.Data;

/**
 * Strongly-typed auth configuration (prefix {@code ambi.auth}). Defaults mirror
 * the README's token/session table; everything is overridable per environment.
 * This is config, not a wire DTO, so it's a Lombok class rather than a record.
 */
@Data
@ConfigurationProperties(prefix = "ambi.auth")
public class AuthProperties {

    private final Cookie cookie = new Cookie();
    private final Token token = new Token();
    private final Session session = new Session();
    private final Cors cors = new Cors();

    @Data
    public static class Cookie {
        /** Access-token cookie name (HttpOnly). */
        private String accessName = "AMBI_AT";
        /** Refresh-token cookie name (HttpOnly). */
        private String refreshName = "AMBI_RT";
        /** SameSite policy; Lax preserves the OAuth redirect (CSRF token covers the rest). */
        private String sameSite = "Lax";
        /** Cookie path. */
        private String path = "/";
        // No `secure` flag on purpose: it is derived from request.isSecure() per Inv.
    }

    @Data
    public static class Token {
        /** HMAC signing key for the access JWT. MUST be overridden in production. */
        private String signingKey;
        /** JWT issuer claim. */
        private String issuer = "ambi";
        /** Access-token lifetime (short; the JWT is a Redis-backed handle). */
        private Duration accessTtl = Duration.ofMinutes(15);
        /** Session-scoped refresh / idle window, slid by /refresh. */
        private Duration refreshIdleTtl = Duration.ofMinutes(30);
        /** Persistent ("stay logged in") refresh lifetime. */
        private Duration refreshPersistentTtl = Duration.ofDays(30);
    }

    @Data
    public static class Session {
        /** Redis key namespace for session records. */
        private String redisNamespace = "ambi:session";
    }

    @Data
    public static class Cors {
        /** The single allowed browser origin (credentialed CORS forbids wildcards). */
        private String frontendOrigin = "http://localhost:5173";
    }
}
