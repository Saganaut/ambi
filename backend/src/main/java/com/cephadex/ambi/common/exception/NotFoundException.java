/**
 * 404 — the requested resource does not exist. Also used to *mask* permission
 * failures on guessable-key resources (room codes, invite tokens) where
 * revealing existence is itself a leak; in that case still use a
 * {@code *_NOT_FOUND} code, never {@code FORBIDDEN}. See
 * z-docs/features/exceptions.md (the 404-vs-403 policy).
 */
package com.cephadex.ambi.common.exception;

import org.springframework.http.HttpStatus;

public class NotFoundException extends ApiException {

    public NotFoundException(String code, String message) {
        super(HttpStatus.NOT_FOUND, code, message);
    }
}
