/**
 * Author surface for a Grid question.
 *
 * Players see an N×M grid overlaid on a backing image and tap one or more
 * cells. The editor exposes:
 *   - prompt
 *   - Grid card with rows/cols/multi-correct
 *   - Backing image picker (URL or gallery)
 *   - Visual `GridCellPicker` overlay where the author clicks cells to mark
 *     them correct. Replaces the old comma-separated index input.
 */
import { useState } from "react";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import { Checkbox } from "@components/Forms/Input/Checkbox/Checkbox";
import { Container } from "@components/Containers/Container";
import { SlideContentWrapper } from "../SlideContentWrapper";
import { useGridQuestionEditor } from "../useElementEditor";
import type { Image } from "@store/AmbiApi";
import { largestUrl, resolveImageUrl } from "@utils/image";
import {
  EmptySelect,
  ImageBackingEditor,
  PromptField,
  SectionHeader,
  SettingsCard,
  SettingsRow,
} from "../_shared";
import { GridCellPicker } from "./GridCellPicker";

const pasteUrlOf = (image: Image | undefined): string =>
  image?.useExternalImg ? (largestUrl(image, "") ?? "") : "";

const GridSlideContent = () => {
  const {
    question: element,
    schedule,
    flush,
    commit,
    syncedFromId,
    markSynced,
  } = useGridQuestionEditor();

  const [prompt, setPrompt] = useState(element?.prompt ?? "");
  const [rows, setRows] = useState<number>(element?.rows ?? 3);
  const [cols, setCols] = useState<number>(element?.cols ?? 3);
  const [pasteUrl, setPasteUrl] = useState<string>(() =>
    pasteUrlOf(element?.cells?.backingImage),
  );
  const [correctCells, setCorrectCells] = useState<number[]>(
    element?.correctCellIndexes ?? [],
  );
  const [multipleCorrect, setMultipleCorrect] = useState<boolean>(
    element?.multipleCorrect ?? false,
  );

  if (element && syncedFromId !== element.id) {
    markSynced(element.id);
    setPrompt(element.prompt ?? "");
    setRows(element.rows ?? 3);
    setCols(element.cols ?? 3);
    setPasteUrl(pasteUrlOf(element.cells?.backingImage));
    setCorrectCells(element.correctCellIndexes ?? []);
    setMultipleCorrect(element.multipleCorrect ?? false);
  }

  if (!element) return <EmptySelect title='Grid' />;

  const idBase = element.id ?? "";

  const previewUrl =
    resolveImageUrl(
      element.cells?.backingImage,
      "MD",
      idBase || "grid",
      640,
      360,
    ) ?? "";

  return (
    <Container name='GridSlideEditor'>
      <SlideContentWrapper>
        <PromptField
          idBase={`grid-${idBase}`}
          value={prompt}
          onChange={(html) => {
            setPrompt(html);
            schedule({ prompt: html });
          }}
          onBlur={flush}
        />

        <SettingsCard title='Grid'>
          <SettingsRow>
            <NumberInput
              label='Rows'
              id={`grid-rows-${idBase}`}
              min={1}
              value={rows}
              onChange={(next) => {
                const safe = next < 1 ? 1 : next;
                setRows(safe);
                schedule({ rows: safe });
              }}
              onBlur={flush}
            />
            <NumberInput
              label='Cols'
              id={`grid-cols-${idBase}`}
              min={1}
              value={cols}
              onChange={(next) => {
                const safe = next < 1 ? 1 : next;
                setCols(safe);
                schedule({ cols: safe });
              }}
              onBlur={flush}
            />
            <Checkbox
              label='Multiple correct cells'
              id={`grid-multi-${idBase}`}
              checked={multipleCorrect}
              onChange={(e) => {
                const next = e.target.checked;
                setMultipleCorrect(next);
                schedule({ multipleCorrect: next });
              }}
            />
          </SettingsRow>
        </SettingsCard>

        <SettingsCard title='Backing image'>
          <ImageBackingEditor
            idBase={`grid-${idBase}`}
            previewUrl={previewUrl}
            pasteUrl={pasteUrl}
            urlLabel='Image URL'
            emptyPlaceholderAlt='No backing image yet'
            onUrlChange={(next, image) => {
              setPasteUrl(next);
              schedule({
                cells: { ...element.cells, backingImage: image },
              });
            }}
            onBeforePick={flush}
            onGalleryPick={(image) => {
              setPasteUrl("");
              commit({
                cells: { ...element.cells, backingImage: image },
              });
            }}
            onUrlBlur={flush}
          />
        </SettingsCard>

        <SectionHeader
          label='Correct cells'
          hint='click a cell on the overlay to toggle'
        />
        <GridCellPicker
          rows={rows}
          cols={cols}
          backingImageUrl={previewUrl}
          selected={correctCells}
          multipleCorrect={multipleCorrect}
          onChange={(next) => {
            setCorrectCells(next);
            commit({ correctCellIndexes: next });
          }}
        />
      </SlideContentWrapper>
    </Container>
  );
};

export { GridSlideContent };
