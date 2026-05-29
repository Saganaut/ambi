package com.cephadex.ambi.session.roundResult;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.cephadex.ambi.session.SessionTypes.RoundResultId;

interface RoundResultRepository extends MongoRepository<RoundResult, RoundResultId> {
    List<RoundResult> findByIdSidValue(String sessionId);

    Optional<RoundResult> findByIdSidValueAndIdSlideIdValue(String sessionId, String slideId);
}
