# Visual Changelog v2 — Implementation Spec

Build a visual changelog system: a Claude Code skill that generates JSON from PR data, and a React viewer that renders it.

Read this entire document before writing any code. Build in the order specified.

---

## Directory Structure

```
.claude/skills/visual-changelog/
├── SKILL.md
└── schema/
    └── types.ts                  # canonical types (copy to viewer too)

visual-changelog/
├── run.sh
├── entries/
│   └── manifest.json             # ["42-auth-refactor.json", ...]
└── viewer/
    ├── package.json
    ├── tsconfig.json
    ├── tsconfig.app.json
    ├── tsconfig.node.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── theme.ts
        ├── schema/
        │   ├── types.ts          # copy of canonical types
        │   └── validation.ts     # zod schemas
        ├── lib/
        │   ├── router.ts
        │   └── loadEntries.ts
        ├── pages/
        │   ├── TimelinePage.tsx
        │   └── EntryDetailPage.tsx
        └── components/
            ├── Header.tsx
            ├── EntryCard.tsx
            ├── SectionRenderer.tsx
            └── sections/
                ├── KPIBar.tsx
                ├── ChangeHeatmap.tsx
                ├── FileList.tsx
                ├── ProseBlock.tsx
                ├── MermaidDiagram.tsx
                └── TestSuiteCard.tsx
```

---

## Part 1: TypeScript Schema

Create at `.claude/skills/visual-changelog/schema/types.ts`. Copy identical file to `visual-changelog/viewer/src/schema/types.ts`.

```typescript
// ── Entry ──

export interface ChangelogEntry {
  id: string;
  title: string;
  date: string;
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
  status: "added" | "modified" | "deleted" | "renamed";
  linesAdded?: number;
  linesRemoved?: number;
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
  duration?: number;
  delta?: {
    passed?: number;
    failed?: number;
    skipped?: number;
    total?: number;
    newTests?: number;
  };
}
```

---

## Part 2: Viewer App

### package.json

```json
{
  "name": "visual-changelog-viewer",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@chakra-ui/react": "^3",
    "@emotion/react": "^11",
    "mermaid": "^11",
    "react": "^19",
    "react-dom": "^19",
    "react-markdown": "^9",
    "remark-gfm": "^4",
    "zod": "^3"
  },
  "devDependencies": {
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^4",
    "typescript": "^5.7",
    "vite": "^6"
  }
}
```

### vite.config.ts

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { strictPort: false },
  publicDir: "../entries",
});
```

`publicDir: "../entries"` serves `visual-changelog/entries/` at the dev server root. So `fetch("/manifest.json")` and `fetch("/42-auth-refactor.json")` work directly.

### index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Visual Changelog</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

### main.tsx

ChakraUI v3 entrypoint. Wrap `<App />` in `<ChakraProvider>` with the custom theme and `defaultColorMode: "system"`. Use ChakraUI v3 API — NOT v2.

### theme.ts

Extend ChakraUI v3 default theme:

**Fonts:**

- heading + body: `"'Outfit', system-ui, sans-serif"`
- mono: `"'JetBrains Mono', monospace"`

**Semantic tokens** (define for both light and dark):

- `status.added` → green
- `status.modified` → amber/orange
- `status.deleted` → red
- `status.renamed` → blue
- `test.passed` → green
- `test.failed` → red
- `test.skipped` → gray
- `heatmap.cold` → blue.100 / blue.900
- `heatmap.warm` → orange.200 / orange.700
- `heatmap.hot` → red.400 / red.500
- `delta.positive` → green
- `delta.negative` → red
- `delta.neutral` → gray

Consult ChakraUI v3 docs for correct semantic token definition syntax. V3 differs significantly from v2.

### lib/router.ts

```typescript
import { useState, useEffect } from "react";

export type Route =
  | { page: "timeline" }
  | { page: "entry"; id: string };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, "");
  if (path.startsWith("entry/")) {
    return { page: "entry", id: decodeURIComponent(path.slice(6)) };
  }
  return { page: "timeline" };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onHashChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  return route;
}

export function navigate(route: Route): void {
  window.location.hash =
    route.page === "timeline" ? "#/timeline" : `#/entry/${encodeURIComponent(route.id)}`;
}
```

### lib/loadEntries.ts

```typescript
import type { ChangelogEntry } from "../schema/types";
// import { changelogEntrySchema } from "../schema/validation";

