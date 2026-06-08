package com.cephadex.ambi.presentation.commentThread;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

/**
 * Persistence for {@link CommentThread} aggregates. A thread is anchored to a
 * {@code (deckId, slideId)} pair; a slide may hold several threads, returned
 * newest-first.
 */
public interface CommentThreadRepository
        extends MongoRepository<CommentThread, String>, CommentThreadRepositoryCustom {

    Page<CommentThread> findByDeckIdAndSlideIdOrderByCreatedAtDesc(
            String deckId, String slideId, Pageable pageable);
}
