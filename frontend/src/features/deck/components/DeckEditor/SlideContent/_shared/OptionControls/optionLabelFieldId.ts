/**
 * DOM id of an option's label field (the TextArea in Label.tsx). The menu
 * controller (Menu.tsx) uses it to keep clicks in the field — the menu's
 * trigger — inside its dismissal boundary, so the two must always agree on
 * the id.
 */
const optionLabelFieldId = (optionId: string | undefined) => `mcq-opt-${optionId ?? ""}-text`;

export { optionLabelFieldId };
