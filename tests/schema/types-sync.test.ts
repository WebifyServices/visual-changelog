import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const PLUGIN_DIR = path.resolve(__dirname, "../../visual-changelog-plugin");

describe("schema type file locations", () => {
  it("canonical types file exists at skills/changelog/schema/types.ts", () => {
    const canonicalPath = path.join(
      PLUGIN_DIR,
      "skills/changelog/schema/types.ts"
    );
    expect(fs.existsSync(canonicalPath)).toBe(true);
  });

  it("viewer/src/schema/types.ts does NOT exist (deleted duplicate stays deleted)", () => {
    const duplicatePath = path.join(PLUGIN_DIR, "viewer/src/schema/types.ts");
    expect(fs.existsSync(duplicatePath)).toBe(false);
  });
});

describe("viewer tsconfig.app.json path aliases", () => {
  it("compilerOptions.paths has @schema/* key", () => {
    const tsconfigPath = path.join(PLUGIN_DIR, "viewer/tsconfig.app.json");
    const raw = fs.readFileSync(tsconfigPath, "utf-8");
    const tsconfig = JSON.parse(raw);
    expect(tsconfig).toHaveProperty("compilerOptions");
    expect(tsconfig.compilerOptions).toHaveProperty("paths");
    expect(tsconfig.compilerOptions.paths).toHaveProperty("@schema/*");
  });
});

describe("viewer vite.config.ts references @schema", () => {
  it('vite.config.ts contains the string "@schema"', () => {
    const viteConfigPath = path.join(PLUGIN_DIR, "viewer/vite.config.ts");
    const content = fs.readFileSync(viteConfigPath, "utf-8");
    expect(content).toContain("@schema");
  });
});
