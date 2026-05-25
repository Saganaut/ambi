// Shared type unions for Btn / IconBtn. Two orthogonal axes:
//   - BtnVariant picks the color slot (text + fill + border tokens).
//   - BtnFill picks how that color is rendered: filled (default), filled
//     with a matching border (bordered), or transparent text-only (ghost).
// Any color × any fill is legal — e.g. error+ghost is a red text-only
// destructive control. Each value maps to a nested className in
// Buttons.module.css; see STYLE-RULES.md "Named button + icon-button
// variants" for the catalog and /design-system for live demos.

export type BtnSize = "xs" | "sm" | "md" | "lg";

export type BtnVariant =
  | "primary"
  | "secondary"
  | "brand"
  | "info"
  | "error"
  | "success"
  | "warning"
  | "disabled";

export type BtnFill = "default" | "bordered" | "ghost";

export type BtnShape = "default" | "round" | "pill" | "avatar";
