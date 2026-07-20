package com.cephadex.ambi.session.redis;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** The ZSET member encoding: every kind round-trips, and junk parses to null (not a crash). */
class SessionDeadlineTest {

    @Test
    void closeRoundMemberRoundTrips() {
        SessionDeadline deadline = SessionDeadline.closeRound("sess-1", "slide-9");

        assertThat(deadline.member()).isEqualTo("close:sess-1:slide-9");
        assertThat(SessionDeadline.parse(deadline.member())).isEqualTo(deadline);
    }

    @Test
    void hostAwayMemberRoundTrips() {
        SessionDeadline deadline = SessionDeadline.hostAway("sess-1");

        assertThat(deadline.member()).isEqualTo("hostAway:sess-1");
        assertThat(SessionDeadline.parse(deadline.member())).isEqualTo(deadline);
    }

    @Test
    void graceCancelMemberRoundTrips() {
        SessionDeadline deadline = SessionDeadline.graceCancel("sess-1");

        assertThat(deadline.member()).isEqualTo("graceCancel:sess-1");
        assertThat(SessionDeadline.parse(deadline.member())).isEqualTo(deadline);
    }

    @Test
    void malformedMembersParseToNull() {
        assertThat(SessionDeadline.parse(null)).isNull();
        assertThat(SessionDeadline.parse("")).isNull();
        assertThat(SessionDeadline.parse("bogusKind:sess-1")).isNull();
        assertThat(SessionDeadline.parse("close:sess-1")).isNull(); // close needs a slide
        assertThat(SessionDeadline.parse("hostAway:sess-1:extra")).isNull();
    }
}
