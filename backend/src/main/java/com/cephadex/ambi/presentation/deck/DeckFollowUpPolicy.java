package com.cephadex.ambi.presentation.deck;

import com.cephadex.ambi.common.exception.ValidationException;
import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.DrawingContent;
import com.cephadex.ambi.presentation.slide.content.FollowUpContent;
import com.cephadex.ambi.presentation.slide.content.ScorableContent;
import com.cephadex.ambi.presentation.slide.content.SlideContent;
import com.cephadex.ambi.presentation.slide.content.TextContent;
import com.cephadex.ambi.presentation.slide.enums.FollowUpMode;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

/** Enforces the authored-content invariants of parent and follow-up slide pairs. */
final class DeckFollowUpPolicy {

    private DeckFollowUpPolicy() {
    }

    static void requireCanAttach(Deck deck, Slide parent, FollowUpMode mode) {
        if (deck.isAttachedFollowUp(parent)) {
            throw new ValidationException("A follow-up slide cannot have its own follow-up");
        }
        SlideContent parentContent = parent.getContent();
        if (!(parentContent instanceof ScorableContent)
                || parentContent.contentType() == SlideType.FOLLOW_UP) {
            throw new ValidationException("Only scorable slides can have a follow-up");
        }
        if (!mode.supportsParent(parentContent.contentType())) {
            throw new ValidationException("Follow-up mode " + mode + " is not valid for a "
                    + parentContent.contentType() + " slide");
        }
        requireAnswerKeyFor(mode, parentContent);
    }

    static void requireValidContentTransition(Deck deck, Slide slide, SlideContent next) {
        boolean isFollowUp = slide.getContent() instanceof FollowUpContent;
        if (!isFollowUp && next instanceof FollowUpContent) {
            throw new ValidationException(
                    "A follow-up slide can only be created through the follow-up endpoint");
        }
        if (isFollowUp) {
            if (!(next instanceof FollowUpContent nextFollowUp)) {
                throw new ValidationException(
                        "A follow-up slide cannot change to another slide type; delete it instead");
            }
            deck.findSlide(slide.getParentId()).ifPresent(parent -> {
                if (!nextFollowUp.mode().supportsParent(parent.getContent().contentType())) {
                    throw new ValidationException("Follow-up mode " + nextFollowUp.mode()
                            + " is not valid for a " + parent.getContent().contentType() + " slide");
                }
                requireAnswerKeyFor(nextFollowUp.mode(), parent.getContent());
            });
        }
        deck.attachedFollowUp(slide).ifPresent(child -> {
            FollowUpMode childMode = ((FollowUpContent) child.getContent()).mode();
            if (next != null && !childMode.supportsParent(next.contentType())) {
                throw new ValidationException(
                        "Changing this slide's type would invalidate its follow-up; delete the follow-up first");
            }
            if (next != null && childMode.requiresAnswerKey() && !hasAnswerKey(next)) {
                throw new ValidationException(
                        "Removing this slide's authored answer would invalidate its follow-up, which hides "
                                + "that answer among the submissions; change the follow-up's mode first");
            }
        });
    }

    private static void requireAnswerKeyFor(FollowUpMode mode, SlideContent parentContent) {
        if (mode.requiresAnswerKey() && !hasAnswerKey(parentContent)) {
            throw new ValidationException("Follow-up mode " + mode
                    + " needs a parent slide with an authored answer; add one first");
        }
    }

    private static boolean hasAnswerKey(SlideContent content) {
        return switch (content) {
            case TextContent text -> text.acceptedAnswers() != null
                    && text.acceptedAnswers().stream().anyMatch(answer -> answer != null && !answer.isBlank());
            case DrawingContent drawing -> isSeedableImage(drawing.correctImage());
            case null, default -> false;
        };
    }

    private static boolean isSeedableImage(AppImage image) {
        if (image == null || image.isExternal()) {
            return false;
        }
        if (image.getSrcKey() != null && !image.getSrcKey().isBlank()) {
            return true;
        }
        return image.getVariants() != null
                && image.getVariants().values().stream().anyMatch(url -> url != null && !url.isBlank());
    }
}
