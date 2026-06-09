package com.cephadex.ambi.common.exception;

import org.springframework.http.HttpStatus;

/**
 * 401 — the caller is not authenticated and the action requires sign-in. The
 * frontend's baseQuery already maps a 401 to the login prompt; see
 * z-docs/features/auth/README.md.
 */
public class UnauthorizedException extends ApiException {

    private static final long serialVersionUID = 1L;

    public UnauthorizedException(String code, String message) {
        super(HttpStatus.UNAUTHORIZED, code, message);
    }
}
