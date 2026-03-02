# Visual Changelog v2 — Product Requirements Document

## 1. What It Is

A Claude Code skill that generates a structured JSON snapshot of a PR's changes, and a React viewer that renders those snapshots into a consistent, browsable visual changelog.

**One PR = one entry.** The skill runs bash commands to gather git/test data, Claude structures it as JSON, the viewer renders it. Every entry has the same fixed layout — what sections appear depends on what data the skill found in the repo.

## 2. Architecture

```
Claude Code session
│  /changelog  (or pre-PR hook)
│  ├─ git diff --stat, git diff --name-status, git log, etc.
│  ├─ detect & run test suites (if any exist)
│  ├─ read previous entry (if exists) for deltas
│  └─ write JSON → visual-changelog/entries/{id}.json
│
visual-changelog/
├── entries/           ← JSON files (one per PR)
│   ├── manifest.json  ← array of filenames
│   └── 42-auth-refactor.json
└── viewer/            ← Vite + React + TS + ChakraUI v3
    └── src/
        ├── components/  ← 6 section components + layout
        ├── pages/       ← Timeline + Detail
        └── schema/      ← Types + Zod validation
```

## 3. JSON Schema

### Entry Envelope

```typescript
interface ChangelogEntry {
  id: string;                    // matches filename sans .json
  title: string;                 // PR title or branch description
  date: string;                  // ISO 8601
  git: {
    branch: string;
    commitHash: string;          // HEAD at time of generation
    baseRef: string;             // e.g. "main"
    prNumber?: number;
  };
  previousEntryId?: string;      // for delta calculations
  sections: Section[];           // ordered, rendered top to bottom
}
```

### Section Types (6 total)

```typescript
type Section =
  | KPIBarSection
  | HeatmapSection
  | FileListSection
  | ProseSection
  | MermaidSection
  | TestSuiteSection;
```

#### kpi-bar

Always present. Git-level metrics.

```typescript
interface KPIBarSection {
  type: "kpi-bar";
  title?: string;
  cards: {
    label: string;             // "Lines Added", "Files Changed"
    value: number | string;
    delta?: number | string;   // vs previous entry, e.g. "+12" or "-3"
    trend?: "up" | "down" | "neutral";
  }[];
}
```

#### heatmap

Always present (git diff always works). Directory treemap colored by change volume.

```typescript
interface HeatmapSection {
  type: "heatmap";
  title?: string;
  root: HeatmapNode;
}

interface HeatmapNode {
  name: string;                // directory or file name
  changes: number;             // lines changed in this node
  children?: HeatmapNode[];   // subdirs/files (leaf = file)
}
```

#### file-list

Always present. Every changed file with status and line counts.

```typescript
interface FileListSection {
  type: "file-list";
  title?: string;
  files: {
    path: string;
    status: "added" | "modified" | "deleted" | "renamed";
    linesAdded?: number;
    linesRemoved?: number;
  }[];
}
```

#### prose

Always present. AI-generated summary of the PR.

```typescript
interface ProseSection {
  type: "prose";
  title?: string;
  content: string;             // Markdown, 1-2 paragraphs
}
```

#### mermaid

Optional. Architecture or flow diagram when changes warrant it.

```typescript
interface MermaidSection {
  type: "mermaid";
  title?: string;
  definition: string;          // raw Mermaid syntax
  caption?: string;
}
```

#### test-suite

Optional, zero or more. One per discovered test suite.

```typescript
interface TestSuiteSection {
  type: "test-suite";
  title: string;               // "Unit Tests", "Integration Tests", "E2E Tests"
  runner?: string;             // "jest", "pytest", "vitest", etc.
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  duration?: number;           // seconds
  delta?: {                    // vs previous entry's matching suite
    passed?: number;           // e.g. +3 (3 more passing)
    failed?: number;           // e.g. -2 (2 fewer failing)
    skipped?: number;
    total?: number;
    newTests?: number;         // tests that didn't exist before
  };
}
```

## 4. Viewer

### Tech Stack

Vite + React 19 + TypeScript + ChakraUI v3. Hash-based routing (no library). MermaidJS via npm.

### Pages

**Timeline** (`#/` or `#/timeline`)

- Lists all entries newest-first as cards
- Each card: title, date, branch, PR number, 2-3 top-line KPIs inline
- Search by title, filter by date range
- Click → detail

