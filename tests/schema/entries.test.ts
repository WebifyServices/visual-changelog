import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const ENTRIES_DIR = path.resolve(__dirname, "../fixtures/entries");

interface HeatmapNode {
  name: string;
  changes: number;
  children?: HeatmapNode[];
}

interface FileChange {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed" | "untracked";
  linesAdded?: number;
  linesRemoved?: number;
  reason?: string;
}

interface Section {
  type: string;
  [key: string]: unknown;
}

interface HeatmapSection extends Section {
  type: "heatmap";
  root: HeatmapNode;
}

interface TestSuiteSection extends Section {
  type: "test-suite";
  passed: number;
  failed: number;
  skipped: number;
  total: number;
}

interface FileListSection extends Section {
  type: "file-list";
  files: FileChange[];
}

interface ChangelogEntry {
  id: string;
  title: string;
  date: string;
  git: {
    branch: string;
    commitHash: string;
    baseRef: string;
    prNumber?: number;
  };
  sections: Section[];
}

function sumLeaves(node: HeatmapNode): number {
  if (!node.children || node.children.length === 0) {
    return node.changes;
  }
  return node.children.reduce((sum, child) => sum + sumLeaves(child), 0);
}

function loadManifest(): string[] {
  const manifestPath = path.join(ENTRIES_DIR, "manifest.json");
  return JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as string[];
}

function loadEntries(): ChangelogEntry[] {
  const manifest = loadManifest();
  return manifest.map((filename) => {
    const filePath = path.join(ENTRIES_DIR, filename);
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as ChangelogEntry;
  });
}

describe("manifest.json structure", () => {
  it("is a valid JSON array of strings", () => {
    const manifest = loadManifest();
    expect(Array.isArray(manifest)).toBe(true);
    manifest.forEach((item) => {
      expect(typeof item).toBe("string");
    });
  });

  it("every filename in manifest has a corresponding file in entries/", () => {
    const manifest = loadManifest();
    manifest.forEach((filename) => {
      const filePath = path.join(ENTRIES_DIR, filename);
      expect(fs.existsSync(filePath), `Expected file to exist: ${filename}`).toBe(true);
    });
  });

  it("has no duplicate filenames", () => {
    const manifest = loadManifest();
    const unique = new Set(manifest);
    expect(unique.size).toBe(manifest.length);
  });
});

describe("entry IDs", () => {
  it("every entry has a unique id", () => {
    const entries = loadEntries();
    const ids = entries.map((e) => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe("heatmap integrity", () => {
  it("root.changes equals recursive sum of all leaf changes", () => {
    const entries = loadEntries();
    entries.forEach((entry) => {
      const heatmapSections = entry.sections.filter(
        (s): s is HeatmapSection => s.type === "heatmap"
      );
      heatmapSections.forEach((section) => {
        const leafSum = sumLeaves(section.root);
        expect(
          leafSum,
          `Entry "${entry.id}" heatmap root.changes (${section.root.changes}) should equal leaf sum (${leafSum})`
        ).toBe(section.root.changes);
      });
    });
  });
});

describe("test-suite math", () => {
  it("passed + failed + skipped === total for every test-suite section", () => {
    const entries = loadEntries();
    entries.forEach((entry) => {
      const testSuiteSections = entry.sections.filter(
        (s): s is TestSuiteSection => s.type === "test-suite"
      );
      testSuiteSections.forEach((section) => {
        const computed = section.passed + section.failed + section.skipped;
        expect(
          computed,
          `Entry "${entry.id}" section "${section.type}" (title: ${(section as TestSuiteSection & { title?: string }).title}): ${section.passed} + ${section.failed} + ${section.skipped} should equal total ${section.total}`
        ).toBe(section.total);
      });
    });
  });
});

describe("file-list uniqueness", () => {
  it("no duplicate path values within a single file-list section", () => {
    const entries = loadEntries();
    entries.forEach((entry) => {
      const fileListSections = entry.sections.filter(
        (s): s is FileListSection => s.type === "file-list"
      );
      fileListSections.forEach((section) => {
        const paths = section.files.map((f) => f.path);
        const uniquePaths = new Set(paths);
        expect(
          uniquePaths.size,
          `Entry "${entry.id}" has duplicate paths in file-list section`
        ).toBe(paths.length);
      });
    });
  });
});
