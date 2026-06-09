package com.cephadex.ambi.common.exception;

import org.springframework.http.HttpStatus;

/**
 * 403 — the resource exists and the caller is identified, but lacks permission.
 * Only thrown where revealing existence is acceptable (decks, themes, orgs,
 * media — high-entropy ids). Guessable-key resources mask permission failures
 * as {@link NotFoundException} instead.
 */
public class ForbiddenException extends ApiException {

    private static final long serialVersionUID = 1L;

    public ForbiddenException(String code, String message) {
        super(HttpStatus.FORBIDDEN, code, message);
    }
}
