package com.cephadex.ambi.session.liveSession;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface LiveSessionRepository extends MongoRepository<LiveSession, String> {

}
