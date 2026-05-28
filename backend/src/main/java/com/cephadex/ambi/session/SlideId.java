package com.cephadex.ambi.session;

public record SlideId(String value) {

    public SlideId {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Slide ID cannot be empty");
        }
    }

    @Override
    public String toString() {
        return value;
    }
}