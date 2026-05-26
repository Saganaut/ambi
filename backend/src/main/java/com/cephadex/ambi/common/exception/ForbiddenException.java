/**
 * 403 — the resource exists and the caller is identified, but lacks permission.
 * Only thrown where revealing existence is acceptable (decks, themes, orgs,
 * media — high-entropy ids). Guessable-key resources mask permission failures
 * as {@link NotFoundException} instead.
 */
package com.cephadex.ambi.common.exception;

import org.springframework.http.HttpStatus;

public class ForbiddenException extends ApiException {

    public ForbiddenException(String code, String message) {
        super(HttpStatus.FORBIDDEN, code, message);
    }
}
