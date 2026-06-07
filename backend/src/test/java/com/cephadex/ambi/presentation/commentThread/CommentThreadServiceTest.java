package com.cephadex.ambi.presentation.commentThread;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.auth.enums.IdentityState;
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
import com.cephadex.ambi.user.enums.UserLevel;

/**
 * Service-level behaviour for slide discussions: opening a thread (always with a
 * first comment), appending comments, the authentication / authorship gates on
 * writes, resolving, and the deck-and-slide scoping of a thread lookup. The deck
 * VIEW + slide-exists gate lives in {@link DeckService#getSlide} (mocked here), so
 * these assert the thread rules layered on top of it.
 */
class CommentThreadServiceTest {

    private CommentThreadRepository repository;
    private DeckService deckService;
    private UserService userService;
    private CommentThreadService service;
    private AmbiPrincipal author;

    @BeforeEach
    void setUp() {
        repository = mock(CommentThreadRepository.class);
        deckService = mock(DeckService.class);
        userService = mock(UserService.class);
        service = new CommentThreadService(repository, deckService, userService);
        author = principal("author-1");
        when(repository.save(any(CommentThread.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    // ── Opening a thread ──────────────────────────────────────────────────────

    @Test
    void createThreadOpensWithFirstCommentAnchoredToSlide() {
        User user = user("pub-author-1", "Ann");
        when(userService.requireUser("author-1")).thenReturn(user);

        CommentThreadResponse thread = service.createThread("deck-1", "slide-1",
                new CommentBodyRequest("Opening comment"), author);

        assertThat(thread.slideId()).isEqualTo("slide-1");
        assertThat(thread.status()).isEqualTo(CommentThreadStatus.OPEN);
        assertThat(thread.comments()).hasSize(1);
        assertThat(thread.comments().get(0).body()).isEqualTo("Opening comment");
        assertThat(thread.comments().get(0).author().userId()).isEqualTo("pub-author-1");
        verify(repository).save(any(CommentThread.class));
    }

    @Test
    void createThreadRequiresAuthentication() {
        AmbiPrincipal visitor = new AmbiPrincipal(IdentityState.VISITOR, null, null, null,
                null, null, null, "sid-anon");

        assertThatThrownBy(() -> service.createThread("deck-1", "slide-1",
                new CommentBodyRequest("hi"), visitor))
                .isInstanceOf(UnauthorizedException.class);
        verify(userService, never()).requireUser(any());
        verify(repository, never()).save(any());
    }

    // ── Replying ──────────────────────────────────────────────────────────────

    @Test
    void addCommentAppendsToThread() {
        CommentThread thread = thread("t1", CommentThreadStatus.OPEN, comment("c1", "pub-someone"));
        when(repository.findById("t1")).thenReturn(Optional.of(thread));
        User user = user("pub-author-1", "Ann");
        when(userService.requireUser("author-1")).thenReturn(user);

        CommentThreadResponse updated = service.addComment("deck-1", "slide-1", "t1",
                new CommentBodyRequest("A reply"), author);

        assertThat(updated.comments()).hasSize(2);
        assertThat(updated.comments().get(1).body()).isEqualTo("A reply");
    }

    @Test
    void addCommentToThreadOfAnotherSlideIsNotFound() {
        CommentThread thread = thread("t1", CommentThreadStatus.OPEN, comment("c1", "pub-x"));
        when(repository.findById("t1")).thenReturn(Optional.of(thread));
        User user = user("pub-author-1", "Ann");
        when(userService.requireUser("author-1")).thenReturn(user);

        // Thread t1 is on slide-1; addressing it under slide-2 must not resolve.
        assertThatThrownBy(() -> service.addComment("deck-1", "slide-2", "t1",
                new CommentBodyRequest("x"), author))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void addCommentToMissingThreadIsNotFound() {
        when(repository.findById("nope")).thenReturn(Optional.empty());
        User user = user("pub-author-1", "Ann");
        when(userService.requireUser("author-1")).thenReturn(user);

        assertThatThrownBy(() -> service.addComment("deck-1", "slide-1", "nope",
                new CommentBodyRequest("x"), author))
                .isInstanceOf(NotFoundException.class);
    }

    // ── Editing & deleting ────────────────────────────────────────────────────

    @Test
    void editCommentByAuthorFlagsEditedAndReplacesBody() {
        CommentThread thread = thread("t1", CommentThreadStatus.OPEN, comment("c1", "pub-author-1"));
        when(repository.findById("t1")).thenReturn(Optional.of(thread));

        CommentThreadResponse updated = service.editComment("deck-1", "slide-1", "t1", "c1",
                new CommentBodyRequest("edited"), author);

        assertThat(updated.comments().get(0).body()).isEqualTo("edited");
        assertThat(updated.comments().get(0).edited()).isTrue();
    }

    @Test
    void editCommentByNonAuthorIsForbidden() {
        CommentThread thread = thread("t1", CommentThreadStatus.OPEN, comment("c1", "pub-someone-else"));
        when(repository.findById("t1")).thenReturn(Optional.of(thread));

        assertThatThrownBy(() -> service.editComment("deck-1", "slide-1", "t1", "c1",
                new CommentBodyRequest("hijack"), author))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void editDeletedCommentIsRejected() {
        CommentThread thread = thread("t1", CommentThreadStatus.OPEN,
                new Comment("c1", new Author("pub-author-1", "Ann", null), null, null, false, true));
        when(repository.findById("t1")).thenReturn(Optional.of(thread));

        assertThatThrownBy(() -> service.editComment("deck-1", "slide-1", "t1", "c1",
                new CommentBodyRequest("x"), author))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void deleteCommentByAuthorSoftDeletesAndRedactsBody() {
        CommentThread thread = thread("t1", CommentThreadStatus.OPEN, comment("c1", "pub-author-1"));
        when(repository.findById("t1")).thenReturn(Optional.of(thread));

        CommentThreadResponse updated = service.deleteComment("deck-1", "slide-1", "t1", "c1", author);

        assertThat(updated.comments()).hasSize(1); // row kept so the conversation survives
        assertThat(updated.comments().get(0).deleted()).isTrue();
        assertThat(updated.comments().get(0).body()).isNull();
    }

    // ── Status ──────────────────────────────────────────────────────────────────

    @Test
    void setStatusResolvesThread() {
        CommentThread thread = thread("t1", CommentThreadStatus.OPEN, comment("c1", "pub-author-1"));
        when(repository.findById("t1")).thenReturn(Optional.of(thread));

        CommentThreadResponse updated = service.setStatus("deck-1", "slide-1", "t1",
                new SetThreadStatusRequest(CommentThreadStatus.RESOLVED), author);

        assertThat(updated.status()).isEqualTo(CommentThreadStatus.RESOLVED);
    }

    // ── Listing ─────────────────────────────────────────────────────────────────

    @Test
    void listSlideThreadsMapsThreadsForTheSlide() {
        CommentThread thread = thread("t1", CommentThreadStatus.OPEN, comment("c1", "pub-author-1"));
        when(repository.findByDeckIdAndSlideIdOrderByCreatedAtDesc(
                "deck-1", "slide-1", PageRequest.of(0, 10)))
                .thenReturn(new PageImpl<>(List.of(thread)));

        var page = service.listSlideThreads("deck-1", "slide-1", PageRequest.of(0, 10), author);

        assertThat(page.getContent()).extracting(CommentThreadResponse::id).containsExactly("t1");
    }

    // ── Fixtures ────────────────────────────────────────────────────────────────

    private static CommentThread thread(String id, CommentThreadStatus status, Comment... comments) {
        CommentThread thread = new CommentThread();
        thread.setId(id);
        thread.setDeckId("deck-1");
        thread.setSlideId("slide-1");
        thread.setStatus(status);
        thread.setComments(new ArrayList<>(List.of(comments)));
        return thread;
    }

    private static Comment comment(String id, String authorPublicId) {
        return new Comment(id, new Author(authorPublicId, "Name", null), "body " + id, null, false, false);
    }

    private static User user(String publicId, String displayName) {
        User user = mock(User.class);
        when(user.getPublicId()).thenReturn(publicId);
        when(user.getDisplayName()).thenReturn(displayName);
        when(user.getAvatar()).thenReturn(null);
        return user;
    }

    private static AmbiPrincipal principal(String userId) {
        return new AmbiPrincipal(IdentityState.REGISTERED, userId, "pub-" + userId,
                UserLevel.USER, AuthProvider.INTERNAL, null, null, "sid-" + userId);
    }
}
