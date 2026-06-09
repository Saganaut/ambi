package com.cephadex.ambi.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

/**
 * Shared error-mapping helpers used by both the REST {@link GlobalExceptionHandler}
 * and the STOMP {@code InteractiveSessionWebSocketController.handleException}, so
 * the status→code mapping and the generic 5xx message live in exactly one place
 * and the two transports stay consistent.
 */
public final class ApiErrors {

    /**
     * The only thing a 5xx body is ever allowed to say. Never surface
     * {@code ex.getMessage()}, a class name, or a stack frame on a 5xx — log it
     * server-side instead.
     */
    public static final String GENERIC_5XX_MESSAGE = "Something went wrong, please try again.";

    private ApiErrors() {
    }

    /**
     * Derives a machine-readable {@code code} from an HTTP status for errors
     * that don't carry an explicit one (legacy {@code ResponseStatusException},
     * framework exceptions). Any 5xx collapses to {@code INTERNAL_ERROR} so we
     * never hint at which server-side fault occurred.
     */
    public static String defaultCodeFor(HttpStatusCode status) {
        if (status.is5xxServerError()) {
            return "INTERNAL_ERROR";
        }
        HttpStatus resolved = HttpStatus.resolve(status.value());
        return resolved != null ? resolved.name() : "ERROR";
    }
}
