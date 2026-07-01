package com.cephadex.ambi.auth.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Pins Invariant 2: {@code returnUrl} is only accepted as a same-origin relative
 * path; everything else collapses to {@code "/"}.
 */
class ReturnUrlValidatorTest {

    @ParameterizedTest
    @ValueSource(strings = {
            "/",
            "/decks",
            "/decks/abc?x=1&y=2",
            "/path#fragment",
            "/a/b/c",
    })
    void acceptsSameOriginRelativePaths(String url) {
        assertThat(ReturnUrlValidator.sanitize(url)).isEqualTo(url);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {
            "   ",
            "//evil.tld",            // protocol-relative
            "/\\evil.tld",           // backslash trick
            "\\\\evil.tld",          // UNC-style, no leading slash
            "javascript:alert(1)",   // scheme
            "data:text/html,x",      // scheme
            "http://evil.tld",       // absolute
            "https://evil.tld/path", // absolute
            "HtTpS://evil.tld",      // mixed-case scheme
            "evil.tld/path",         // no leading slash
            "//",                    // protocol-relative empty host
    })
    void rejectsEverythingElseToDefault(String url) {
        assertThat(ReturnUrlValidator.sanitize(url)).isEqualTo(ReturnUrlValidator.DEFAULT);
    }
}
