package com.cephadex.ambi.session.participant;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface ParticipantRepository extends MongoRepository<Participant, String> {

    Optional<Participant> findByUserId(String userId);

    List<Participant> findByBanned(boolean banned);
}
