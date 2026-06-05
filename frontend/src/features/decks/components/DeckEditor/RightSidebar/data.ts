/** Chart types the picker offers. `DEFAULT` (kind's built-in viz) is always
 * implicitly available — selecting none of the four explicit chart types
 * collapses back to it. */
export type ChartType =
  | "BAR_HORIZONTAL"
  | "BAR_VERTICAL"
  | "WORD_CLOUD"
  | "PIE_CHART";
