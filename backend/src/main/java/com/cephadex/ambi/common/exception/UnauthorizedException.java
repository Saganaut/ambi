/**
 * 401 — the caller is not authenticated and the action requires sign-in. The
 * frontend's baseQuery already maps a 401 to the login prompt; see
 * z-docs/features/auth/README.md.
 */
package com.cephadex.ambi.common.exception;

import org.springframework.http.HttpStatus;

public class UnauthorizedException extends ApiException {

    public UnauthorizedException(String code, String message) {
        super(HttpStatus.UNAUTHORIZED, code, message);
    }
}
