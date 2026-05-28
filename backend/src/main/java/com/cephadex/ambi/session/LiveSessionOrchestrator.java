package com.cephadex.ambi.session;

public class LiveSessionOrchestrator {
    private final LiveSessionDomain liveSession;

    // private final SessionLocks locks;
    // private final TallyStore tallies;
    // private final DeadlineScheduler deadlines;
    // private final EventPublisher publisher;
    // private final Clock clock;
    public LiveSessionOrchestrator(LiveSessionDomain liveSessionDomain) {

        this.liveSession = liveSessionDomain;
    }
}
