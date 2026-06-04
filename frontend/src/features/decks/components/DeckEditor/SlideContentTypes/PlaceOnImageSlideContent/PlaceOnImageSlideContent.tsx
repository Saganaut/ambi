/**
 * Author surface for a "place on image" question.
 *
 * Players tap the image; correct iff distance to (correctX, correctY) ≤
 * tolerance. All three coords are normalised 0–1. The editor exposes:
 *   - Prompt
 *   - Backing image picker (URL or gallery)
 *   - Visual `PlaceOnImageTargetPicker` (click on the image to set
 *     correctX/correctY; the ring shows tolerance)
 *   - Numeric inputs for fine-tuning (X/Y/tolerance)
 */

const PlaceOnImageSlideContent = () => {
  return <div>not implemented</div>;
};

//   const {
//     question: element,
//     schedule,
//     flush,
//     commit,
//     syncedFromId,
//     markSynced,
//   } = usePlaceOnImageEditor();

//   const [prompt, setPrompt] = useState(element?.prompt ?? "");
//   const [pasteUrl, setPasteUrl] = useState(() =>
//     pasteUrlOf(element?.targetImage),
//   );
//   const [correctX, setCorrectX] = useState<number>(element?.correctX ?? 0.5);
//   const [correctY, setCorrectY] = useState<number>(element?.correctY ?? 0.5);
//   const [tolerance, setTolerance] = useState<number>(element?.tolerance ?? 0.1);

//   if (element && syncedFromId !== element.id) {
//     markSynced(element.id);
//     setPrompt(element.prompt ?? "");
//     setPasteUrl(pasteUrlOf(element.targetImage));
//     setCorrectX(element.correctX ?? 0.5);
//     setCorrectY(element.correctY ?? 0.5);
//     setTolerance(element.tolerance ?? 0.1);
//   }

//   if (!element) return <EmptySelect title='Place on image' />;

//   const idBase = element.id ?? "";

//   const previewUrl =
//     displayUrl(element.targetImage, idBase || "place", 640, 360) ?? "";

//   const coordsBadge = (
//     <span className={styles.coordsBadge}>
//       ({correctX.toFixed(2)}, {correctY.toFixed(2)}) · ±{tolerance.toFixed(2)}
//     </span>
//   );

//   return (
//     <Container name='PlaceOnImageSlideEditor'>
//       <SlideContentWrapper>
//         <PromptField
//           idBase={`place-${idBase}`}
//           value={prompt}
//           placeholder='Tap the spot where…'
//           onChange={(html) => {
//             setPrompt(html);
//             schedule({ prompt: html });
//           }}
//           onBlur={flush}
//         />

//         <SettingsCard title='Target image'>
//           <ImageBackingEditor
//             idBase={`place-${idBase}`}
//             previewUrl={previewUrl}
//             pasteUrl={pasteUrl}
//             urlLabel='Image URL'
//             emptyPlaceholderAlt='No target image yet'
//             onUrlChange={(next, image) => {
//               setPasteUrl(next);
//               schedule({ targetImage: image });
//             }}
//             onBeforePick={flush}
//             onGalleryPick={(image) => {
//               setPasteUrl("");
//               commit({ targetImage: image });
//             }}
//             onUrlBlur={flush}
//           />
//         </SettingsCard>

//         <SettingsCard title='Target point' action={coordsBadge}>
//           <PlaceOnImageTargetPicker
//             imageUrl={previewUrl}
//             correctX={correctX}
//             correctY={correctY}
//             tolerance={tolerance}
//             onPick={({ x, y }) => {
//               setCorrectX(x);
//               setCorrectY(y);
//               commit({ correctX: x, correctY: y });
//             }}
//           />
//           <SettingsRow>
//             <NumberInput
//               label='Correct X (0–1)'
//               id={`place-x-${idBase}`}
//               min={0}
//               max={1}
//               step={0.01}
//               value={correctX}
//               onChange={(next) => {
//                 setCorrectX(next);
//                 schedule({ correctX: next });
//               }}
//               onBlur={flush}
//             />
//             <NumberInput
//               label='Correct Y (0–1)'
//               id={`place-y-${idBase}`}
//               min={0}
//               max={1}
//               step={0.01}
//               value={correctY}
//               onChange={(next) => {
//                 setCorrectY(next);
//                 schedule({ correctY: next });
//               }}
//               onBlur={flush}
//             />
//             <NumberInput
//               label='Tolerance (0–1)'
//               id={`place-tol-${idBase}`}
//               min={0}
//               max={1}
//               step={0.01}
//               value={tolerance}
//               onChange={(next) => {
//                 setTolerance(next);
//                 schedule({ tolerance: next });
//               }}
//               onBlur={flush}
//             />
//           </SettingsRow>
//         </SettingsCard>
//       </SlideContentWrapper>
//     </Container>
//   );
// };

export { PlaceOnImageSlideContent };
