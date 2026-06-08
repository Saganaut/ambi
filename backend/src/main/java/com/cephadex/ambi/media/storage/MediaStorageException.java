package com.cephadex.ambi.media.storage;

import org.springframework.http.HttpStatus;

import com.cephadex.ambi.common.exception.ApiException;

/**
 * 500 — an object store (S3/Garage) read or write failed. The
 * {@code GlobalExceptionHandler} collapses every 5xx body to the generic
 * message, so the real cause (logged server-side) never reaches the client.
 */
public class MediaStorageException extends ApiException {

    public MediaStorageException(String message, Throwable cause) {
        super(HttpStatus.INTERNAL_SERVER_ERROR, "MEDIA_STORAGE_ERROR", message);
        initCause(cause);
    }
}
