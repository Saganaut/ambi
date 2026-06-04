/**
 * Author surface for a Drawing question.
 *
 * Drawing is open-canvas / survey-only. The editor exposes:
 *   - Prompt
 *   - Optional backing image (paste URL or pick from gallery)
 *   - Canvas geometry + per-player caps
 *   - Live palette swatch editor (`PaletteEditor`) — replaces the legacy
 *     comma-separated palette input
 */
import { useState } from "react";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import { Container } from "@components/Containers/Container";
import { SlideContentWrapper } from "../SlideContentWrapper";
import { useDrawingEditor } from "../useElementEditor";
import { displayUrl, largestUrl } from "@utils/image";
import {
  EmptySelect,
  ImageBackingEditor,
  PromptField,
  SettingsCard,
  SettingsRow,
} from "../_shared";
import { PaletteEditor } from "./PaletteEditor";
import styles from "./DrawingSlideContent.module.css";

//TODO: remove any
const pasteUrlOf = (image: any | undefined): string =>
  image?.useExternalImg ? (largestUrl(image, "") ?? "") : "";

const DrawingSlideContent = () => {
  return <div>not implemented</div>;
};

//   const {
//     question: element,
//     schedule,
//     flush,
//     commit,
//     syncedFromId,
//     markSynced,
//   } = useDrawingEditor();

//   const [prompt, setPrompt] = useState(element?.prompt ?? "");
//   const [pasteUrl, setPasteUrl] = useState(() =>
//     pasteUrlOf(element?.backingImage),
//   );
//   const [canvasWidth, setCanvasWidth] = useState<number>(
//     element?.canvasWidth ?? 1920,
//   );
//   const [canvasHeight, setCanvasHeight] = useState<number>(
//     element?.canvasHeight ?? 1080,
//   );
//   const [maxStrokes, setMaxStrokes] = useState<number>(
//     element?.maxStrokesPerPlayer ?? 200,
//   );
//   const [maxPoints, setMaxPoints] = useState<number>(
//     element?.maxPointsPerStroke ?? 500,
//   );
//   const [palette, setPalette] = useState<string[]>(element?.palette ?? []);

//   if (element && syncedFromId !== element.id) {
//     markSynced(element.id);
//     setPrompt(element.prompt ?? "");
//     setPasteUrl(pasteUrlOf(element.backingImage));
//     setCanvasWidth(element.canvasWidth ?? 1920);
//     setCanvasHeight(element.canvasHeight ?? 1080);
//     setMaxStrokes(element.maxStrokesPerPlayer ?? 200);
//     setMaxPoints(element.maxPointsPerStroke ?? 500);
//     setPalette(element.palette ?? []);
//   }

//   if (!element) return <EmptySelect title='Drawing' />;

//   const idBase = element.id ?? "";

//   const previewUrl =
//     displayUrl(element.backingImage, idBase || "draw", 640, 360) ?? "";

//   const dimsBadge = (
//     <span className={styles.canvasDims}>
//       {canvasWidth}×{canvasHeight}
//     </span>
//   );

//   return (
//     <Container name='DrawingSlideEditor'>
//       <SlideContentWrapper>
//         <PromptField
//           idBase={`draw-${idBase}`}
//           value={prompt}
//           placeholder='Sketch your team logo'
//           onChange={(html) => {
//             setPrompt(html);
//             schedule({ prompt: html });
//           }}
//           onBlur={flush}
//         />

//         <SettingsCard title='Backing image'>
//           <ImageBackingEditor
//             idBase={`draw-${idBase}`}
//             previewUrl={previewUrl}
//             pasteUrl={pasteUrl}
//             urlLabel='Backing image URL (optional)'
//             emptyPlaceholderAlt='Blank canvas'
//             onUrlChange={(next, image) => {
//               setPasteUrl(next);
//               schedule({ backingImage: image });
//             }}
//             onBeforePick={flush}
//             onGalleryPick={(image) => {
//               setPasteUrl("");
//               commit({ backingImage: image });
//             }}
//             onUrlBlur={flush}
//           />
//         </SettingsCard>

//         <SettingsCard title='Canvas' action={dimsBadge}>
//           <SettingsRow>
//             <NumberInput
//               label='Width (logical units)'
//               id={`draw-w-${idBase}`}
//               min={1}
//               value={canvasWidth}
//               onChange={(next) => {
//                 setCanvasWidth(next);
//                 schedule({ canvasWidth: next });
//               }}
//               onBlur={flush}
//             />
//             <NumberInput
//               label='Height (logical units)'
//               id={`draw-h-${idBase}`}
//               min={1}
//               value={canvasHeight}
//               onChange={(next) => {
//                 setCanvasHeight(next);
//                 schedule({ canvasHeight: next });
//               }}
//               onBlur={flush}
//             />
//           </SettingsRow>
//         </SettingsCard>

//         <SettingsCard title='Limits'>
//           <SettingsRow>
//             <NumberInput
//               label='Max strokes per player'
//               id={`draw-max-strokes-${idBase}`}
//               min={1}
//               value={maxStrokes}
//               onChange={(next) => {
//                 setMaxStrokes(next);
//                 schedule({ maxStrokesPerPlayer: next });
//               }}
//               onBlur={flush}
//             />
//             <NumberInput
//               label='Max points per stroke'
//               id={`draw-max-points-${idBase}`}
//               min={1}
//               value={maxPoints}
//               onChange={(next) => {
//                 setMaxPoints(next);
//                 schedule({ maxPointsPerStroke: next });
//               }}
//               onBlur={flush}
//             />
//           </SettingsRow>
//         </SettingsCard>

//         <SettingsCard title='Palette'>
//           <PaletteEditor
//             palette={palette}
//             onChange={(next) => {
//               setPalette(next);
//               schedule({ palette: next });
//             }}
//             onCommit={(next) => {
//               setPalette(next);
//               commit({ palette: next });
//             }}
//           />
//         </SettingsCard>
//       </SlideContentWrapper>
//     </Container>
//   );
// };

export { DrawingSlideContent };
