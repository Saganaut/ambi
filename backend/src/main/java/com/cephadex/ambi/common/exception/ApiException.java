package com.cephadex.ambi.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Base type for every application-level error that maps to a specific HTTP
 * response. Carries the HTTP {@code status}, a stable machine-readable
 * {@code code} (e.g. {@code DECK_NOT_FOUND}) that the frontend branches on, and
 * a human-readable message. {@link GlobalExceptionHandler} turns any
 * ApiException into an RFC 9457 {@code ProblemDetail}.
 *
 * New code should throw a subclass of this rather than a raw
 * {@code ResponseStatusException} — see z-docs/rules/exception-rules.md.
 */
public abstract class ApiException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    private final HttpStatus status;
    private final String code;

    protected ApiException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }
}
