package com.cephadex.ambi.common.redis;

/**
 * Thrown when {@link RedisJsonCodec} cannot serialize a value to JSON or read a
 * value back. Unlike the auth session store, which treats a corrupt record as
 * "no session" and moves on, in-flight game state is authoritative while a round
 * is live — a record we can neither write nor parse is a real fault that callers
 * must handle, not swallow. Unchecked so it propagates to
 * {@code GlobalExceptionHandler} (becoming a masked 500) unless a caller chooses
 * to catch it.
 */
public class RedisCodecException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public RedisCodecException(String message, Throwable cause) {
        super(message, cause);
    }
}
