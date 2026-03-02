// ── Entry ──

export interface ChangelogEntry {
  id: string;
  title: string;
  date: string;
  draft?: boolean;
  git: {
    branch: string;
    commitHash: string;
    baseRef: string;
    prNumber?: number;
  };
  previousEntryId?: string;
  sections: Section[];
}

// ── Sections ──

export type Section =
  | KPIBarSection
  | HeatmapSection
  | FileListSection
  | ProseSection
  | MermaidSection
  | TestSuiteSection;

export interface KPIBarSection {
  type: "kpi-bar";
  title?: string;
  cards: KPICard[];
}

export interface KPICard {
  label: string;
  value: number | string;
  delta?: number | string;
  trend?: "up" | "down" | "neutral";
}

export interface HeatmapSection {
  type: "heatmap";
  title?: string;
  root: HeatmapNode;
}

export interface HeatmapNode {
  name: string;
  changes: number;
  children?: HeatmapNode[];
}

export interface FileListSection {
  type: "file-list";
  title?: string;
  files: FileChange[];
}

export interface FileChange {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed" | "untracked";
  linesAdded?: number;
  linesRemoved?: number;
  reason?: string;
}

export interface ProseSection {
  type: "prose";
  title?: string;
  content: string;
}

export interface MermaidSection {
  type: "mermaid";
  title?: string;
  definition: string;
  caption?: string;
}

export interface TestSuiteSection {
  type: "test-suite";
  title: string;
  runner?: string;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  /** Duration in seconds */
  duration?: number;
  delta?: {
    passed?: number;
    failed?: number;
    skipped?: number;
    total?: number;
    newTests?: number;
  };
}
