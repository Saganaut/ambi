package com.cephadex.ambi.session;

public record SessionId(String value) {

    public SessionId {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Session ID cannot be empty");
        }
    }

    @Override
    public String toString() {
        return value;
    }
}