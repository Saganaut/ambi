import type { TabsItem } from "./Tabs";

export const sampleTabs: TabsItem[] = [
  { id: "overview", label: "Overview", panel: "Deck overview and summary." },
  { id: "slides", label: "Slides", panel: "The slides that make up this deck." },
  { id: "settings", label: "Settings", panel: "Visibility, tags, and theme." },
  { id: "archived", label: "Archived", panel: "Archived content.", disabled: true },
];
