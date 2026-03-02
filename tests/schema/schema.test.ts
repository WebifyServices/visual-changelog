import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  changelogEntrySchema,
  sectionSchema,
} from "@plugin/viewer/src/schema/validation";

const ENTRIES_DIR = path.resolve(__dirname, "../fixtures/entries");

describe("changelogEntrySchema — real entries from manifest", () => {
  const manifest: string[] = JSON.parse(
    fs.readFileSync(path.join(ENTRIES_DIR, "manifest.json"), "utf-8")
  );

  manifest.forEach((filename) => {
    it(`parses ${filename} without error`, () => {
      const raw = JSON.parse(
        fs.readFileSync(path.join(ENTRIES_DIR, filename), "utf-8")
      );
      expect(() => changelogEntrySchema.parse(raw)).not.toThrow();
    });
  });
});

describe("sectionSchema — full fields for each type", () => {
  it("validates kpi-bar with cards including delta and trend", () => {
    const section = {
      type: "kpi-bar",
      title: "PR Impact",
      cards: [
        { label: "Lines Added", value: 847, delta: 100, trend: "up" },
        { label: "Lines Removed", value: 123, delta: -50, trend: "down" },
        { label: "Files Changed", value: 14, trend: "neutral" },
      ],
    };
    expect(() => sectionSchema.parse(section)).not.toThrow();
  });

  it("validates heatmap with nested children 3 levels deep", () => {
    const section = {
      type: "heatmap",
      title: "Change Heatmap",
      root: {
        name: ".",
        changes: 100,
        children: [
          {
            name: "src",
            changes: 80,
            children: [
              {
                name: "auth",
                changes: 50,
                children: [
                  { name: "jwt.ts", changes: 30 },
                  { name: "types.ts", changes: 20 },
                ],
              },
              {
                name: "api",
                changes: 30,
                children: [{ name: "routes.ts", changes: 30 }],
              },
            ],
          },
          {
            name: "tests",
            changes: 20,
            children: [{ name: "auth.test.ts", changes: 20 }],
          },
        ],
      },
    };
    expect(() => sectionSchema.parse(section)).not.toThrow();
  });

  it("validates file-list with all 5 statuses and all optional fields", () => {
    const section = {
      type: "file-list",
      title: "Changed Files",
      files: [
        {
          path: "src/new.ts",
          status: "added",
          linesAdded: 50,
          linesRemoved: 0,
          reason: "New file for feature X",
        },
        {
          path: "src/old.ts",
          status: "modified",
          linesAdded: 20,
          linesRemoved: 10,
          reason: "Updated logic",
        },
        {
          path: "src/gone.ts",
          status: "deleted",
          linesAdded: 0,
          linesRemoved: 80,
          reason: "No longer needed",
        },
        {
          path: "src/moved.ts",
          status: "renamed",
          linesAdded: 5,
          linesRemoved: 2,
          reason: "Renamed for clarity",
        },
        {
          path: "src/uncommitted.ts",
          status: "untracked",
          linesAdded: 100,
          reason: "New file not yet staged",
        },
      ],
    };
    expect(() => sectionSchema.parse(section)).not.toThrow();
  });

  it("validates prose with markdown content", () => {
    const section = {
      type: "prose",
      title: "Summary",
      content:
        "## Heading\n\nThis is **bold** and _italic_.\n\n- item 1\n- item 2",
    };
    expect(() => sectionSchema.parse(section)).not.toThrow();
  });

  it("validates mermaid with caption", () => {
    const section = {
      type: "mermaid",
      title: "Architecture Diagram",
      definition: "graph LR\n  A --> B\n  B --> C",
      caption: "Data flow through the system",
    };
    expect(() => sectionSchema.parse(section)).not.toThrow();
  });

  it("validates test-suite with delta object fully populated", () => {
    const section = {
      type: "test-suite",
      title: "Unit Tests",
      runner: "vitest",
      passed: 100,
      failed: 2,
      skipped: 3,
      total: 105,
      duration: 4.5,
      delta: {
        passed: 10,
        failed: -1,
        skipped: 0,
        total: 9,
        newTests: 8,
      },
    };
    expect(() => sectionSchema.parse(section)).not.toThrow();
  });
});

