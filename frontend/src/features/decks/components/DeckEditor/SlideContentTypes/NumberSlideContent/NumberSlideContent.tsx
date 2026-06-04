/**
 * Author surface for a numeric question.
 *
 * Layout:
 *   - Prompt on top.
 *   - "Target" card: correct value + tolerance + decimal places + unit,
 *     fronted by a live preview chip ("42 ±0.5 km") so the author can see
 *     the entire scoring rule at a glance.
 *   - Scoring card with the point value.
 */

const formatTarget = (value: number, decimals: number) =>
  value.toFixed(Math.min(Math.max(decimals, 0), 10));

const NumberSlideContent = () => {
  return <div>not implemented</div>;
};

//   const {
//     question: element,
//     schedule,
//     flush,
//     syncedFromId,
//     markSynced,
//   } = useNumberQuestionEditor();

//   const [prompt, setPrompt] = useState(element?.prompt ?? "");
//   const [correctValue, setCorrectValue] = useState<number>(
//     element?.correctValue ?? 0,
//   );
//   const [tolerance, setTolerance] = useState<number>(element?.tolerance ?? 0);
//   const [unitLabel, setUnitLabel] = useState(element?.unitLabel ?? "");
//   const [decimalPlaces, setDecimalPlaces] = useState<number>(
//     element?.decimalPlaces ?? 0,
//   );
//   const [pointValue, setPointValue] = useState<number>(
//     element?.pointValue ?? 0,
//   );

//   if (element && syncedFromId !== element.id) {
//     markSynced(element.id);
//     setPrompt(element.prompt ?? "");
//     setCorrectValue(element.correctValue ?? 0);
//     setTolerance(element.tolerance ?? 0);
//     setUnitLabel(element.unitLabel ?? "");
//     setDecimalPlaces(element.decimalPlaces ?? 0);
//     setPointValue(element.pointValue ?? 0);
//   }

//   if (!element) return <EmptySelect title='Numeric answer' />;

//   const idBase = element.id ?? "";

//   const previewChip = (
//     <span className={styles.targetPreview}>
//       <span className={styles.targetPreviewValue}>
//         {formatTarget(correctValue, decimalPlaces)}
//       </span>
//       <span className={styles.targetPreviewTolerance}>
//         ±{formatTarget(tolerance, decimalPlaces)}
//       </span>
//       {unitLabel && (
//         <span className={styles.targetPreviewUnit}>{unitLabel}</span>
//       )}
//     </span>
//   );

//   return (
//     <Container name='NumberSlideEditor'>
//       <SlideContentWrapper>
//         <PromptField
//           idBase={`num-${idBase}`}
//           value={prompt}
//           onChange={(html) => {
//             setPrompt(html);
//             schedule({ prompt: html });
//           }}
//           onBlur={flush}
//         />

//         <SettingsCard title='Target' action={previewChip}>
//           <SettingsRow>
//             <NumberInput
//               label='Correct value'
//               id={`num-correct-${idBase}`}
//               value={correctValue}
//               onChange={(next) => {
//                 setCorrectValue(next);
//                 schedule({ correctValue: next });
//               }}
//               onBlur={flush}
//             />
//             <NumberInput
//               label='Tolerance (±)'
//               id={`num-tolerance-${idBase}`}
//               min={0}
//               value={tolerance}
//               onChange={(next) => {
//                 setTolerance(next);
//                 schedule({ tolerance: next });
//               }}
//               onBlur={flush}
//             />
//             <NumberInput
//               label='Decimal places'
//               id={`num-decimals-${idBase}`}
//               min={0}
//               max={10}
//               value={decimalPlaces}
//               onChange={(next) => {
//                 setDecimalPlaces(next);
//                 schedule({ decimalPlaces: next });
//               }}
//               onBlur={flush}
//             />
//             <Input
//               label='Unit label'
//               id={`num-unit-${idBase}`}
//               type='text'
//               value={unitLabel}
//               placeholder='km, $, %'
//               onChange={(e) => {
//                 const next = e.target.value;
//                 setUnitLabel(next);
//                 schedule({ unitLabel: next });
//               }}
//               onBlur={flush}
//             />
//           </SettingsRow>
//         </SettingsCard>

//         <SettingsCard title='Scoring'>
//           <SettingsRow>
//             <NumberInput
//               label='Points'
//               id={`num-points-${idBase}`}
//               min={0}
//               value={pointValue}
//               onChange={(next) => {
//                 setPointValue(next);
//                 schedule({ pointValue: next });
//               }}
//               onBlur={flush}
//             />
//           </SettingsRow>
//         </SettingsCard>
//       </SlideContentWrapper>
//     </Container>
//   );
// };

export { NumberSlideContent };
