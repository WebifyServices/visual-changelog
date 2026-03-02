import type { Section } from "@schema/types";
import { KPIBar } from "./sections/KPIBar";
import { ChangeHeatmap } from "./sections/ChangeHeatmap";
import { FileList } from "./sections/FileList";
import { ProseBlock } from "./sections/ProseBlock";
import { MermaidDiagram } from "./sections/MermaidDiagram";
import { TestSuiteCard } from "./sections/TestSuiteCard";

export type { MermaidDiagramProps } from "./sections/MermaidDiagram";
export { MermaidDiagram } from "./sections/MermaidDiagram";

export function SectionRenderer({ section }: { section: Section }) {
  switch (section.type) {
    case "kpi-bar":     return <KPIBar {...section} />;
    case "heatmap":     return <ChangeHeatmap {...section} />;
    case "file-list":   return <FileList {...section} />;
    case "prose":       return <ProseBlock {...section} />;
    case "mermaid":     return <MermaidDiagram {...section} />;
    case "test-suite":  return <TestSuiteCard {...section} />;
    default:            return null;
  }
}
