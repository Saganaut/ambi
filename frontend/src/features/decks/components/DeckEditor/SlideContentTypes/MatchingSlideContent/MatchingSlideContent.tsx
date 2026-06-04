/**
 * Author surface for a Matching question.
 *
 * Each pair is one `MatchingPairEditable` row whose body is a left ↔ right
 * input grid. The runtime shuffles the right column for players; authoring
 * order is the answer key. ALL_OR_NOTHING vs. PARTIAL scoring sits in the
 * Scoring card.
 *
 * Per-pair editing lives on `MatchingPairEditable`. This file owns only the
 * question-level fields (prompt, scoring mode, points) and the structural
 * add/remove ops, both routed through `useMatchingEditor`.
 */
import { useState } from "react";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import { RadioGroup } from "@components/Forms/Input/RadioGroup/RadioGroup";
import { Container } from "@components/Containers/Container";
import { SlideContentWrapper } from "../SlideContentWrapper";
import { useMatchingEditor } from "../useElementEditor";
import type { MatchingQuestion } from "@store/AmbiApi";
import {
  EmptySelect,
  ItemList,
  PromptField,
  SectionHeader,
  SettingsCard,
  SettingsRow,
} from "../_shared";
import { MatchingPairEditable } from "./MatchingPairEditable";

type MatchingScoringMode = NonNullable<MatchingQuestion["scoring"]>;

const MatchingSlideContent = () => {
  return <div>not implemented</div>;
};

//   const {
//     question: element,
//     schedule,
//     commit,
//     flush,
//     syncedFromId,
//     markSynced,
//     items,
//     canAdd,
//     addItem,
//   } = useMatchingEditor();

//   const [prompt, setPrompt] = useState(element?.prompt ?? "");
//   const [scoring, setScoring] = useState<MatchingScoringMode>(
//     element?.scoring ?? "ALL_OR_NOTHING",
//   );
//   const [pointValue, setPointValue] = useState<number>(
//     element?.pointValue ?? 100,
//   );

//   if (element && syncedFromId !== element.id) {
//     markSynced(element.id);
//     setPrompt(element.prompt ?? "");
//     setScoring(element.scoring ?? "ALL_OR_NOTHING");
//     setPointValue(element.pointValue ?? 100);
//   }

//   if (!element) return <EmptySelect title='Matching' />;

//   const idBase = element.id ?? "";

//   return (
//     <Container name='MatchingSlideEditor'>
//       <SlideContentWrapper>
//         <PromptField
//           idBase={`match-${idBase}`}
//           value={prompt}
//           placeholder='Match each river to its continent.'
//           onChange={(html) => {
//             setPrompt(html);
//             schedule({ prompt: html });
//           }}
//           onBlur={flush}
//         />

//         <SettingsCard title='Scoring'>
//           <SettingsRow>
//             <NumberInput
//               label='Points'
//               id={`match-points-${idBase}`}
//               min={0}
//               value={pointValue}
//               onChange={(next) => {
//                 setPointValue(next);
//                 schedule({ pointValue: next });
//               }}
//               onBlur={flush}
//             />
//             <RadioGroup
//               name={`match-scoring-${idBase}`}
//               legend='Credit'
//               options={[
//                 { value: "ALL_OR_NOTHING", label: "All or nothing" },
//                 { value: "PARTIAL", label: "Partial credit" },
//               ]}
//               value={scoring}
//               onChange={(next) => {
//                 const mode = next as MatchingScoringMode;
//                 setScoring(mode);
//                 commit({ scoring: mode });
//               }}
//             />
//           </SettingsRow>
//         </SettingsCard>

//         <SectionHeader
//           label='Pairs'
//           hint='left ↔ right (right column shuffles at game time)'
//         />

//         <ItemList addLabel='Add pair' canAdd={canAdd} onAdd={addItem}>
//           {items.map((pair, idx) =>
//             pair.id ? (
//               <MatchingPairEditable
//                 key={pair.id}
//                 pairId={pair.id}
//                 sortIndex={idx}
//               />
//             ) : null,
//           )}
//         </ItemList>
//       </SlideContentWrapper>
//     </Container>
//   );
// };

export { MatchingSlideContent };
