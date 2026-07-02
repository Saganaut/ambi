package com.cephadex.ambi.presentation.slide.content;

import com.cephadex.ambi.presentation.slide.enums.SlideType;

/**
 * A non-scorable "instruction" slide — tells players how to join the live
 * session. The join URL and code are session-runtime values filled in when the
 * deck is presented, not authored here; this record carries only the optional
 * author-supplied {@code heading} and {@code body} shown above that auto-rendered
 * join block.
 *
 * @param heading optional custom headline (e.g. "Join the game!"); {@code null}
 *                falls back to a default at render time
 * @param body    optional custom message shown under the heading; {@code null}
 *                when absent
 */
public record InstructionContent(String heading, String body) implements NonScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.INSTRUCTION;
    }
}
