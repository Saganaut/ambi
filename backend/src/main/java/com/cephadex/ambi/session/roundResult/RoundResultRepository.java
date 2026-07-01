package com.cephadex.ambi.session.roundResult;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.cephadex.ambi.session.SessionTypes.RoundResultId;

interface RoundResultRepository extends MongoRepository<RoundResult, RoundResultId> {
    // RoundResultId's sid/slideId are plain Strings, so the derived paths are
    // id.sid / id.slideId — not id.sid.value (String has no `value` property, which
    // would make Spring Data throw at bean creation).
    List<RoundResult> findByIdSid(String sessionId);

    Optional<RoundResult> findByIdSidAndIdSlideId(String sessionId, String slideId);
}
