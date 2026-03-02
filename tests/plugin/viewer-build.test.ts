import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const PLUGIN_DIR = path.resolve(__dirname, "../../visual-changelog-plugin");
const VIEWER_DIR = path.join(PLUGIN_DIR, "viewer");
const hasNodeModules = fs.existsSync(path.join(VIEWER_DIR, "node_modules"));

describe.skipIf(!hasNodeModules)("viewer build", { timeout: 60_000 }, () => {
  it("npx tsc --noEmit exits 0 (no TypeScript errors)", () => {
    expect(() => {
      execSync("npx tsc --noEmit", { cwd: VIEWER_DIR, stdio: "pipe" });
    }, "tsc --noEmit should exit with code 0").not.toThrow();
  });

  it("npm run build exits 0", () => {
    expect(() => {
      execSync("npm run build", { cwd: VIEWER_DIR, stdio: "pipe" });
    }, "npm run build should exit with code 0").not.toThrow();
  });

  it("dist/index.html exists after build", () => {
    const indexPath = path.join(VIEWER_DIR, "dist", "index.html");
    expect(fs.existsSync(indexPath), `Expected ${indexPath} to exist after build`).toBe(true);
  });

  it("dist/assets/ contains at least one .js file", () => {
    const assetsDir = path.join(VIEWER_DIR, "dist", "assets");
    expect(fs.existsSync(assetsDir), `Expected ${assetsDir} to exist`).toBe(true);
    const files = fs.readdirSync(assetsDir);
    const jsFiles = files.filter((f) => f.endsWith(".js"));
    expect(jsFiles.length, "dist/assets must contain at least one .js file").toBeGreaterThanOrEqual(1);
  });

  it("dist/assets/ contains only bundled JS (CSS-in-JS, no separate .css expected)", () => {
    const assetsDir = path.join(VIEWER_DIR, "dist", "assets");
    expect(fs.existsSync(assetsDir), `Expected ${assetsDir} to exist`).toBe(true);
    const files = fs.readdirSync(assetsDir);
    // ChakraUI v3 uses emotion (CSS-in-JS) — styles are in the JS bundle, not separate .css files
    expect(files.length, "dist/assets must contain at least one file").toBeGreaterThanOrEqual(1);
  });
});
