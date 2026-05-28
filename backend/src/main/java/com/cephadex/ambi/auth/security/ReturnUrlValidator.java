package com.cephadex.ambi.auth.security;

import java.net.URI;
import java.net.URISyntaxException;

/**
 * Validates an attacker-controlled {@code returnUrl} as a same-origin relative
 * path before it is stashed or used as a redirect / {@code window.location}
 * target (auth/README.md Inv 2). A bare {@code startsWith("/")} is not enough.
 *
 * <p>Accept only if <strong>all</strong> hold, else fall back to {@code "/"}:
 * <ul>
 *   <li>starts with a single {@code /} and the second char is neither {@code /}
 *       nor {@code \} (rejects {@code //evil.tld} protocol-relative and
 *       {@code /\evil.tld} backslash tricks);</li>
 *   <li>parses with no scheme and no host/authority (rejects {@code javascript:},
 *       {@code data:}, absolute {@code http(s)://…}).</li>
 * </ul>
 *
 * Implemented once here as a shared, unit-tested utility. An optional route
 * allowlist can be layered on top later (see {@code isAllowlisted} seam).
 */
public final class ReturnUrlValidator {

    /** The safe default returned for any input that fails validation. */
    public static final String DEFAULT = "/";

    private ReturnUrlValidator() {
    }

    /**
     * @return {@code returnUrl} if it is a safe same-origin relative path,
     *         otherwise {@link #DEFAULT}.
     */
    public static String sanitize(String returnUrl) {
        if (returnUrl == null || returnUrl.isBlank()) {
            return DEFAULT;
        }
        // Must be an absolute path on this origin: single leading slash, and the
        // next char must not start a protocol-relative ("//") or backslash trick.
        if (!returnUrl.startsWith("/")) {
            return DEFAULT;
        }
        if (returnUrl.length() >= 2) {
            char second = returnUrl.charAt(1);
            if (second == '/' || second == '\\') {
                return DEFAULT;
            }
        }
        // No scheme, no host, no authority — purely a path (+ optional query/fragment).
        try {
            URI uri = new URI(returnUrl);
            if (uri.getScheme() != null || uri.getHost() != null || uri.getAuthority() != null) {
                return DEFAULT;
            }
        } catch (URISyntaxException e) {
            return DEFAULT;
        }
        return returnUrl;
    }
}
