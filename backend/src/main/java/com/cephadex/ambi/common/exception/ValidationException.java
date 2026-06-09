package com.cephadex.ambi.common.exception;

import org.springframework.http.HttpStatus;

/**
 * 400 — a request failed a semantic/business validation that bean-validation
 * annotations cannot express (e.g. "a deck must have at least one element").
 * Field-level {@code @Valid} failures are handled automatically by
 * {@link GlobalExceptionHandler} and need not throw this.
 */
public class ValidationException extends ApiException {

    private static final long serialVersionUID = 1L;

    public ValidationException(String message) {
        super(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", message);
    }
}
