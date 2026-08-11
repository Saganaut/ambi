package com.cephadex.ambi.presentation.slide;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.RecordComponent;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.convert.MappingMongoConverter;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;
import org.springframework.data.mongodb.core.convert.NoOpDbRefResolver;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.media.Placement;
import com.cephadex.ambi.media.enums.ImageSizeOptions;
import com.cephadex.ambi.presentation.deck.Settings;
import com.cephadex.ambi.presentation.deck.enums.ResultsDisplayMode;
import com.cephadex.ambi.presentation.slide.content.McqContent;
import com.cephadex.ambi.presentation.slide.content.NumberContent;
import com.cephadex.ambi.presentation.slide.content.PlaceOnImageContent;
import com.cephadex.ambi.presentation.slide.content.SlideContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.McqDataVisualization;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.McqOption;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.PlaceItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.PlacePoint;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScoreMode;
import com.cephadex.ambi.presentation.slide.enums.Difficulty;
import com.cephadex.ambi.presentation.slide.enums.McqOptionType;
import com.fasterxml.jackson.annotation.JsonSubTypes;

/**
 * The deep-copy contract of {@link SlideCopier}, which copies through the
 * persistence view rather than a hand-written per-type walker. Covered: every
 * persisted {@link Slide} field survives (enforced structurally — a new field
 * the fixture doesn't populate fails the test); polymorphic content keeps its
 * concrete subtype, its items and its answer keys, with content-internal item
 * ids preserved; and every embedded {@link AppImage} comes across as a distinct
 * instance carrying equal storage keys, so two slides can never alias one
 * mutable image. The subtype sweep instantiates each registered
 * {@code SlideContent} reflectively, so a newly registered content type that
 * doesn't round-trip fails the build.
 */
class SlideCopierTest {

    private SlideCopier copier;

    @BeforeEach
    void setUp() {
        MongoCustomConversions conversions = new MongoCustomConversions(List.of());
        MongoMappingContext context = new MongoMappingContext();
        context.setSimpleTypeHolder(conversions.getSimpleTypeHolder());
        context.afterPropertiesSet();
        MappingMongoConverter converter =
                new MappingMongoConverter(NoOpDbRefResolver.INSTANCE, context);
        converter.setCustomConversions(conversions);
        converter.afterPropertiesSet();
        copier = new SlideCopier(converter);
    }

    // ── Whole-slide fidelity ────────────────────────────────────────────────────

    @Test
    void everyPersistedSlideFieldSurvivesTheCopy() throws Exception {
        Slide source = fullyPopulatedSlide();

        Slide copy = copier.deepCopy(source);

        assertThat(copy).isNotSameAs(source);
        for (Field field : Slide.class.getDeclaredFields()) {
            field.setAccessible(true);
            Object sourceValue = field.get(source);
            // Guards the fixture: a field added to Slide but left unset here
            // would make the equality assertion below vacuous.
            assertThat(sourceValue)
                    .as("fixture must populate Slide.%s so the copy of it is actually asserted",
                            field.getName())
                    .isNotNull()
                    .isNotEqualTo(defaultValueOf(field.getType()));
            assertThat(field.get(copy))
                    .as("Slide.%s must survive the deep copy", field.getName())
                    .isEqualTo(sourceValue);
        }
    }

    @Test
    void contentKeepsItsSubtypeItemsAndAnswerKey() {
        Slide source = new Slide();
        source.setId("s1");
        source.setContent(new PlaceOnImageContent(storedImage("deck/d1/pic"),
                List.of(new PlaceItem("item-1", "Paris", null, "#ff0000")),
                Map.of("item-1", new PlacePoint(0.25d, 0.75d)),
                0.1d, ScoreMode.INSIDE_RADIUS));

        Slide copy = copier.deepCopy(source);

        assertThat(copy.getContent()).isInstanceOfSatisfying(PlaceOnImageContent.class, place -> {
            assertThat(place.items()).containsExactly(
                    new PlaceItem("item-1", "Paris", null, "#ff0000"));
            assertThat(place.correctPositions())
                    .containsExactly(Map.entry("item-1", new PlacePoint(0.25d, 0.75d)));
            assertThat(place.tolerance()).isEqualTo(0.1d);
            assertThat(place.scoreMode()).isEqualTo(ScoreMode.INSIDE_RADIUS);
        });
    }

