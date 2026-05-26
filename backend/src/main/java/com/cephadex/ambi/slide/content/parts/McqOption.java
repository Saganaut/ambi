package com.cephadex.ambi.slide.content.parts;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.slide.enums.McqOptionType;

public record McqOption(
                String id,
                McqOptionType optionType,
                String text,
                AppImage image,
                String color) {

}
