package com.cephadex.ambi.session.liveSession;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface LiveSessionRepository extends MongoRepository<LiveSession, String> {

    /** The session currently using {@code roomCode}, if any (the code is uniquely indexed). */
    Optional<LiveSession> findByRoomCode(String roomCode);
}