    @Test
    void contentInternalItemIdsAreKeptSoAnswerKeysStillResolve() {
        Slide source = new Slide();
        source.setId("s1");
        source.setContent(new McqContent(
                List.of(new McqOption("opt-1", McqOptionType.TEXT, "Yes", null, null),
                        new McqOption("opt-2", McqOptionType.TEXT, "No", null, null)),
                Set.of("opt-2"), McqDataVisualization.BAR_VERTICAL));

        Slide copy = copier.deepCopy(source);

        assertThat(copy.getContent()).isInstanceOfSatisfying(McqContent.class, mcq -> {
            assertThat(mcq.options().stream().map(option -> option.id()).toList())
                    .containsExactly("opt-1", "opt-2");
            assertThat(mcq.correctOptionIds()).containsExactly("opt-2");
        });
    }

    // ── Image identity ──────────────────────────────────────────────────────────

    @Test
    void embeddedImagesAreFreshInstancesWithEqualStorageKeys() {
        Slide source = new Slide();
        source.setId("s1");
        source.setCoverImage(storedImage("deck/d1/cover"));
        source.setBackgroundImage(storedImage("deck/d1/bg"));
        source.setContent(new McqContent(
                List.of(new McqOption("opt-1", McqOptionType.IMAGE, null,
                        storedImage("deck/d1/opt"), null)),
                Set.of("opt-1"), McqDataVisualization.NONE));

        Slide copy = copier.deepCopy(source);

        assertThat(copy.getCoverImage()).isNotSameAs(source.getCoverImage())
                .isEqualTo(source.getCoverImage());
        assertThat(copy.getBackgroundImage()).isNotSameAs(source.getBackgroundImage())
                .isEqualTo(source.getBackgroundImage());
        AppImage sourceOption = ((McqContent) source.getContent()).options().get(0).image();
        AppImage copiedOption = ((McqContent) copy.getContent()).options().get(0).image();
        assertThat(copiedOption).isNotSameAs(sourceOption).isEqualTo(sourceOption);
        assertThat(copiedOption.getSrcKey()).isEqualTo("deck/d1/opt/original");
        assertThat(copiedOption.getVariants()).isEqualTo(sourceOption.getVariants());
    }

    @Test
    void mutatingACopiedImageDoesNotReachTheSource() {
        Slide source = new Slide();
        source.setId("s1");
        source.setCoverImage(storedImage("deck/d1/cover"));

        Slide copy = copier.deepCopy(source);
        copy.getCoverImage().setSrcKey("deck/d1/adopted/original");
        copy.getCoverImage().setVariants(Map.of());

        assertThat(source.getCoverImage().getSrcKey()).isEqualTo("deck/d1/cover/original");
        assertThat(source.getCoverImage().getVariants())
                .containsEntry(ImageSizeOptions.SM, "deck/d1/cover/sm.webp");
    }

    // ── Content-subtype sweep ───────────────────────────────────────────────────

    @Test
    void everyRegisteredContentSubtypeRoundTripsUnchanged() throws Exception {
        JsonSubTypes union = SlideContent.class.getAnnotation(JsonSubTypes.class);
        assertThat(union).isNotNull();

        for (JsonSubTypes.Type subtype : union.value()) {
            SlideContent content = (SlideContent) instantiate(subtype.value());
            Slide source = new Slide();
            source.setId("s1");
            source.setContent(content);

            Slide copy = copier.deepCopy(source);

            assertThat(copy.getContent())
                    .as("%s must survive the deep copy unchanged", subtype.value().getSimpleName())
                    .isEqualTo(content)
                    .isNotSameAs(content);
            // Guards the generator: an all-null instance would pass vacuously.
            assertThat(populatedComponentsOf(content))
                    .as("the reflective fixture must populate %s", subtype.value().getSimpleName())
                    .isNotEmpty();
        }
    }