**Detail** (`#/entry/:id`)

- Fixed layout, renders `sections` array top to bottom
- Each section type maps to exactly one component
- Sections not present in the entry simply don't render
- Back button to timeline

### Components (6 section + 3 layout = 9 total)

| Component | Section Type | Notes |
|---|---|---|
| `KPIBar` | `kpi-bar` | Horizontal row of metric cards with delta badges |
| `ChangeHeatmap` | `heatmap` | Treemap visualization — nested rectangles sized by `changes`, colored by intensity |
| `FileList` | `file-list` | Table with status badges (green/amber/red), lines +/- |
| `ProseBlock` | `prose` | Markdown renderer (react-markdown + remark-gfm) |
| `MermaidDiagram` | `mermaid` | Mermaid render with zoom controls |
| `TestSuiteCard` | `test-suite` | Pass/fail/skip bar chart, delta indicators |
| `Header` | layout | Title, dark/light toggle, back button |
| `EntryCard` | layout | Timeline card for an entry |
| `SectionRenderer` | dispatch | `switch(section.type)` → component |

### Theme

- ChakraUI v3 color mode: system default + toggle
- Semantic tokens for status colors, heatmap intensity scale, test result colors
- Fonts: one display + one mono (loaded via Google Fonts)

### Heatmap Implementation

CSS-based treemap using flexbox or CSS grid. Each node is a rectangle:

- Size proportional to `changes` count
- Color intensity proportional to `changes` relative to max in the tree
- Hover shows path + exact counts
- Click to expand/collapse directory levels
- No D3 or heavy charting library needed for MVP — pure CSS + recursive React component

## 5. Skill

### SKILL.md

Single skill at `.claude/skills/visual-changelog/SKILL.md`. Invoked as `/changelog` or by pre-PR hook.

**What it does:**

1. Determine base ref (default: `main`) and current branch
2. Run bash commands to gather data:
   - `git diff --stat {base}` → line counts
   - `git diff --name-status {base}` → file statuses
   - `git diff --numstat {base}` → per-file line adds/removes
   - `git log --oneline {base}..HEAD` → commit list
   - Detect test config files (jest.config, pytest.ini, vitest.config, etc.)
   - Run discovered test suites, capture results
3. Read previous entry from `manifest.json` (last item) if exists → compute deltas
4. Build `ChangelogEntry` JSON with appropriate sections
5. Write to `visual-changelog/entries/{id}.json`
6. Update `manifest.json`
7. Tell user to run viewer if not running

**Section decision logic:**

- `kpi-bar` → always (git data always available)
- `heatmap` → always (git diff always works)
- `file-list` → always
- `prose` → always (Claude summarizes the diff)
- `mermaid` → include if changes touch 3+ modules or introduce new architectural components
- `test-suite` → one per discovered suite that has a runnable command

**Continuity rule:** If a previous entry exists, include at minimum the same section types it had (unless the changes explicitly remove that capability, e.g. deleting a test suite). Add new section types if the changes warrant it.

## 6. Hook Integration

PreToolUse hook on `Bash` matching `gh pr create`:

- If no changelog entry exists for current branch → deny, tell Claude to run `/changelog`
- If entry exists → inject PR body link via `additionalContext`

## 7. Setup

- `visual-changelog/viewer/` → `npm install`
- `visual-changelog/entries/manifest.json` → `[]`
- `visual-changelog/run.sh` → thin wrapper for `npm run dev`
- Hook registration in `.claude/settings.json`

## 8. What's NOT in MVP

- Screenshot capture (wkhtmltoimage)
- Before/after comparisons
- Code review cards (good/bad/ugly)
- Decision log
- Risk assessment
- Collapsible nesting
- Static build / GitHub Pages deployment
- Cross-entry trend charts (future: line chart of test counts over time)
- Plugin packaging

These are all future iterations built on top of the same schema (just add new section types).

## 9. Success Criteria

- Skill runs in <30 seconds on a typical PR
- JSON output is <200 lines for a normal PR
- Viewer renders any entry consistently regardless of which sections are present
- Works on repos with zero tests, one test suite, or multiple test suites
- Previous entry deltas show meaningful before/after metrics
- Heatmap immediately shows where the PR's changes are concentrated
