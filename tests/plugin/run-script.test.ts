import { describe, it, expect, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

const PLUGIN_DIR = path.resolve(__dirname, "../../visual-changelog-plugin");

describe("run.sh", () => {
  it("run.sh is executable", () => {
    const runShPath = path.join(PLUGIN_DIR, "run.sh");
    const mode = fs.statSync(runShPath).mode;
    expect((mode & 0o111) !== 0, "run.sh must be executable").toBe(true);
  });

  it("run.sh content references python3", () => {
    const content = fs.readFileSync(path.join(PLUGIN_DIR, "run.sh"), "utf-8");
    expect(content, "run.sh must reference python3").toContain("python3");
  });

  it("run.sh content references viewer/dist", () => {
    const content = fs.readFileSync(path.join(PLUGIN_DIR, "run.sh"), "utf-8");
    expect(content, "run.sh must reference viewer/dist").toContain("viewer/dist");
  });

  it("run.sh uses symlink (ln -sfn), not cp", () => {
    const content = fs.readFileSync(path.join(PLUGIN_DIR, "run.sh"), "utf-8");
    expect(content, "run.sh must use ln -sfn for live entries").toContain("ln -sfn");
    expect(content, "run.sh must not use cp for entries").not.toMatch(/\bcp\b.*entries/);
  });

  it("run.sh has port fallback logic", () => {
    const content = fs.readFileSync(path.join(PLUGIN_DIR, "run.sh"), "utf-8");
    expect(content, "run.sh must use lsof for port checking").toContain("lsof");
    expect(content, "run.sh must increment port").toContain("PORT=$((PORT + 1))");
  });
});

describe("scripts/validate-entry.js", () => {
  it("validate-entry.js exists and is executable", () => {
    const scriptPath = path.join(PLUGIN_DIR, "scripts", "validate-entry.js");
    expect(fs.existsSync(scriptPath), "validate-entry.js must exist").toBe(true);
    const mode = fs.statSync(scriptPath).mode;
    expect((mode & 0o111) !== 0, "validate-entry.js must be executable").toBe(true);
  });
});

describe("run.sh symlink simulation", () => {
  const FIXTURES_DIR = path.resolve(__dirname, "../fixtures/entries");
  let tmpDir: string | null = null;

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
      tmpDir = null;
    }
  });

  it("symlinking entries dir makes fixtures accessible via dist/entries/", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "visual-changelog-test-"));

    // Simulate what run.sh does: ln -sfn "$ENTRIES_DIR" "$PLUGIN_DIR/viewer/dist/entries"
    const entriesLink = path.join(tmpDir, "entries");
    fs.symlinkSync(FIXTURES_DIR, entriesLink, "dir");

    expect(fs.existsSync(path.join(entriesLink, "manifest.json"))).toBe(true);
    expect(fs.existsSync(path.join(entriesLink, "sample.json"))).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(path.join(entriesLink, "manifest.json"), "utf-8"));
    expect(Array.isArray(manifest)).toBe(true);

    // Verify all manifest entries are accessible through the symlink
    for (const filename of manifest) {
      expect(
        fs.existsSync(path.join(entriesLink, filename)),
        `${filename} should be accessible via symlink`
      ).toBe(true);
    }
  });
});
