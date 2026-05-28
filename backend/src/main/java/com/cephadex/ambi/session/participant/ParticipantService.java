package com.cephadex.ambi.session.participant;

import com.cephadex.ambi.session.liveSession.LiveSessionRepository;
import com.cephadex.ambi.user.User;

public class ParticipantService {
    private final LiveSessionRepository repository;

    public ParticipantService(LiveSessionRepository repository) {
        this.repository = repository;
    }

    public Participant createParticipant(User user) {
        throw new UnsupportedOperationException("Not implemented yet");
    }

    public void updateParticipant() {
        throw new UnsupportedOperationException("Not implemented yet");
    }

}