    @Test
    void numericAndCollectionAnswerKeysSurviveTheirBsonRepresentations() {
        // The three shapes a naive copy is most likely to mangle: a BigDecimal
        // (stored as Decimal128), an enum-keyed map and a Set (both stored
        // structurally unlike the Java type they are read back into).
        Slide source = new Slide();
        source.setId("s1");
        source.setContent(new NumberContent(new BigDecimal("42.5"), ScoreMode.RANGE,
                new BigDecimal("0.5"), "km", new BigDecimal("0"), new BigDecimal("100")));
        source.setCoverImage(storedImage("deck/d1/cover"));

        Slide copy = copier.deepCopy(source);

        assertThat(copy.getContent()).isInstanceOfSatisfying(NumberContent.class, number -> {
            assertThat(number.answer()).isEqualByComparingTo("42.5");
            assertThat(number.tolerance()).isEqualByComparingTo("0.5");
            assertThat(number.min()).isEqualByComparingTo("0");
            assertThat(number.max()).isEqualByComparingTo("100");
            assertThat(number.unit()).isEqualTo("km");
            assertThat(number.scoreMode()).isEqualTo(ScoreMode.RANGE);
        });
        assertThat(copy.getCoverImage().getVariants())
                .containsExactly(Map.entry(ImageSizeOptions.SM, "deck/d1/cover/sm.webp"));
        assertThat(copy.getCoverImage().getMetadata())
                .containsEntry("originalContentType", "image/png");
        assertThat(copy.getCoverImage().getPlacement()).isEqualTo(new Placement(1, 2, 3, 4));
    }

    // ── Fixtures ────────────────────────────────────────────────────────────────

    /** A slide with every persisted field set to a distinctive, non-default value. */
    private static Slide fullyPopulatedSlide() {
        Slide slide = new Slide();
        slide.setId("s1");
        slide.setTitle("Capital cities");
        slide.setSection("Geography");
        slide.setBackgroundImage(storedImage("deck/d1/bg"));
        slide.setHideBackground(true);
        slide.setBackgroundColor("#112233");
        slide.setCoverImage(storedImage("deck/d1/cover"));
        slide.setCreatedByUserId("author-1");
        slide.setLastEditedByUserId("editor-1");
        slide.setParentId("p1");
        slide.setChildId("c1");
        slide.setVersion(7);
        slide.setSortOrder("0|hzzzzz:");
        slide.setContent(new McqContent(
                List.of(new McqOption("opt-1", McqOptionType.TEXT, "Paris", null, "#00ff00")),
                Set.of("opt-1"), McqDataVisualization.PIE));
        slide.setDifficulty(Difficulty.HARD);
        slide.setExplanation("Paris has been the capital since 508.");
        slide.setSpeakerNotes("Ask the room first.");
        slide.setParticipantInstructions("Pick one.");
        slide.setSettings(new Settings.SlideSettings(
                new Settings.PointSettings(500, 10, 2, 3, Map.of(3, 100), true),
                new Settings.AnswerSettings(ResultsDisplayMode.ROUND_END, true, true, true, 45, true, 2)));
        return slide;
    }

    /** A stored image laid out canonically under {@code prefix} (original + SM). */
    private static AppImage storedImage(String prefix) {
        AppImage image = new AppImage();
        image.setId(prefix);
        image.setExternal(false);
        image.setSrcKey(prefix + "/original");
        image.setAltText("alt of " + prefix);
        Map<ImageSizeOptions, String> variants = new LinkedHashMap<>();
        variants.put(ImageSizeOptions.SM, prefix + "/sm.webp");
        image.setVariants(variants);
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("originalContentType", "image/png");
        image.setMetadata(metadata);
        image.setPlacement(new Placement(1, 2, 3, 4));
        return image;
    }

