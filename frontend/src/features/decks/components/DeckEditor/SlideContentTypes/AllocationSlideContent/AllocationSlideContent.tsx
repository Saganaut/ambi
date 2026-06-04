/**
 * Author surface for an Allocation survey.
 *
 * Players split a fixed pool of points across N labelled options to express
 * weighted preferences. Survey-only — never scored. We expose the prompt,
 * the option list, and the pool/validation knobs. A live "pool badge" sits
 * next to the Pool card header so authors can see the configured total at a
 * glance while editing.
 *
 * Per-option editing lives on `AllocationOptionEditable`, which owns its own
 * commit pipeline via `useAllocationOptionEditor`. This file owns only the
 * question-level fields (prompt, pool, validation) and the structural
 * add/remove ops, both routed through `useAllocationEditor`.
 */
import { useState } from "react";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import { Checkbox } from "@components/Forms/Input/Checkbox/Checkbox";
import { Container } from "@components/Containers/Container";
import { SlideContentWrapper } from "../SlideContentWrapper";
import { useAllocationEditor } from "../useElementEditor";
import {
  EmptySelect,
  ItemList,
  PromptField,
  SectionHeader,
  SettingsCard,
  SettingsRow,
} from "../_shared";
import { AllocationOptionEditable } from "./AllocationOptionEditable";
import styles from "./AllocationSlideContent.module.css";

const AllocationSlideContent = () => {
  return <div>not implemented</div>;
};

//   const {
//     question: element,
//     schedule,
//     flush,
//     syncedFromId,
//     markSynced,
//     items,
//     canAdd,
//     addItem,
//   } = useAllocationEditor();

//   const [prompt, setPrompt] = useState(element?.prompt ?? "");
//   const [totalPoints, setTotalPoints] = useState<number>(
//     element?.totalPointsToDistribute ?? 100,
//   );
//   const [allowZero, setAllowZero] = useState<boolean>(
//     element?.allowZeroOnItem ?? true,
//   );
//   const [enforceTotal, setEnforceTotal] = useState<boolean>(
//     element?.enforceExactTotal ?? true,
//   );

//   if (element && syncedFromId !== element.id) {
//     markSynced(element.id);
//     setPrompt(element.prompt ?? "");
//     setTotalPoints(element.totalPointsToDistribute ?? 100);
//     setAllowZero(element.allowZeroOnItem ?? true);
//     setEnforceTotal(element.enforceExactTotal ?? true);
//   }

//   if (!element) return <EmptySelect title='Allocation' />;

//   const idBase = element.id ?? "";

//   const poolBadge = (
//     <span className={styles.poolBadge}>
//       <strong>{totalPoints}</strong> pts across {items.length} options
//     </span>
//   );

//   return (
//     <Container name='AllocationSlideEditor'>
//       <SlideContentWrapper>
//         <PromptField
//           idBase={`alloc-${idBase}`}
//           value={prompt}
//           placeholder='How would you split your budget?'
//           onChange={(html) => {
//             setPrompt(html);
//             schedule({ prompt: html });
//           }}
//           onBlur={flush}
//         />

//         <SettingsCard title='Pool' action={poolBadge}>
//           <SettingsRow>
//             <NumberInput
//               label='Total points'
//               id={`alloc-total-${idBase}`}
//               min={1}
//               value={totalPoints}
//               onChange={(next) => {
//                 setTotalPoints(next);
//                 schedule({ totalPointsToDistribute: next });
//               }}
//               onBlur={flush}
//             />
//             <Checkbox
//               label='Allow 0 on an option'
//               id={`alloc-zero-${idBase}`}
//               checked={allowZero}
//               onChange={(e) => {
//                 const next = e.target.checked;
//                 setAllowZero(next);
//                 schedule({ allowZeroOnItem: next });
//               }}
//             />
//             <Checkbox
//               label='Submissions must sum to total'
//               id={`alloc-exact-${idBase}`}
//               checked={enforceTotal}
//               onChange={(e) => {
//                 const next = e.target.checked;
//                 setEnforceTotal(next);
//                 schedule({ enforceExactTotal: next });
//               }}
//             />
//           </SettingsRow>
//         </SettingsCard>

//         <SectionHeader label='Options' />

//         <ItemList addLabel='Add option' canAdd={canAdd} onAdd={addItem}>
//           {items.map((option, idx) =>
//             option.id ? (
//               <AllocationOptionEditable
//                 key={option.id}
//                 optionId={option.id}
//                 sortIndex={idx}
//               />
//             ) : null,
//           )}
//         </ItemList>
//       </SlideContentWrapper>
//     </Container>
//   );
// };

export { AllocationSlideContent };
