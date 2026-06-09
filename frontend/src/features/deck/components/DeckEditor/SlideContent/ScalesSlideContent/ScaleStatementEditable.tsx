// /**
//  * Single-row editor for a Scales statement. Owns its own debounce timer via
//  * `useScalesStatementEditor`. Per-statement `correctRating` is still TODO —
//  * for now this is a plain text input row.
//  */
// import { useState } from "react";
// import { Input } from "@components/Forms/Input/Input/Input";
// import { ItemCard } from "../_shared";

// interface ScaleStatementEditableProps {
//   statementId: string;
//   sortIndex: number;
// }

// const ScaleStatementEditable = ({
//   statementId,
//   sortIndex,
// }: ScaleStatementEditableProps) => {
//   const {
//     statement,
//     schedule,
//     flush,
//     canRemove,
//     remove,
//     syncedFromId,
//     markSynced,
//   } = useScalesStatementEditor(statementId);

//   const [text, setText] = useState(statement?.text ?? "");

//   if (statement && syncedFromId !== statement.id) {
//     markSynced(statement.id);
//     setText(statement.text ?? "");
//   }

//   if (!statement) return null;

//   const displayIndex = sortIndex + 1;

//   return (
//     <ItemCard
//       index={sortIndex}
//       removeLabel={`Remove statement ${displayIndex.toString()}`}
//       removeDisabled={!canRemove}
//       onRemove={remove}>
//       <Input
//         type='text'
//         fullWidth
//         value={text}
//         placeholder={`Statement ${displayIndex.toString()}`}
//         onChange={(e) => {
//           const next = e.target.value;
//           setText(next);
//           schedule({ ...statement, text: next });
//         }}
//         onBlur={flush}
//       />
//     </ItemCard>
//   );
// };

// export { ScaleStatementEditable };
