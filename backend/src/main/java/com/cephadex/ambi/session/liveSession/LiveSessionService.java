package com.cephadex.ambi.session.liveSession;

public class LiveSessionService {

    private static final String ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int ROOM_CODE_LENGTH = 6;
    private static final int MAX_CODE_ATTEMPTS = 10;
    private static final int BETWEEN_ROUNDS_DELAY_SECONDS = 5;
    private static final int SLIDE_DEFAULT_SECONDS = 5;

    private final LiveSessionRepository liveSessionRepository;
    private final RoundService roundService;

    public LiveSessionService(
            LiveSessionRepository liveSessionRepository, RoundService roundService) {

        this.roundService = roundService;
        this.liveSessionRepository = liveSessionRepository;
    }

    public void ValidateHost() {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    public LiveSession createLiveSession() {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    public LiveSession getByRoomCode() {
        throw new UnsupportedOperationException("Not implemented yet");

    }

    public LiveSession joinLiveSession() {
        throw new UnsupportedOperationException("Not implemented yet");

    }

    public LiveSession endLiveSession() {
        throw new UnsupportedOperationException("Not implemented yet");

    }

    public void cancelLiveSession() {
        throw new UnsupportedOperationException("Not implemented yet");

    }

    public void bootParticipant() {
        throw new UnsupportedOperationException("Not implemented yet");

    }

    public void startLiveSession() {
        throw new UnsupportedOperationException("Not implemented yet");

    }

    public void nextRound() {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    public void restartLiveSession() {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    public void leaveLiveSession() {
        throw new UnsupportedOperationException("Not implemented yet");

    }
}
