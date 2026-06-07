package com.cephadex.ambi.presentation.commentThread;

import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.presentation.commentThread.dto.CommentBodyRequest;
import com.cephadex.ambi.presentation.commentThread.dto.CommentThreadResponse;
import com.cephadex.ambi.presentation.commentThread.dto.SetThreadStatusRequest;

import jakarta.validation.Valid;

/**
 * HTTP surface for a slide's discussion — comment threads as a sub-resource of a
 * deck's slide. Every route delegates to {@link CommentThreadService}, which owns
 * the permission rules (VIEW the deck to read; authenticated to open / reply /
 * resolve; author to edit / delete) and throws the typed {@code ApiException}s
 * the global handler turns into RFC 9457 problem responses.
 *
 * <p>A thread carries its comments inline, and every mutation returns the whole
 * {@link CommentThreadResponse}, so the client reconciles its cache from the
 * response without a follow-up refetch.
 */
@RestController
@RequestMapping("/api/decks/{deckId}/slides/{slideId}/comment-threads")
public class CommentThreadController {

    private final CommentThreadService commentThreadService;

    public CommentThreadController(CommentThreadService commentThreadService) {
        this.commentThreadService = commentThreadService;
    }

    /** A slide's threads, newest first (VIEW). */
    @GetMapping
    public PagedModel<CommentThreadResponse> listSlideCommentThreads(
            @PathVariable String deckId,
            @PathVariable String slideId,
            Pageable pageable,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return new PagedModel<>(
                commentThreadService.listSlideThreads(deckId, slideId, pageable, principal));
    }

    /** Open a new thread on the slide with its first comment (VIEW + sign-in). */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CommentThreadResponse createCommentThread(
            @PathVariable String deckId,
            @PathVariable String slideId,
            @Valid @RequestBody CommentBodyRequest body,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return commentThreadService.createThread(deckId, slideId, body, principal);
    }

    /** Append a comment to a thread (VIEW + sign-in). */
    @PostMapping("/{threadId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentThreadResponse addThreadComment(
            @PathVariable String deckId,
            @PathVariable String slideId,
            @PathVariable String threadId,
            @Valid @RequestBody CommentBodyRequest body,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return commentThreadService.addComment(deckId, slideId, threadId, body, principal);
    }

    /** Edit a comment's text (author only). */
    @PatchMapping("/{threadId}/comments/{commentId}")
    public CommentThreadResponse updateThreadComment(
            @PathVariable String deckId,
            @PathVariable String slideId,
            @PathVariable String threadId,
            @PathVariable String commentId,
            @Valid @RequestBody CommentBodyRequest body,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return commentThreadService.editComment(deckId, slideId, threadId, commentId, body, principal);
    }

    /** Soft-delete a comment (author only). Returns the updated thread. */
    @DeleteMapping("/{threadId}/comments/{commentId}")
    public CommentThreadResponse deleteThreadComment(
            @PathVariable String deckId,
            @PathVariable String slideId,
            @PathVariable String threadId,
            @PathVariable String commentId,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return commentThreadService.deleteComment(deckId, slideId, threadId, commentId, principal);
    }

    /** Resolve or reopen a thread (VIEW + sign-in). */
    @PatchMapping("/{threadId}")
    public CommentThreadResponse setThreadStatus(
            @PathVariable String deckId,
            @PathVariable String slideId,
            @PathVariable String threadId,
            @Valid @RequestBody SetThreadStatusRequest body,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return commentThreadService.setStatus(deckId, slideId, threadId, body, principal);
    }
}
