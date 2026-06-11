package com.cephadex.ambi.config;

import java.lang.reflect.RecordComponent;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

import com.cephadex.ambi.media.enums.ImageSizeOptions;
import io.swagger.v3.oas.annotations.media.Schema.RequiredMode;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.media.Discriminator;
import io.swagger.v3.oas.models.media.ObjectSchema;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.media.StringSchema;

/**
 * OpenAPI post-processing that turns Jackson-style polymorphic schemas into a
 * <em>flat</em> discriminated union the RTK Query codegen (oazapfts) can render
 * cleanly.
 *
 * <h2>The problem</h2>
 * A sealed interface annotated with both {@code @JsonTypeInfo}/{@code @JsonSubTypes}
 * (needed for polymorphic <strong>deserialization</strong> of request bodies) and
 * {@code @Schema(oneOf/discriminatorMapping)} makes SpringDoc emit two
 * mutually-referencing schemas:
 *
 * <ul>
 *   <li>the parent → {@code oneOf: [Child]} + {@code discriminator.mapping}
 *       (parent → child), and</li>
 *   <li>each child → {@code allOf: [{$ref Parent}, {…props}]} (child → parent —
 *       swagger's "inheritance" composition, triggered by {@code @JsonTypeInfo}).</li>
 * </ul>
 *
 * The {@code oneOf} ⟷ {@code allOf} loop renders in TypeScript as a circular
 * intersection pair (e.g. {@code McqContent = SlideContent & {…}} and
 * {@code SlideContent = {contentType:"MCQ"} & McqContent}), which is not a usable
 * discriminated union.
 *
 * <h2>The fix</h2>
 * This customizer leaves the Jackson runtime untouched and rewrites only the
 * emitted document: each child becomes a <strong>standalone</strong> object that
 * carries the discriminator property as a {@code const}, and the parent becomes a
 * <strong>pure</strong> {@code oneOf} + {@code discriminator} union. The cycle is
 * broken because children no longer {@code $ref} the parent.
 *
 * <p>It is deliberately generic: it acts on every schema that has a
 * {@code discriminator} with a non-empty {@code mapping}, so any future
 * {@code @JsonTypeInfo}-based union (or a {@code MeResponse}-style response-only
 * union, which it harmlessly no-ops on) is handled with no extra code. The per-type
 * wiring ritual ({@code @JsonSubTypes.Type} + an {@code oneOf}/{@code @DiscriminatorMapping}
 * entry) is unchanged.
 *
 * @see com.cephadex.ambi.presentation.slide.content.SlideContent
 */
@Configuration
public class OpenApiConfig {

    /**
     * Flattens every discriminated-union schema so the generated TypeScript client
     * sees standalone variants + a pure {@code oneOf} parent rather than a circular
     * {@code oneOf}/{@code allOf} pair.
     *
     * @return a SpringDoc customizer applied to the assembled {@link io.swagger.v3.oas.models.OpenAPI}.
     */
    @Bean
    @Order(1)
    @SuppressWarnings({"rawtypes", "unchecked"})
    public OpenApiCustomizer flattenPolymorphicUnions() {
        return openApi -> {
            if (openApi.getComponents() == null || openApi.getComponents().getSchemas() == null) {
                return;
            }
            Map<String, Schema> schemas = openApi.getComponents().getSchemas();

            // Snapshot the parents first; the loop mutates schema entries.
            List<Schema> parents = new ArrayList<>();
            for (Schema schema : schemas.values()) {
                Discriminator discriminator = schema.getDiscriminator();
                if (discriminator != null && discriminator.getMapping() != null
                        && !discriminator.getMapping().isEmpty()) {
                    parents.add(schema);
                }
            }

            for (Schema parent : parents) {
                Discriminator discriminator = parent.getDiscriminator();
                String propertyName = discriminator.getPropertyName();

                for (Map.Entry<String, String> entry : discriminator.getMapping().entrySet()) {
                    String discriminatorValue = entry.getKey();      // e.g. "MCQ"
                    String childName = refName(entry.getValue());     // e.g. "McqContent"
                    Schema child = schemas.get(childName);
                    if (child == null) {
                        continue;
                    }
                    schemas.put(childName, flattenChild(child, propertyName, discriminatorValue));
                }

                // Make the parent a pure `oneOf` + `discriminator` union: drop the
                // bare-`contentType` object body so oazapfts emits only the union.
                parent.setProperties(null);
                parent.setRequired(null);
                parent.setType(null);
                parent.setTypes(null);
            }
        };
    }

