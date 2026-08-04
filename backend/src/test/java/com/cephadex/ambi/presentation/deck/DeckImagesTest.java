package com.cephadex.ambi.presentation.deck;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Constructor;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.RecordComponent;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.MediaContent;
import com.cephadex.ambi.presentation.slide.content.SlideContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.MediaType;
import com.fasterxml.jackson.annotation.JsonSubTypes;

/**
 * The walker's exhaustiveness guarantee, enforced structurally: every
 * {@link SlideContent} subtype registered in the {@code @JsonSubTypes} union is
 * instantiated reflectively with a fresh {@link AppImage} planted in every
 * image-bearing record component — direct fields and fields of records nested
 * inside {@code List} components, recursively — and {@link DeckImages} must
 * collect exactly those instances. A new content type (or new image field on an
 * existing one) that {@code DeckImages} does not walk fails this test, so the
 * copy-on-select lifecycle can never silently miss a placement.
 */
class DeckImagesTest {

    @Test
    void walkerCollectsEveryImageBearingFieldOfEveryContentType() throws Exception {
        JsonSubTypes union = SlideContent.class.getAnnotation(JsonSubTypes.class);
        assertThat(union).isNotNull();

        boolean anyPlanted = false;
        for (JsonSubTypes.Type subtype : union.value()) {
            List<AppImage> planted = new ArrayList<>();
            SlideContent content = (SlideContent) instantiate(subtype.value(), planted);

            assertThat(DeckImages.images(content))
                    .as("DeckImages must collect every AppImage embedded in %s",
                            subtype.value().getSimpleName())
                    .containsExactlyInAnyOrderElementsOf(planted);
            anyPlanted |= !planted.isEmpty();
        }
        // Sanity: the planting mechanism found image-bearing types at all.
        assertThat(anyPlanted).isTrue();
    }

    @Test
    void deckWalkGathersCoverBackgroundAndContentImagesWithTheirKeys() {
        Deck deck = new Deck();
        deck.setId("deck-1");
        AppImage cover = storedImage("gallery/cover/original");
        AppImage background = storedImage("gallery/bg/original");
        deck.setCoverImage(cover);
        deck.setBackgroundImage(background);

        Slide slide = new Slide();
        slide.setId("s1");
        AppImage slideCover = storedImage("gallery/slide-cover/original");
        AppImage slideBackground = storedImage("gallery/slide-bg/original");
        AppImage external = new AppImage();
        external.setExternal(true);
        external.setExternalSrc("https://example.com/cat.png");
        slide.setCoverImage(slideCover);
        slide.setBackgroundImage(slideBackground);
        slide.setContent(new MediaContent(MediaType.IMAGE, external, null, null, false, false, false));
        deck.getSlides().add(slide);

        assertThat(DeckImages.images(deck))
                .containsExactlyInAnyOrder(cover, background, slideCover, slideBackground, external);
        // keys() flattens to stored keys only — the external image owns none.
        assertThat(DeckImages.keys(deck)).containsExactlyInAnyOrder(
                "gallery/cover/original", "gallery/bg/original",
                "gallery/slide-cover/original", "gallery/slide-bg/original");
    }

    // ── Reflective instantiation ────────────────────────────────────────────────

    private static Object instantiate(Class<?> type, List<AppImage> planted) throws Exception {
        RecordComponent[] components = type.getRecordComponents();
        Class<?>[] parameterTypes = new Class<?>[components.length];
        Object[] arguments = new Object[components.length];
        for (int i = 0; i < components.length; i++) {
            parameterTypes[i] = components[i].getType();
            arguments[i] = valueFor(components[i], planted);
        }
        Constructor<?> constructor = type.getDeclaredConstructor(parameterTypes);
        constructor.setAccessible(true);
        return constructor.newInstance(arguments);
    }

    private static Object valueFor(RecordComponent component, List<AppImage> planted)
            throws Exception {
        Class<?> type = component.getType();
        if (type == AppImage.class) {
            return plant(planted);
        }
        if (List.class.isAssignableFrom(type)) {
            Class<?> element = elementType(component);
            if (element != null && element.isRecord() && bearsImages(element, new HashSet<>())) {
                return List.of(instantiate(element, planted));
            }
            return List.of();
        }
        if (Set.class.isAssignableFrom(type)) {
            return Set.of();
        }
        if (Map.class.isAssignableFrom(type)) {
            return Map.of();
        }
        if (type.isRecord() && bearsImages(type, new HashSet<>())) {
            return instantiate(type, planted);
        }
        if (type.isEnum()) {
            return type.getEnumConstants()[0];
        }
        if (type == boolean.class) {
            return false;
        }
        if (type == int.class) {
            return 0;
        }
        if (type == long.class) {
            return 0L;
        }
        if (type == double.class) {
            return 0.0d;
        }
        if (type == BigDecimal.class) {
            return BigDecimal.ZERO;
        }
        return null;
    }

    /** Whether a record embeds an AppImage anywhere (directly or via list/set/nested records). */
    private static boolean bearsImages(Class<?> record, Set<Class<?>> visited) {
        if (!visited.add(record)) {
            return false;
        }
        for (RecordComponent component : record.getRecordComponents()) {
            Class<?> type = component.getType();
            if (type == AppImage.class) {
                return true;
            }
            if (type.isRecord() && bearsImages(type, visited)) {
                return true;
            }
            if (List.class.isAssignableFrom(type) || Set.class.isAssignableFrom(type)) {
                Class<?> element = elementType(component);
                if (element == AppImage.class
                        || (element != null && element.isRecord() && bearsImages(element, visited))) {
                    return true;
                }
            }
        }
        return false;
    }

    private static Class<?> elementType(RecordComponent component) {
        if (component.getGenericType() instanceof ParameterizedType parameterized
                && parameterized.getActualTypeArguments()[0] instanceof Class<?> element) {
            return element;
        }
        return null;
    }

    private static AppImage plant(List<AppImage> planted) {
        AppImage image = new AppImage();
        image.setSrcKey("gallery/" + UUID.randomUUID() + "/original");
        planted.add(image);
        return image;
    }

    private static AppImage storedImage(String srcKey) {
        AppImage image = new AppImage();
        image.setExternal(false);
        image.setSrcKey(srcKey);
        return image;
    }
}
