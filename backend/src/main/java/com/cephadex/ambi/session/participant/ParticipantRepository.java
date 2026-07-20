package com.cephadex.ambi.session.participant;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface ParticipantRepository extends MongoRepository<Participant, String> {

    List<Participant> findByBanned(boolean banned);
}
