package com.cephadex.ambi.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;

import org.bson.Document;
import org.junit.jupiter.api.Test;

/**
 * Covers the document-level transform behind
 * {@link PlaceOnImageContentMigration}: a legacy {@code correctTargets} list
 * becomes an {@code items} bank plus a {@code correctPositions} answer key and a
 * single slide {@code tolerance}; targets with no id are given one so the key
 * can name them; targets with no coordinates stay unkeyed; the radius fallback;
 * and the two properties the runner leans on — a second pass is a no-op, and a
 * slide with no legacy content is left exactly as it was.
 *
 * <p>Pure transform tests over hand-built {@link Document}s — no Spring context
 * and no database.
 */
class PlaceOnImageContentMigrationTest {

    @Test
    void legacyTargetBecomesAnItemAndAKeyedPosition() {
        Document image = new Document("external", false).append("src_key", "gallery/heart");
        Document content = content(
                target("heart", "Heart", image, "oklch(0.65 0.40 290)", 0.25, 0.75, 0.15));

        assertThat(PlaceOnImageContentMigration.migrateContent(content)).isTrue();

        assertThat(content).doesNotContainKey("correctTargets");
        assertThat(items(content)).singleElement().satisfies(item -> {
            assertThat(item.get("_id")).isEqualTo("heart");
            assertThat(item.get("label")).isEqualTo("Heart");
            assertThat(item.get("image")).isEqualTo(image);
            assertThat(item.get("color")).isEqualTo("oklch(0.65 0.40 290)");
            assertThat(item).doesNotContainKey("x").doesNotContainKey("y")
                    .doesNotContainKey("radius");
        });
        assertThat(positions(content).get("heart"))
                .isEqualTo(new Document("x", 0.25).append("y", 0.75));
        assertThat(content.get("tolerance")).isEqualTo(0.15);
        // Untouched fields survive the rewrite.
        assertThat(content.get("scoreMode")).isEqualTo("INSIDE_RADIUS");
    }

    @Test
    void idlessTargetIsGivenAnEightCharacterIdThatKeysItsPosition() {
        Document content = content(target(null, "Lungs", null, null, 0.5, 0.5, 0.1));

        PlaceOnImageContentMigration.migrateContent(content);

        Object minted = items(content).get(0).get("_id");
        assertThat(minted).isInstanceOf(String.class);
        assertThat((String) minted).hasSize(8);
        assertThat(positions(content)).containsOnlyKeys((String) minted);
    }

    @Test
    void targetWithoutCoordinatesBecomesAnUnkeyedItem() {
        Document content = content(
                target("keyed", "Keyed", null, null, 0.2, 0.4, 0.1),
                target("unkeyed", "Unkeyed", null, null, null, null, 0.1));

        PlaceOnImageContentMigration.migrateContent(content);

        assertThat(items(content)).extracting(item -> item.get("_id"))
                .containsExactly("keyed", "unkeyed");
        assertThat(positions(content)).containsOnlyKeys("keyed");
    }

    @Test
    void toleranceTakesTheFirstDeclaredRadiusAndFallsBackWhenNoneDeclareOne() {
        Document declared = content(
                target("a", "A", null, null, 0.1, 0.1, null),
                target("b", "B", null, null, 0.2, 0.2, 0.3));
        Document undeclared = content(target("a", "A", null, null, 0.1, 0.1, null));

        PlaceOnImageContentMigration.migrateContent(declared);
        PlaceOnImageContentMigration.migrateContent(undeclared);

        assertThat(declared.get("tolerance")).isEqualTo(0.3);
        assertThat(undeclared.get("tolerance"))
                .isEqualTo(PlaceOnImageContentMigration.DEFAULT_TOLERANCE);
    }

    @Test
    void secondPassOverAMigratedSlideIsANoOp() {
        Document content = content(target("heart", "Heart", null, null, 0.25, 0.75, 0.15));
        PlaceOnImageContentMigration.migrateContent(content);
        Document migrated = new Document(content);

        assertThat(PlaceOnImageContentMigration.migrateContent(content)).isFalse();
        assertThat(content).isEqualTo(migrated);
    }

    @Test
    void slideWithoutLegacyTargetsIsLeftUntouched() {
        Document mcq = new Document("_class", "com.cephadex.ambi.presentation.slide.content.McqContent")
                .append("options", new ArrayList<>(List.of(new Document("_id", "opt-1"))));
        Document untouched = new Document(mcq);

        assertThat(PlaceOnImageContentMigration.migrateContent(mcq)).isFalse();
        assertThat(mcq).isEqualTo(untouched);
    }

    @Test
    void migrateSlidesRewritesOnlyTheLegacySlidesInAnArray() {
        Document legacy = new Document("_id", "slide-1")
                .append("content", content(target("heart", "Heart", null, null, 0.25, 0.75, 0.1)));
        Document modern = new Document("_id", "slide-2")
                .append("content", new Document("items", new ArrayList<Document>()));

        assertThat(PlaceOnImageContentMigration.migrateSlides(List.of(legacy, modern))).isEqualTo(1);
        assertThat(PlaceOnImageContentMigration.migrateSlides(List.of(legacy, modern))).isZero();
    }

    @Test
    void migrateSlidesToleratesAMissingSlidesArray() {
        assertThat(PlaceOnImageContentMigration.migrateSlides(null)).isZero();
        assertThat(PlaceOnImageContentMigration.migrateSlides("not-a-list")).isZero();
    }

    // ── helpers ────────────────────────────────────────────────────────────────

    private static Document content(Document... targets) {
        return new Document("image", new Document("external", true))
                .append("correctTargets", new ArrayList<>(List.of(targets)))
                .append("scoreMode", "INSIDE_RADIUS")
                .append("_class", "com.cephadex.ambi.presentation.slide.content.PlaceOnImageContent");
    }

    private static Document target(String id, String label, Document image, String color,
            Double x, Double y, Double radius) {
        Document target = new Document();
        putIfPresent(target, "_id", id);
        putIfPresent(target, "label", label);
        putIfPresent(target, "image", image);
        putIfPresent(target, "color", color);
        putIfPresent(target, "x", x);
        putIfPresent(target, "y", y);
        putIfPresent(target, "radius", radius);
        return target;
    }

    private static void putIfPresent(Document target, String field, Object value) {
        if (value != null) {
            target.put(field, value);
        }
    }

    @SuppressWarnings("unchecked")
    private static List<Document> items(Document content) {
        return (List<Document>) content.get("items");
    }

    private static Document positions(Document content) {
        return (Document) content.get("correctPositions");
    }
}