    /**
     * Collapses a child schema of the form {@code allOf: [{$ref Parent}, {…props}]}
     * into a standalone object schema, dropping the parent reference and adding the
     * discriminator property as a single-value {@code enum} (a {@code const}).
     */
    @SuppressWarnings({"rawtypes", "unchecked"})
    private Schema flattenChild(Schema child, String propertyName, String discriminatorValue) {
        List<Schema> allOf = child.getAllOf();
        if (allOf == null || allOf.isEmpty()) {
            // Already a standalone schema (e.g. a response-only union whose
            // variants carry their own discriminator property as a real field) —
            // there is no parent `$ref` to strip, so leave it untouched.
            return child;
        }
        Schema base = null;
        for (Schema member : allOf) {
            if (member.get$ref() == null) {
                base = member; // the inline {type:object, properties:…} body
                break;
            }
        }
        if (base == null) {
            base = new ObjectSchema();
        }
        base.setType("object");

        StringSchema discriminatorProp = new StringSchema();
        discriminatorProp.addEnumItem(discriminatorValue);
        base.addProperty(propertyName, discriminatorProp);
        base.addRequiredItem(propertyName);
        return base;
    }

    /** Extracts the schema name from a {@code #/components/schemas/Name} ref. */
    private String refName(String ref) {
        return ref.substring(ref.lastIndexOf('/') + 1);
    }

    /**
     * Injects enums that are used only as {@code Map} keys (which SpringDoc does not
     * resolve automatically) into {@code components.schemas} so the frontend codegen
     * can lift them into typed TypeScript constants.
     */
    @Bean
    @Order(2)
    @SuppressWarnings({"rawtypes", "unchecked"})
    public OpenApiCustomizer exposeMapKeyEnums() {
        return openApi -> {
            if (openApi.getComponents() == null) {
                openApi.setComponents(new Components());
            }
            StringSchema imageSizeOptions = new StringSchema();
            for (ImageSizeOptions v : ImageSizeOptions.values()) {
                imageSizeOptions.addEnumItem(v.name());
            }
            openApi.getComponents().addSchemas("ImageSizeOptions", imageSizeOptions);
        };
    }

    /**
     * SpringDoc 3.x does not propagate {@code @Schema(requiredMode = REQUIRED)} from
     * Java record component annotations into the OpenAPI {@code required} array.
     * This customizer reads record components directly via reflection and populates
     * the array after the main schema pass completes.
     *
     * <p>Runs after {@link #flattenPolymorphicUnions()} ({@code @Order(1)}) so the
     * schemas are already flat when required fields are injected.
     */
    @Bean
    @Order(3)
    public OpenApiCustomizer markRecordComponentsRequired() {
        return openApi -> {
            if (openApi.getComponents() == null || openApi.getComponents().getSchemas() == null) {
                return;
            }
            openApi.getComponents().getSchemas().forEach((name, schema) -> {
                Class<?> clazz = tryLoadRecordClass(name);
                if (clazz == null) {
                    return;
                }
                for (RecordComponent component : clazz.getRecordComponents()) {
                    if (isRequiredComponent(component)) {
                        schema.addRequiredItem(component.getName());
                    }
                }
            });
        };
    }

    private static final List<String> RECORD_SCAN_PACKAGES = List.of(
            "com.cephadex.ambi.presentation.slide.content",
            "com.cephadex.ambi.presentation.deck",
            "com.cephadex.ambi.presentation.slide"
    );

    private Class<?> tryLoadRecordClass(String simpleName) {
        for (String pkg : RECORD_SCAN_PACKAGES) {
            try {
                Class<?> c = Class.forName(pkg + "." + simpleName);
                if (c.isRecord()) {
                    return c;
                }
            } catch (ClassNotFoundException ignored) {
            }
        }
        return null;
    }

    private boolean isRequiredComponent(RecordComponent component) {
        if (component.getType().isPrimitive()) {
            return true;
        }
        // @Schema's @Target does not include RECORD_COMPONENT, so annotations placed on
        // record components are not visible via RecordComponent.getAnnotation(). They ARE
        // propagated to the synthesized accessor method, which is where we read them.
        io.swagger.v3.oas.annotations.media.Schema ann =
                component.getAccessor().getAnnotation(io.swagger.v3.oas.annotations.media.Schema.class);
        return ann != null && ann.requiredMode() == RequiredMode.REQUIRED;
    }
}
