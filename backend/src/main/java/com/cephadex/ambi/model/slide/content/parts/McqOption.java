package com.cephadex.ambi.model.slide.content.parts;

import com.cephadex.ambi.model.enums.slide.McqOptionType;
import com.cephadex.ambi.model.image.AppImage;

public record McqOption(
        String id,
        McqOptionType optionType,
        String text,
        AppImage image,
        String color) {

}
