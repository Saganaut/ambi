package com.cephadex.ambi.presentation.commentThread;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import com.cephadex.ambi.presentation.commentThread.enums.CommentThreadStatus;

/**
 * {@link CommentThreadRepositoryCustom} implementation. The {@code Impl} suffix is
 * what Spring Data wires into {@link CommentThreadRepository} automatically.
 *
 * <p>All three writes set a whole sub-document / scalar so the Mongo converter
 * serializes records with the same field names a normal save would (e.g.
 * {@code Comment.parentCommentId} → {@code parent_comment_id}) — no dependence on
 * the camelCase/snake_case convention. {@code .currentDate("updated_at")} keeps
 * the {@code @LastModifiedDate} audit field fresh, since a targeted
 * {@code updateFirst} bypasses the auditing callback that {@code save()} fires.
 */
class CommentThreadRepositoryImpl implements CommentThreadRepositoryCustom {

    private final MongoTemplate mongoTemplate;

    CommentThreadRepositoryImpl(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public void appendComment(String threadId, Comment comment) {
        Update update = new Update()
                .push("comments", comment)
                .currentDate("updated_at");
        mongoTemplate.updateFirst(byId(threadId), update, CommentThread.class);
    }

    @Override
    public void replaceComment(String threadId, String commentId, Comment comment) {
        // Target one element of the embedded `comments` array by id (arrayFilter
        // `c`) and set the whole sub-document — same shape as the `slides.$[s]`
        // positional update in DeckRepositoryImpl.
        Update update = new Update()
                .set("comments.$[c]", comment)
                .filterArray(Criteria.where("c.id").is(commentId))
                .currentDate("updated_at");
        mongoTemplate.updateFirst(byId(threadId), update, CommentThread.class);
    }

    @Override
    public void replaceStatus(String threadId, CommentThreadStatus status) {
        // `status` has no @Field on CommentThread, so the BSON path is camelCase.
        Update update = new Update()
                .set("status", status)
                .currentDate("updated_at");
        mongoTemplate.updateFirst(byId(threadId), update, CommentThread.class);
    }

    private static Query byId(String threadId) {
        return new Query(Criteria.where("_id").is(threadId));
    }
}
