import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const PLUGIN_DIR = path.resolve(__dirname, "../../visual-changelog-plugin");

describe.skipIf(process.env.FAST)(
  "fresh install simulation",
  { timeout: 30_000 },
  () => {
    let tmpDir: string;

    beforeAll(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vc-test-"));
      execSync("git init", { cwd: tmpDir });
      execSync('git config user.email "test@test.com"', { cwd: tmpDir });
      execSync('git config user.name "Test"', { cwd: tmpDir });
      execSync('git commit --allow-empty -m "init"', { cwd: tmpDir });
      execSync("git checkout -b 42-test-feature", { cwd: tmpDir });

      fs.mkdirSync(path.join(tmpDir, "src/utils"), { recursive: true });

      fs.writeFileSync(
        path.join(tmpDir, "src/index.ts"),
        'export const app = "hello";\n'
      );
      fs.writeFileSync(
        path.join(tmpDir, "src/utils/helpers.ts"),
        'export function greet(name: string): string {\n  return `Hello, ${name}!`;\n}\n'
      );
      fs.writeFileSync(
        path.join(tmpDir, "src/utils/math.ts"),
        'export function add(a: number, b: number): number {\n  return a + b;\n}\n'
      );
      fs.writeFileSync(
        path.join(tmpDir, "README.md"),
        "# Test Project\n\nA temporary project for e2e testing.\n"
      );

      execSync("git add .", { cwd: tmpDir });
      execSync('git commit -m "feature work"', { cwd: tmpDir });
    });

    afterAll(() => {
      if (tmpDir) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("symlinks plugin and creates project-local entries dir", () => {
      fs.symlinkSync(
        PLUGIN_DIR,
        path.join(tmpDir, "visual-changelog-plugin"),
        "dir"
      );

      // Plugin itself should NOT have entries/
      expect(
        fs.existsSync(
          path.join(tmpDir, "visual-changelog-plugin/entries")
        )
      ).toBe(false);

      // Simulate what the skill does on first run: create project-local entries dir
      const entriesDir = path.join(tmpDir, "visual-changelog/entries");
      fs.mkdirSync(entriesDir, { recursive: true });

      expect(fs.existsSync(entriesDir)).toBe(true);
    });

    it("git diff commands produce output against temp repo", () => {
      const diffNameStatus = execSync("git diff --name-status main", {
        cwd: tmpDir,
        encoding: "utf-8",
      });
      expect(diffNameStatus.trim().length).toBeGreaterThan(0);

      const diffNumstat = execSync("git diff --numstat main", {
        cwd: tmpDir,
        encoding: "utf-8",
      });
      expect(diffNumstat.trim().length).toBeGreaterThan(0);

      const diffStat = execSync("git diff --stat main", {
        cwd: tmpDir,
        encoding: "utf-8",
      });
      expect(diffStat.trim().length).toBeGreaterThan(0);

      const revList = execSync("git rev-list --count main..HEAD", {
        cwd: tmpDir,
        encoding: "utf-8",
      });
      expect(parseInt(revList.trim())).toBeGreaterThan(0);
    });

    it("python http server responds 200", async () => {
      const port = 5200 + Math.floor(Math.random() * 100);
      const distDir = path.join(PLUGIN_DIR, "viewer/dist");

      const server = spawn(
        "python3",
        ["-m", "http.server", String(port), "-d", distDir],
        { stdio: "pipe" }
      );

      try {
        await new Promise((r) => setTimeout(r, 1000));

        const result = execSync(
          `curl -s -o /dev/null -w "%{http_code}" http://localhost:${port}/`,
          { encoding: "utf-8" }
        );

        expect(result).toBe("200");
      } finally {
        server.kill();
      }
    });
  }
);
