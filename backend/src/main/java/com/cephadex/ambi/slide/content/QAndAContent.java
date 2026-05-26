package com.cephadex.ambi.slide.content;

import com.cephadex.ambi.slide.enums.SlideType;

/**
 * This is not scorable but if a follow up is attached to it the follow up is
 **/
public record QAndAContent() implements NonScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.Q_AND_A;
    }
}
