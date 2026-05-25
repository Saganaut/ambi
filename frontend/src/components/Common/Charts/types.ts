// Shared datum shape consumed by every chart in /Charts. Charts that need
// per-slice colour or correctness highlighting layer that on top of these
// three primitives so the same aggregated payload can fan out to bar/pie/
// word-cloud renderers without per-chart adapters at the call site.
export interface ChartDatum {
  label: string;
  value: number;
  highlight?: boolean;
}
