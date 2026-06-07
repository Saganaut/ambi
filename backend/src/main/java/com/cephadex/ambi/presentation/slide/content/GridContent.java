package com.cephadex.ambi.presentation.slide.content;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;
import java.util.Map;

import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.GridItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScoreMode;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Drag-into-matrix slide — players drop items into cells of a labeled grid.
 *
 * <p>
 * Runtime answer: {@code Map<String, String>} (itemId →
 * {@code "rowIndex,colIndex"}).
 *
 * @param rowLabels    labels for each row, top → bottom
 * @param colLabels    labels for each column, left → right
 * @param items        the items players drag; displayed in a shuffled bank
 * @param correctCells target cell per item (itemId →
 *                     {@code "rowIndex,colIndex"})
 * @param scoreMode    {@code EXACT} (all correct only) or {@code PARTIAL}
 *                     (per-item points)
 */
public record GridContent(
        @Schema(requiredMode = REQUIRED) List<String> rowLabels,
        @Schema(requiredMode = REQUIRED) List<String> colLabels,
        @Schema(requiredMode = REQUIRED) List<GridItem> items,
        @Schema(requiredMode = REQUIRED) Map<String, String> correctCells,
        @Schema(requiredMode = REQUIRED) ScoreMode scoreMode) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.GRID;
    }
}