    /** The value an unset field of {@code type} would hold, for the fixture guard. */
    private static Object defaultValueOf(Class<?> type) {
        if (type == boolean.class) {
            return Boolean.FALSE;
        }
        if (type == int.class) {
            return Integer.valueOf(0);
        }
        if (type == long.class) {
            return Long.valueOf(0L);
        }
        if (type == double.class) {
            return Double.valueOf(0d);
        }
        return null;
    }

    // ── Reflective instantiation (mirrors DeckImagesTest's subtype sweep) ───────

    /** The components the generator actually gave a value to, for the sweep guard. */
    private static List<Object> populatedComponentsOf(Object record) throws Exception {
        List<Object> populated = new ArrayList<>();
        for (RecordComponent component : record.getClass().getRecordComponents()) {
            Object value = component.getAccessor().invoke(record);
            boolean empty = value == null
                    || (value instanceof Collection<?> items && items.isEmpty())
                    || (value instanceof Map<?, ?> entries && entries.isEmpty());
            if (!empty) {
                populated.add(value);
            }
        }
        return populated;
    }

    private static Object instantiate(Class<?> type) throws Exception {
        RecordComponent[] components = type.getRecordComponents();
        Class<?>[] parameterTypes = new Class<?>[components.length];
        Object[] arguments = new Object[components.length];
        for (int index = 0; index < components.length; index++) {
            parameterTypes[index] = components[index].getType();
            arguments[index] = valueFor(components[index]);
        }
        Constructor<?> constructor = type.getDeclaredConstructor(parameterTypes);
        constructor.setAccessible(true);
        return constructor.newInstance(arguments);
    }

    private static Object valueFor(RecordComponent component) throws Exception {
        Class<?> type = component.getType();
        if (type == AppImage.class) {
            return storedImage("deck/d1/" + component.getName());
        }
        if (type == String.class) {
            return component.getName();
        }
        if (List.class.isAssignableFrom(type)) {
            Class<?> element = elementType(component);
            if (element == String.class) {
                return List.of(component.getName());
            }
            if (element != null && element.isRecord()) {
                return List.of(instantiate(element));
            }
            return List.of();
        }
        if (Set.class.isAssignableFrom(type)) {
            Class<?> element = elementType(component);
            return element == String.class
                    ? new LinkedHashSet<>(List.of(component.getName()))
                    : Set.of();
        }
        if (Map.class.isAssignableFrom(type)) {
            return mapValue(component);
        }
        if (type.isRecord()) {
            return instantiate(type);
        }
        if (type.isEnum()) {
            return type.getEnumConstants()[0];
        }
        if (type == boolean.class || type == Boolean.class) {
            return Boolean.TRUE;
        }
        if (type == int.class || type == Integer.class) {
            return Integer.valueOf(3);
        }
        if (type == double.class || type == Double.class) {
            return Double.valueOf(0.25d);
        }
        if (type == BigDecimal.class) {
            return new BigDecimal("1.5");
        }
        return null;
    }

    /** A one-entry map whose value matches the component's declared value type. */
    private static Object mapValue(RecordComponent component) throws Exception {
        Class<?> valueType = typeArgument(component, 1);
        Object value;
        if (valueType == String.class) {
            value = "0,0";
        } else if (valueType == Integer.class) {
            value = Integer.valueOf(3);
        } else if (valueType == Double.class) {
            value = Double.valueOf(0.25d);
        } else if (valueType != null && valueType.isRecord()) {
            value = instantiate(valueType);
        } else {
            return Map.of();
        }
        return Map.of(component.getName(), value);
    }

    private static Class<?> elementType(RecordComponent component) {
        return typeArgument(component, 0);
    }

    private static Class<?> typeArgument(RecordComponent component, int index) {
        if (component.getGenericType() instanceof ParameterizedType parameterized
                && parameterized.getActualTypeArguments().length > index
                && parameterized.getActualTypeArguments()[index] instanceof Class<?> argument) {
            return argument;
        }
        return null;
    }
}
