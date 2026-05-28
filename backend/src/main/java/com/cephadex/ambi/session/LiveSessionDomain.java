package com.cephadex.ambi.session;

import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.session.liveSession.LiveSessionRepository;

/**
 * This is the aggregate for our LiveSession
 * decided to name it LiveSessionDomain to avoid naming collision with
 * LiveSession which is the mongodb document
 * 
 **/

public class LiveSessionDomain {
    private final LiveSessionRepository sessionRepo;
    private final LiveSession sessionEntity;

    public LiveSessionDomain(LiveSessionRepository liveSessionRepository, SessionId sid) {
        this.sessionRepo = liveSessionRepository;

        this.sessionEntity = this.sessionRepo.findById(sid.value())
                .orElseThrow(() -> new IllegalArgumentException("Session not found with ID: " + sid.value()));
    }

    public void startRound(SessionId sid, SlideId slideId) {

    }

}
