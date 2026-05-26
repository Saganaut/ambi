/**
 * 409 — the request conflicts with current state: a duplicate id, a room code
 * already in use, a session that has already started, etc.
 */
package com.cephadex.ambi.common.exception;

import org.springframework.http.HttpStatus;

public class ConflictException extends ApiException {

    public ConflictException(String code, String message) {
        super(HttpStatus.CONFLICT, code, message);
    }
}
