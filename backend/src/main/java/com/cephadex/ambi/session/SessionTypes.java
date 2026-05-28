package com.cephadex.ambi.session;

public final class SessionTypes {

    // Prevent instantiation of the container class
    private SessionTypes() {
    }

    public record SlideId(String value) {
        public SlideId {
            if (value == null || value.isBlank())
                throw new IllegalArgumentException("Slide ID cannot be empty");
        }
    }

    public record SessionId(String value) {
        public SessionId {
            if (value == null || value.isBlank())
                throw new IllegalArgumentException("Session ID cannot be empty");
        }
    }

    public record RoomCode(String value) {
        public RoomCode {
            if (value == null || value.length() != 6)
                throw new IllegalArgumentException("Invalid room code");
        }
    }

    public record ConnectionCount(int value) {
        public ConnectionCount {
            if (value < 0)
                throw new IllegalArgumentException("Connections cannot be negative");
        }
    }
}