export async function loadManifest(): Promise<string[]> {
  try {
    const res = await fetch("/manifest.json");
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function loadEntry(filename: string): Promise<ChangelogEntry | null> {
  try {
    const res = await fetch(`/${filename}`);
    if (!res.ok) return null;
    const data = await res.json();
    // const parsed = changelogEntrySchema.safeParse(data);
    // if (!parsed.success) { console.warn("Invalid entry:", filename, parsed.error); return null; }
    // return parsed.data;
    return data as ChangelogEntry; // swap to zod validation above once stable
  } catch {
    return null;
  }
}

export async function loadAllEntries(): Promise<ChangelogEntry[]> {
  const manifest = await loadManifest();
  const results = await Promise.all(manifest.map(loadEntry));
  return results
    .filter((e): e is ChangelogEntry => e !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
```

### schema/validation.ts

Zod schemas mirroring every type in `types.ts`:

- `kpiCardSchema`, `kpiBarSectionSchema`
- `heatmapNodeSchema` (recursive via `z.lazy`)
- `heatmapSectionSchema`
- `fileChangeSchema`, `fileListSectionSchema`
- `proseSectionSchema`
- `mermaidSectionSchema`
- `testSuiteDeltaSchema`, `testSuiteSectionSchema`
- `sectionSchema` = `z.discriminatedUnion("type", [all 6])`
- `changelogEntrySchema`

Export `changelogEntrySchema` for use in `loadEntries.ts`.

### App.tsx

```tsx
import { useRoute } from "./lib/router";
import { Header } from "./components/Header";
import { TimelinePage } from "./pages/TimelinePage";
import { EntryDetailPage } from "./pages/EntryDetailPage";

export default function App() {
  const route = useRoute();
  return (
    <>
      <Header showBack={route.page === "entry"} />
      {route.page === "timeline" ? <TimelinePage /> : <EntryDetailPage id={route.id} />}
    </>
  );
}
```

### Header.tsx

- Left: "← Timeline" back button (only when `showBack` is true), app title "Visual Changelog"
- Right: dark/light mode toggle using ChakraUI v3 color mode API
- Sticky top, subtle border-bottom

### TimelinePage.tsx

- `loadAllEntries()` on mount via `useEffect` + `useState`
- Loading skeleton while fetching
- Search input filtering by title and branch
- Map entries to `<EntryCard>` components
- Empty state: "No changelog entries yet. Run `/changelog` to generate your first."

### EntryCard.tsx

Clickable card for the timeline. Shows:

- Title (bold)
- Branch name + short commit hash in monospace
- Date (relative — "2 hours ago")
- PR number badge if present
- Inline preview of first kpi-bar section's cards (first 3-4 metrics as small chips)
- On click: `navigate({ page: "entry", id: entry.id })`

### EntryDetailPage.tsx

- `loadEntry(id + ".json")` on mount (try `id + ".json"` — the manifest stores filenames with `.json`)
- Loading skeleton, error state if not found
- Entry header: title, branch, commit hash, base ref, date, PR number
- Map `entry.sections` through `<SectionRenderer>` in order

### SectionRenderer.tsx

```tsx
import type { Section } from "../schema/types";
import { KPIBar } from "./sections/KPIBar";
import { ChangeHeatmap } from "./sections/ChangeHeatmap";
import { FileList } from "./sections/FileList";
import { ProseBlock } from "./sections/ProseBlock";
import { MermaidDiagram } from "./sections/MermaidDiagram";
import { TestSuiteCard } from "./sections/TestSuiteCard";

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
```

Each section component receives its typed props directly (spread from the section object). Each should render the section `title` as a heading if present.

---

## Section Components

### KPIBar.tsx

Horizontal row of metric cards. Use ChakraUI `Flex` with `wrap="wrap"` and `gap`.

Each card:

- `label` as small muted text above
- `value` as large text (28-32px), `fontVariantNumeric: "tabular-nums"`
- If `delta` present: small badge next to value showing delta with trend arrow (▲ green, ▼ red)
- Card has subtle border, rounded corners, padding

On mobile: cards wrap to 2 per row. On desktop: all in one row.

### ChangeHeatmap.tsx

**This is the most important visual component.** It renders a treemap showing where changes are concentrated.

Implementation approach — **nested flexbox treemap**:

1. Receive `root: HeatmapNode` (tree of directories/files with `changes` counts)
2. Recursively render nodes as nested flex containers
3. Each leaf node (file) is a colored rectangle:
   - Size: `flex-grow` proportional to `changes` count
   - Color: intensity scale from `heatmap.cold` (few changes) to `heatmap.hot` (many changes)
   - Minimum size so tiny files are still visible
4. Each directory node is a flex container with a small label header
5. Hover tooltip: full path + exact line count
6. Top-level container has a fixed height (400px desktop, 300px mobile)

Color scale calculation:

```typescript
function getHeatColor(changes: number, maxChanges: number): string {
  const ratio = changes / maxChanges;
  // Map to 3-stop gradient: cold (0-0.3) → warm (0.3-0.7) → hot (0.7-1.0)
  // Use CSS custom properties from theme semantic tokens
}
```

The heatmap should feel like a file system view where you can instantly see "this directory had the most churn." Directories with children render as labeled containers. Files render as colored blocks inside their parent directory.

Keep this implementation simple — no canvas, no SVG, no D3. Pure CSS flexbox + React recursion. The visual effect comes from the color intensity and proportional sizing.

### FileList.tsx

Table of changed files:

- Columns: Status (badge), Path (monospace), Lines Added (green `+N`), Lines Removed (red `-N`)
- Status badges: added=green, modified=amber, deleted=red, renamed=blue
- Sort by status (deleted first, then modified, then added, then renamed)
- If >20 files: show first 20 with an expand button
- Use ChakraUI Table component

### ProseBlock.tsx

Render `content` with `react-markdown` + `remark-gfm`. Style headings, code, lists, links to match theme. Keep it simple — no syntax highlighting library, just monospace background for code blocks.

### MermaidDiagram.tsx

- Initialize Mermaid once on mount with `theme: 'default'`
- Render diagram via `mermaid.render(uniqueId, definition)` in a `useEffect`
- Set rendered SVG via `dangerouslySetInnerHTML` (Mermaid's `render` returns an SVG string — this is the standard approach)
- Wrap in a container with:
  - Zoom buttons: +, −, Reset (absolute positioned top-right)
  - Transform: `scale` + `translate` via React state
  - `overflow: hidden` on container, `cursor: grab`/`grabbing` for pan
- Handle Mermaid parse errors gracefully (show error text, don't crash)
- `caption` rendered as muted text below the diagram

### TestSuiteCard.tsx

Card for one test suite:

- Title as heading (e.g. "Unit Tests — jest")
- Horizontal stacked bar showing passed (green) / failed (red) / skipped (gray) proportions
  - Pure CSS: three `div`s in a flex row with `flex-grow` proportional to count
  - Fixed height (12-16px), rounded corners
- Below bar: numbers — "247 passed · 3 failed · 12 skipped · 262 total"
- Duration if present: "ran in 4.2s"
- Delta section if `delta` present:
  - Chips showing changes: "+3 passing" (green), "−2 failing" (green, fewer failures is good), "+5 new tests" (blue)
  - Sign logic: fewer failures = positive trend (green), more failures = negative trend (red)

---

## Part 3: Skill

### .claude/skills/visual-changelog/SKILL.md

```markdown
---
name: visual-changelog
description: Generate a visual changelog entry for the current PR. Runs git commands and test suites to gather data, outputs structured JSON, rendered by the visual changelog viewer.
---

# Visual Changelog

Generate a JSON changelog entry for the current branch's changes vs the base branch.

## Output

- **File:** `visual-changelog/entries/{id}.json`
- **Naming:** `{issue-number}-{slug}.json` from branch name. No issue number → use branch slug. Example: branch `42-auth-refactor` → `42-auth-refactor.json`
- **Manifest:** After writing, append the filename to `visual-changelog/entries/manifest.json` array.
- **Schema:** Read `.claude/skills/visual-changelog/schema/types.ts` for the exact TypeScript types.

## Data Gathering

Run these bash commands to populate the JSON. Always determine base ref first (default: `main`).

### Git data (always available)
```bash
# Base ref detection
BASE=$(git merge-base HEAD main 2>/dev/null || echo "main")

# File statuses
git diff --name-status $BASE

# Per-file line counts
git diff --numstat $BASE

# Overall stats
git diff --stat $BASE

# Commit count
git rev-list --count $BASE..HEAD

# Current state
git branch --show-current
git rev-parse --short HEAD
```

### Test discovery & execution (conditional)

Probe for test infrastructure. Check for config files in this order:

| Config file | Runner | Command |
|---|---|---|
| `vitest.config.*` or `vite.config.*` with test | vitest | `npx vitest run --reporter=json` |
| `jest.config.*` or `package.json` has "jest" | jest | `npx jest --json` |
| `pytest.ini` or `pyproject.toml` with [tool.pytest] or `setup.cfg` with [tool:pytest] | pytest | `python -m pytest --tb=short -q` |
| `Cargo.toml` with `[dev-dependencies]` | cargo | `cargo test -- --format=json` (nightly) or `cargo test 2>&1` |
| `.rspec` or `spec/` directory | rspec | `bundle exec rspec --format json` |
| `go.mod` + `*_test.go` files | go test | `go test ./... -json` |

For each discovered runner:

1. Run the test command
2. Parse output for pass/fail/skip/total counts and duration
3. Create a `test-suite` section with `title` being a human-readable name (e.g. "Unit Tests (vitest)")

If multiple test suites exist (e.g. separate unit + integration configs), create separate test-suite sections for each.

If NO test infrastructure is found, do not include any test-suite sections.

### Previous entry (conditional)

Read `visual-changelog/entries/manifest.json`. If it has entries:

1. Load the last entry's JSON
2. Set `previousEntryId` in the new entry
3. Compute deltas:
   - KPI deltas: compare line counts, file counts between entries
   - Test deltas: match test-suite sections by `title`, compute differences in pass/fail/skip/total

## Building the Entry

Construct a `ChangelogEntry` object. Include sections in this order:

1. **`kpi-bar`** (always) — cards for: Lines Added, Lines Removed, Files Changed, Commits. Include deltas if previous entry exists.

2. **`prose`** (always) — Write 1-2 paragraphs summarizing WHAT changed and WHY. Focus on the functional impact, not file-by-file narration. Be concise.

3. **`heatmap`** (always) — Build from `git diff --numstat`. Parse each file path into directory tree. Each node's `changes` = sum of lines added + removed for all files under it. Leaf nodes are individual files.

4. **`test-suite`** (zero or more) — One per discovered test suite. Include deltas if a matching suite existed in the previous entry.

5. **`file-list`** (always) — From `git diff --name-status` + `--numstat`. Map statuses: A=added, M=modified, D=deleted, R=renamed.

6. **`mermaid`** (optional) — Include ONLY if the changes touch 3+ distinct top-level directories or introduce new modules/packages. Diagram should show the high-level module relationships affected by this PR. Use `graph TD` or `graph LR`. Keep it simple — 5-15 nodes max.

## Continuity

If a previous entry exists:

- Include at minimum the same section types it had (unless the capability was removed, e.g. a test suite was deleted)
- Add new sections if changes warrant it (e.g. new test suite added)
- Always recompute all data fresh — never copy from previous entry

## Validation

After writing the JSON, read it back and verify:

- Valid JSON (parseable)
- Has `id`, `title`, `date`, `git.branch`, `git.commitHash`, `git.baseRef`
- `sections` is a non-empty array
- Each section has a valid `type` field
- Test suite numbers add up: `passed + failed + skipped === total`
- Heatmap root `changes` equals sum of all children's changes
- File list has no duplicate paths

If validation fails, fix the JSON before reporting done.

## After Writing

Tell the user:

- File written to `visual-changelog/entries/{filename}`
- Run `./visual-changelog/run.sh` to view (or `cd visual-changelog/viewer && npm run dev`)

```

---

## Part 4: Shell Scripts & Config

### visual-changelog/run.sh

```bash
#!/usr/bin/env bash
cd "$(dirname "$0")/viewer" && npm run dev
```

### visual-changelog/entries/manifest.json

```json
[]
```

### visual-changelog/README.md

```markdown
# Visual Changelog

Visual PR changelog viewer. JSON entries generated by Claude Code, rendered by a React app.

## Setup
```bash
cd visual-changelog/viewer && npm install
```

## Usage

```bash
# Generate an entry (in Claude Code)
/changelog

# View entries
./visual-changelog/run.sh
# or
cd visual-changelog/viewer && npm run dev
```

## Structure

- `entries/` — JSON changelog files + manifest.json
- `viewer/` — Vite + React + TypeScript + ChakraUI v3 app

```

### Hook config (.claude/settings.json addition)

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'INPUT=$(cat); CMD=$(echo \"$INPUT\" | jq -r \".tool_input.command // \\\"\\\"\"); if ! echo \"$CMD\" | grep -qE \"gh\\s+pr\\s+create\"; then exit 0; fi; BRANCH=$(git branch --show-current 2>/dev/null); ISSUE=$(echo \"$BRANCH\" | grep -oE \"^[0-9]+\" || true); if [ -n \"$ISSUE\" ]; then F=\"visual-changelog/entries/${ISSUE}-*.json\"; else SLUG=$(echo \"$BRANCH\" | sed \"s/[^a-zA-Z0-9]/-/g\"); F=\"visual-changelog/entries/${SLUG}.json\"; fi; if ls $F 1>/dev/null 2>&1; then jq -n --arg ctx \"Visual changelog entry exists. Include link in PR body.\" \"{hookSpecificOutput:{hookEventName:\\\"PreToolUse\\\",additionalContext:\\$ctx}}\"; else jq -n --arg r \"No visual changelog entry found. Run /changelog first.\" \"{hookSpecificOutput:{hookEventName:\\\"PreToolUse\\\",permissionDecision:\\\"deny\\\",permissionDecisionReason:\\$r}}\"; fi'"
          }
        ]
      }
    ]
  }
}
```

---

## Part 5: Sample Entry

Create `visual-changelog/entries/sample.json` for immediate testing:

```json
{
  "id": "sample",
  "title": "Add User Authentication Flow",
  "date": "2026-02-20T14:30:00Z",
  "git": {
    "branch": "42-auth-flow",
    "commitHash": "a1b2c3d",
    "baseRef": "main",
    "prNumber": 42
  },
  "sections": [
    {
      "type": "kpi-bar",
      "title": "PR Impact",
      "cards": [
        { "label": "Lines Added", "value": 847, "trend": "up" },
        { "label": "Lines Removed", "value": 123, "trend": "down" },
        { "label": "Files Changed", "value": 14 },
        { "label": "Commits", "value": 7 }
      ]
    },
    {
      "type": "prose",
      "title": "Summary",
      "content": "Introduces JWT-based authentication replacing the previous session cookie approach. The core change adds a `src/auth/` module with token generation, validation, and refresh logic. All existing API routes now pass through the auth middleware.\n\nThe migration is backward-compatible — existing sessions are honored for 30 days while clients transition to JWT. A new `/api/auth/refresh` endpoint handles token renewal."
    },
    {
      "type": "heatmap",
      "title": "Change Heatmap",
      "root": {
        "name": ".",
        "changes": 970,
        "children": [
          {
            "name": "src",
            "changes": 820,
            "children": [
              {
                "name": "auth",
                "changes": 510,
                "children": [
                  { "name": "jwt.ts", "changes": 180 },
                  { "name": "middleware.ts", "changes": 145 },
                  { "name": "refresh.ts", "changes": 95 },
                  { "name": "types.ts", "changes": 45 },
                  { "name": "index.ts", "changes": 45 }
                ]
              },
              {
                "name": "api",
                "changes": 210,
                "children": [
                  { "name": "routes.ts", "changes": 90 },
                  { "name": "middleware.ts", "changes": 70 },
                  { "name": "users.ts", "changes": 50 }
                ]
              },
              {
                "name": "config",
                "changes": 100,
                "children": [
                  { "name": "auth.ts", "changes": 60 },
                  { "name": "env.ts", "changes": 40 }
                ]
              }
            ]
          },
          {
            "name": "tests",
            "changes": 120,
            "children": [
              { "name": "auth.test.ts", "changes": 80 },
              { "name": "api.test.ts", "changes": 40 }
            ]
          },
          {
            "name": "docs",
            "changes": 30,
            "children": [
              { "name": "auth.md", "changes": 30 }
            ]
          }
        ]
      }
    },
    {
      "type": "test-suite",
      "title": "Unit Tests (vitest)",
      "runner": "vitest",
      "passed": 142,
      "failed": 2,
      "skipped": 5,
      "total": 149,
      "duration": 3.4
    },
    {
      "type": "test-suite",
      "title": "Integration Tests (vitest)",
      "runner": "vitest",
      "passed": 28,
      "failed": 0,
      "skipped": 1,
      "total": 29,
      "duration": 12.7
    },
    {
      "type": "file-list",
      "title": "Changed Files",
      "files": [
        { "path": "src/auth/jwt.ts", "status": "added", "linesAdded": 180 },
        { "path": "src/auth/middleware.ts", "status": "added", "linesAdded": 145 },
        { "path": "src/auth/refresh.ts", "status": "added", "linesAdded": 95 },
        { "path": "src/auth/types.ts", "status": "added", "linesAdded": 45 },
        { "path": "src/auth/index.ts", "status": "added", "linesAdded": 45 },
        { "path": "src/api/routes.ts", "status": "modified", "linesAdded": 52, "linesRemoved": 38 },
        { "path": "src/api/middleware.ts", "status": "modified", "linesAdded": 45, "linesRemoved": 25 },
        { "path": "src/api/users.ts", "status": "modified", "linesAdded": 30, "linesRemoved": 20 },
        { "path": "src/config/auth.ts", "status": "added", "linesAdded": 60 },
        { "path": "src/config/env.ts", "status": "modified", "linesAdded": 25, "linesRemoved": 15 },
        { "path": "tests/auth.test.ts", "status": "added", "linesAdded": 80 },
        { "path": "tests/api.test.ts", "status": "modified", "linesAdded": 25, "linesRemoved": 15 },
        { "path": "docs/auth.md", "status": "added", "linesAdded": 30 },
        { "path": "src/legacy/session.ts", "status": "deleted", "linesRemoved": 85 }
      ]
    },
    {
      "type": "mermaid",
      "title": "Auth Module Architecture",
      "definition": "graph LR\n  Client --> AuthMiddleware\n  AuthMiddleware -->|valid token| APIRoutes\n  AuthMiddleware -->|expired| RefreshEndpoint\n  AuthMiddleware -->|invalid| LoginPage\n  RefreshEndpoint --> JWTService\n  JWTService --> TokenStore\n  APIRoutes --> UserService",
      "caption": "Request flow through the new JWT authentication layer"
    }
  ]
}
```

Also create `visual-changelog/entries/manifest.json`:

```json
["sample.json"]
```

---

## Build Order

1. Create all directories
2. Write `schema/types.ts` (both locations)
3. Write `package.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts`
4. Write `index.html`
5. Run `cd visual-changelog/viewer && npm install`
6. Write `theme.ts`
7. Write `schema/validation.ts`
8. Write `lib/router.ts` and `lib/loadEntries.ts`
9. Write `Header.tsx`
10. Write all 6 section components
11. Write `SectionRenderer.tsx`
12. Write `EntryCard.tsx`
13. Write `TimelinePage.tsx` and `EntryDetailPage.tsx`
14. Write `App.tsx` and `main.tsx`
15. Write sample entry + manifest
16. Run `npm run dev` — verify sample renders
17. Fix any TS or runtime errors until clean
18. Write `SKILL.md` and skill `schema/types.ts`
19. Write `run.sh`, `README.md`
20. `chmod +x visual-changelog/run.sh`

## Critical Notes

1. **ChakraUI v3 only.** Do NOT use v2 APIs (`useColorModeValue`, old `ChakraProvider`, old theme extension). Consult v3 docs.
2. **Heatmap is pure CSS flexbox.** No D3, no canvas, no SVG. Nested `div`s with `flex-grow` proportional to `changes`. Color via inline style or CSS custom properties.
3. **Mermaid**: use `mermaid.render()` which returns `{ svg: string }`. Set via ref + innerHTML. Handle errors gracefully.
4. **Zod lazy** for `HeatmapNode` (recursive children). Use `z.lazy(() => heatmapNodeSchema)`.
5. **No nesting of sections.** Sections are a flat array. No collapsible wrappers. Just render top to bottom.
6. **Responsive.** Use ChakraUI responsive props. KPI cards wrap. Heatmap has min-height. File list scrolls horizontally on mobile.
7. **manifest.json is the source of truth** for what entries exist. Skill must update it.
