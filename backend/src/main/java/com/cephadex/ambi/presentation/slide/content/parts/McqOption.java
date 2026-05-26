package com.cephadex.ambi.presentation.slide.content.parts;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.slide.enums.McqOptionType;

public record McqOption(
        String id,
        McqOptionType optionType,
        String text,
        AppImage image,
        String color) {

}
