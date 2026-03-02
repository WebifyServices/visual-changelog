import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@schema": path.resolve(__dirname, "../visual-changelog-plugin/skills/changelog/schema"),
      "@plugin": path.resolve(__dirname, "../visual-changelog-plugin"),
    },
  },
});