describe("sectionSchema — minimal fields for each type", () => {
  it("validates kpi-bar with one card, no delta, no trend", () => {
    const section = {
      type: "kpi-bar",
      cards: [{ label: "Files Changed", value: 5 }],
    };
    expect(() => sectionSchema.parse(section)).not.toThrow();
  });

  it("validates heatmap with single root node, no children", () => {
    const section = {
      type: "heatmap",
      root: { name: ".", changes: 42 },
    };
    expect(() => sectionSchema.parse(section)).not.toThrow();
  });

  it("validates file-list with one file, no linesAdded/linesRemoved, no reason", () => {
    const section = {
      type: "file-list",
      files: [{ path: "src/index.ts", status: "modified" }],
    };
    expect(() => sectionSchema.parse(section)).not.toThrow();
  });

  it("validates prose with empty string content", () => {
    const section = {
      type: "prose",
      content: "",
    };
    expect(() => sectionSchema.parse(section)).not.toThrow();
  });

  it("validates mermaid with only definition, no caption", () => {
    const section = {
      type: "mermaid",
      definition: "graph LR\n  A --> B",
    };
    expect(() => sectionSchema.parse(section)).not.toThrow();
  });

  it("validates test-suite with only required fields", () => {
    const section = {
      type: "test-suite",
      title: "Unit Tests",
      passed: 50,
      failed: 0,
      skipped: 2,
      total: 52,
    };
    expect(() => sectionSchema.parse(section)).not.toThrow();
  });
});

describe("changelogEntrySchema — draft entries", () => {
  it("validates entry with draft: true", () => {
    const entry = {
      id: "draft-entry",
      title: "Draft Entry",
      date: "2026-01-01T00:00:00Z",
      draft: true,
      git: {
        branch: "feature/wip",
        commitHash: "abc1234",
        baseRef: "main",
      },
      sections: [{ type: "prose", content: "Work in progress" }],
    };
    expect(() => changelogEntrySchema.parse(entry)).not.toThrow();
  });

  it("validates entry without draft field (defaults to undefined)", () => {
    const entry = {
      id: "no-draft",
      title: "Normal Entry",
      date: "2026-01-01T00:00:00Z",
      git: {
        branch: "feature/done",
        commitHash: "abc1234",
        baseRef: "main",
      },
      sections: [{ type: "prose", content: "Complete" }],
    };
    const parsed = changelogEntrySchema.parse(entry);
    expect(parsed.draft).toBeUndefined();
  });

  it("rejects entry with draft as non-boolean", () => {
    const entry = {
      id: "bad-draft",
      title: "Bad Draft",
      date: "2026-01-01T00:00:00Z",
      draft: "yes",
      git: {
        branch: "feature/bad",
        commitHash: "abc1234",
        baseRef: "main",
      },
      sections: [{ type: "prose", content: "Bad" }],
    };
    expect(() => changelogEntrySchema.parse(entry)).toThrow();
  });
});

describe("changelogEntrySchema — invalid data is rejected", () => {
  const baseValidEntry = {
    id: "test-entry",
    title: "Test Entry",
    date: "2026-01-01T00:00:00Z",
    git: {
      branch: "main",
      commitHash: "abc1234",
      baseRef: "main",
    },
    sections: [],
  };

  it("rejects entry missing id", () => {
    const { id: _id, ...withoutId } = baseValidEntry;
    expect(() => changelogEntrySchema.parse(withoutId)).toThrow();
  });

  it("rejects entry missing sections", () => {
    const { sections: _sections, ...withoutSections } = baseValidEntry;
    expect(() => changelogEntrySchema.parse(withoutSections)).toThrow();
  });

  it("rejects section with unknown type", () => {
    const entry = {
      ...baseValidEntry,
      sections: [{ type: "unknown", content: "something" }],
    };
    expect(() => changelogEntrySchema.parse(entry)).toThrow();
  });

  it("rejects kpi-bar section with no cards field", () => {
    const entry = {
      ...baseValidEntry,
      sections: [{ type: "kpi-bar", title: "Missing cards" }],
    };
    expect(() => changelogEntrySchema.parse(entry)).toThrow();
  });

  it("rejects entry missing git.branch", () => {
    const entry = {
      ...baseValidEntry,
      git: { commitHash: "abc1234", baseRef: "main" },
    };
    expect(() => changelogEntrySchema.parse(entry)).toThrow();
  });

  it("rejects entry missing git.commitHash", () => {
    const entry = {
      ...baseValidEntry,
      git: { branch: "feature/x", baseRef: "main" },
    };
    expect(() => changelogEntrySchema.parse(entry)).toThrow();
  });

  it("rejects entry missing git.baseRef", () => {
    const entry = {
      ...baseValidEntry,
      git: { branch: "feature/x", commitHash: "abc1234" },
    };
    expect(() => changelogEntrySchema.parse(entry)).toThrow();
  });
});
