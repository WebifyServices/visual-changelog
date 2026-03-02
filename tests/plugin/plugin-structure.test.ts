import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const PLUGIN_DIR = path.resolve(__dirname, "../../visual-changelog-plugin");

function findFilesRecursive(
  dir: string,
  predicate: (name: string) => boolean,
  skipDirs = ["node_modules", ".git"],
): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  function walk(current: string, rel: string) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!skipDirs.includes(entry.name)) {
          walk(path.join(current, entry.name), path.join(rel, entry.name));
        }
      } else if (predicate(entry.name)) {
        results.push(path.join(rel, entry.name));
      }
    }
  }
  walk(dir, "");
  return results;
}

describe("plugin structure — required files", () => {
  it(".claude-plugin/plugin.json exists, is valid JSON, has name and version strings", () => {
    const pluginJsonPath = path.join(PLUGIN_DIR, ".claude-plugin", "plugin.json");
    expect(fs.existsSync(pluginJsonPath), `Expected ${pluginJsonPath} to exist`).toBe(true);
    const raw = fs.readFileSync(pluginJsonPath, "utf-8");
    let parsed: unknown;
    expect(() => { parsed = JSON.parse(raw); }, "plugin.json must be valid JSON").not.toThrow();
    const obj = parsed as Record<string, unknown>;
    expect(typeof obj.name, "plugin.json must have a string 'name' field").toBe("string");
    expect(typeof obj.version, "plugin.json must have a string 'version' field").toBe("string");
  });

  it("skills/changelog/SKILL.md exists and is non-empty", () => {
    const skillMdPath = path.join(PLUGIN_DIR, "skills", "changelog", "SKILL.md");
    expect(fs.existsSync(skillMdPath), `Expected ${skillMdPath} to exist`).toBe(true);
    const content = fs.readFileSync(skillMdPath, "utf-8");
    expect(content.length, "SKILL.md must be non-empty").toBeGreaterThan(0);
  });

  it("skills/changelog/schema/types.ts exists", () => {
    const typesPath = path.join(PLUGIN_DIR, "skills", "changelog", "schema", "types.ts");
    expect(fs.existsSync(typesPath), `Expected ${typesPath} to exist`).toBe(true);
  });

  it("hooks/hooks.json exists, is valid JSON, has PreToolUse array with a Bash matcher", () => {
    const hooksJsonPath = path.join(PLUGIN_DIR, "hooks", "hooks.json");
    expect(fs.existsSync(hooksJsonPath), `Expected ${hooksJsonPath} to exist`).toBe(true);
    const raw = fs.readFileSync(hooksJsonPath, "utf-8");
    let parsed: unknown;
    expect(() => { parsed = JSON.parse(raw); }, "hooks.json must be valid JSON").not.toThrow();
    const obj = parsed as Record<string, unknown>;
    const hooks = obj.hooks as Record<string, unknown>;
    expect(Array.isArray(hooks?.PreToolUse), "hooks.PreToolUse must be an array").toBe(true);
    const preToolUse = hooks.PreToolUse as Array<Record<string, unknown>>;
    expect(preToolUse.length, "hooks.PreToolUse must have at least one entry").toBeGreaterThanOrEqual(1);
    const hasBashMatcher = preToolUse.some((entry) => entry.matcher === "Bash");
    expect(hasBashMatcher, "hooks.PreToolUse must contain an entry with matcher === 'Bash'").toBe(true);
  });

  it("run.sh exists and is executable", () => {
    const runShPath = path.join(PLUGIN_DIR, "run.sh");
    expect(fs.existsSync(runShPath), `Expected ${runShPath} to exist`).toBe(true);
    const mode = fs.statSync(runShPath).mode;
    expect((mode & 0o111) !== 0, "run.sh must be executable").toBe(true);
  });

  it("viewer/dist/ directory exists", () => {
    const distPath = path.join(PLUGIN_DIR, "viewer", "dist");
    expect(fs.existsSync(distPath), `Expected ${distPath} to exist`).toBe(true);
    expect(fs.statSync(distPath).isDirectory(), "viewer/dist must be a directory").toBe(true);
  });

  it("viewer/dist/index.html exists and contains <div id=\"root\">", () => {
    const indexPath = path.join(PLUGIN_DIR, "viewer", "dist", "index.html");
    expect(fs.existsSync(indexPath), `Expected ${indexPath} to exist`).toBe(true);
    const content = fs.readFileSync(indexPath, "utf-8");
    expect(content, 'dist/index.html must contain <div id="root">').toContain('<div id="root">');
  });

  it("no entries/ directory in plugin (entries belong in the project)", () => {
    const entriesPath = path.join(PLUGIN_DIR, "entries");
    expect(fs.existsSync(entriesPath), "entries/ must not exist inside plugin").toBe(false);
  });
});

describe("plugin structure — nothing extra ships", () => {
  it("no node_modules/ at plugin root", () => {
    const nodeModulesPath = path.join(PLUGIN_DIR, "node_modules");
    expect(fs.existsSync(nodeModulesPath), "node_modules must not exist at plugin root").toBe(false);
  });

  it("no tests/ directory inside plugin", () => {
    const testsPath = path.join(PLUGIN_DIR, "tests");
    expect(fs.existsSync(testsPath), "tests/ must not exist inside plugin").toBe(false);
  });

  it("no vitest.config.* files inside plugin", () => {
    const vitestConfigs = findFilesRecursive(PLUGIN_DIR, (name) => /^vitest\.config(\..+)?$/.test(name));
    expect(vitestConfigs, "No vitest.config files should exist inside plugin").toHaveLength(0);
  });

  it("no jest.config.* files inside plugin", () => {
    const jestConfigs = findFilesRecursive(PLUGIN_DIR, (name) => /^jest\.config(\..+)?$/.test(name));
    expect(jestConfigs, "No jest.config files should exist inside plugin").toHaveLength(0);
  });

  it("no package.json at plugin root (only viewer/package.json should exist)", () => {
    const rootPackageJson = path.join(PLUGIN_DIR, "package.json");
    expect(fs.existsSync(rootPackageJson), "package.json must not exist at plugin root").toBe(false);
  });

  it("no .test.ts files anywhere inside plugin", () => {
    const testFiles = findFilesRecursive(PLUGIN_DIR, (name) => name.endsWith(".test.ts"));
    expect(testFiles, "No .test.ts files should exist inside plugin").toHaveLength(0);
  });
});
