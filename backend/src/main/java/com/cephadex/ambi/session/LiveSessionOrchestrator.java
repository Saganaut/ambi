package com.cephadex.ambi.session;

import com.cephadex.ambi.session.SessionTypes.SessionId;
import com.cephadex.ambi.session.SessionTypes.SlideId;
import com.cephadex.ambi.session.liveSession.LiveSessionRepository;

public class LiveSessionOrchestrator {
    private final LiveSessionRepository repo;

    // private final SessionLocks locks;
    // private final TallyStore tallies;
    // private final DeadlineScheduler deadlines;
    // private final EventPublisher publisher;
    // private final Clock clock;
    public LiveSessionOrchestrator(LiveSessionRepository repo) {

        this.repo = repo;
    }

    public void startLiveSession(SessionId sid) {

    }

    public void startRound(SessionId sid, SlideId slideId) {

    }

    public void endRound(SessionId sid, SlideId slideId) {

    }

    public void restartRound(SessionId sid, SlideId slideId) {

    }
}
