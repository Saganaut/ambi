package com.cephadex.ambi.model.slide.content;

import com.cephadex.ambi.model.enums.slide.SlideType;

/**
 * This is not scorable but if a follow up is attached to it the follow up is
 **/
public record QAndAContent() implements NonScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.Q_AND_A;
    }
}
