package com.cephadex.ambi.presentation.commentThread;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.exception.ForbiddenException;
import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.common.exception.UnauthorizedException;
import com.cephadex.ambi.common.exception.ValidationException;
import com.cephadex.ambi.presentation.commentThread.dto.CommentBodyRequest;
import com.cephadex.ambi.presentation.commentThread.dto.CommentThreadResponse;
import com.cephadex.ambi.presentation.commentThread.dto.SetThreadStatusRequest;
import com.cephadex.ambi.presentation.commentThread.enums.CommentThreadStatus;
import com.cephadex.ambi.presentation.deck.DeckService;
import com.cephadex.ambi.user.User;
import com.cephadex.ambi.user.UserService;

/**
 * The slide-discussion surface: {@link CommentThread}s anchored to a
 * {@code (deck, slide)}. A slide can hold many threads, each a small flat
 * conversation that always opens with a comment — there are no empty threads,
 * and no comments outside a thread.
 *
 * <p>Access is gated on the owning deck: reads (and the slide-exists check) go
 * through {@link DeckService#getSlide}, which throws the 403/404 contract.
 * Opening a thread, replying, resolving and reopening additionally require an
 * authenticated principal; editing and deleting a comment require its authorship.
 * Deletes are soft — the row stays so the conversation survives — with the body
 * redacted.
 */
@Service
public class CommentThreadService {

    private final CommentThreadRepository repository;
    private final DeckService deckService;
    private final UserService userService;

    public CommentThreadService(CommentThreadRepository repository, DeckService deckService,
            UserService userService) {
        this.repository = repository;
        this.deckService = deckService;
        this.userService = userService;
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    /** A slide's threads, newest-first, each with its comments inline (VIEW). */
    public Page<CommentThreadResponse> listSlideThreads(String deckId, String slideId,
            Pageable pageable, AmbiPrincipal principal) {
        deckService.getSlide(deckId, slideId, principal); // VIEW + slide exists
        return repository.findByDeckIdAndSlideIdOrderByCreatedAtDesc(deckId, slideId, pageable)
                .map(CommentThreadResponse::from);
    }

    // ── Write ─────────────────────────────────────────────────────────────────

    /** Open a new thread on a slide with its first comment (VIEW + sign-in). */
    public CommentThreadResponse createThread(String deckId, String slideId,
            CommentBodyRequest request, AmbiPrincipal principal) {
        deckService.getSlide(deckId, slideId, principal);
        User user = userService.requireUser(requireUserId(principal));

        CommentThread thread = new CommentThread();
        thread.setId(UUID.randomUUID().toString());
        thread.setDeckId(deckId);
        thread.setSlideId(slideId);
        thread.setStatus(CommentThreadStatus.OPEN);
        thread.setComments(new ArrayList<>(List.of(newComment(user, request.body()))));

        return CommentThreadResponse.from(repository.save(thread));
    }

    /** Append a comment to an existing thread (VIEW + sign-in). */
    public CommentThreadResponse addComment(String deckId, String slideId, String threadId,
            CommentBodyRequest request, AmbiPrincipal principal) {
        deckService.getSlide(deckId, slideId, principal);
        User user = userService.requireUser(requireUserId(principal));

        CommentThread thread = loadThread(deckId, slideId, threadId);
        thread.getComments().add(newComment(user, request.body()));

        return CommentThreadResponse.from(repository.save(thread));
    }

    /** Replace a comment's text (author only). Flags it {@code edited}. */
    public CommentThreadResponse editComment(String deckId, String slideId, String threadId,
            String commentId, CommentBodyRequest request, AmbiPrincipal principal) {
        deckService.getSlide(deckId, slideId, principal);
        String publicId = requirePublicId(principal);

        CommentThread thread = loadThread(deckId, slideId, threadId);
        int index = indexOfComment(thread, commentId);
        Comment existing = thread.getComments().get(index);
        requireAuthor(existing, publicId);
        if (Boolean.TRUE.equals(existing.deleted())) {
            throw new ValidationException("A deleted comment cannot be edited.");
        }

        thread.getComments().set(index, new Comment(existing.id(), existing.author(),
                request.body(), existing.parentCommentId(), true, false));

        return CommentThreadResponse.from(repository.save(thread));
    }

    /** Soft-delete a comment (author only): keep the row, redact the body. */
    public CommentThreadResponse deleteComment(String deckId, String slideId, String threadId,
            String commentId, AmbiPrincipal principal) {
        deckService.getSlide(deckId, slideId, principal);
        String publicId = requirePublicId(principal);

        CommentThread thread = loadThread(deckId, slideId, threadId);
        int index = indexOfComment(thread, commentId);
        Comment existing = thread.getComments().get(index);
        requireAuthor(existing, publicId);

        thread.getComments().set(index, new Comment(existing.id(), existing.author(), null,
                existing.parentCommentId(), Boolean.TRUE.equals(existing.edited()), true));

        return CommentThreadResponse.from(repository.save(thread));
    }

    /** Resolve or reopen a thread (VIEW + sign-in). */
    public CommentThreadResponse setStatus(String deckId, String slideId, String threadId,
            SetThreadStatusRequest request, AmbiPrincipal principal) {
        deckService.getSlide(deckId, slideId, principal);
        requireUserId(principal);

        CommentThread thread = loadThread(deckId, slideId, threadId);
        thread.setStatus(request.status());

        return CommentThreadResponse.from(repository.save(thread));
    }

    // ── Internals ───────────────────────────────────────────────────────────────

    private Comment newComment(User user, String body) {
        Author author = new Author(user.getPublicId(), user.getDisplayName(), user.getAvatar());
        return new Comment(UUID.randomUUID().toString(), author, body, null, false, false);
    }

    /** Load a thread, verifying it belongs to the given deck and slide. */
    private CommentThread loadThread(String deckId, String slideId, String threadId) {
        return repository.findById(threadId)
                .filter(t -> deckId.equals(t.getDeckId()) && slideId.equals(t.getSlideId()))
                .orElseThrow(CommentThreadService::threadNotFound);
    }

    /** Index of {@code commentId} in the thread, or a {@code COMMENT_NOT_FOUND}. */
    private static int indexOfComment(CommentThread thread, String commentId) {
        List<Comment> comments = thread.getComments();
        for (int i = 0; i < comments.size(); i++) {
            if (commentId.equals(comments.get(i).id())) {
                return i;
            }
        }
        throw new NotFoundException("COMMENT_NOT_FOUND", "Comment not found");
    }

    private static void requireAuthor(Comment comment, String publicId) {
        Author author = comment.author();
        if (author == null || !publicId.equals(author.userId())) {
            throw new ForbiddenException("COMMENT_FORBIDDEN",
                    "You can only modify your own comments.");
        }
    }

    /** The caller's Mongo user id, guarded — comment writes require sign-in. */
    private static String requireUserId(AmbiPrincipal principal) {
        if (principal == null || principal.userId() == null) {
            throw new UnauthorizedException("NOT_AUTHENTICATED", "Sign-in is required.");
        }
        return principal.userId();
    }

    /** The caller's public id, guarded — used to match comment authorship. */
    private static String requirePublicId(AmbiPrincipal principal) {
        if (principal == null || principal.publicId() == null) {
            throw new UnauthorizedException("NOT_AUTHENTICATED", "Sign-in is required.");
        }
        return principal.publicId();
    }

    private static NotFoundException threadNotFound() {
        return new NotFoundException("COMMENT_THREAD_NOT_FOUND", "Comment thread not found");
    }
}
