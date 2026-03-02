import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

const entriesDir =
  process.env.ENTRIES_DIR ||
  path.resolve(__dirname, "../../tests/fixtures/entries");

export default defineConfig({
  plugins: [
    react(),
    {
      name: "serve-entries",
      configureServer(server) {
        server.middlewares.use("/entries", (req, res, next) => {
          const url = (req.url || "/").split("?")[0];
          const filePath = path.join(entriesDir, url);
          try {
            if (fs.statSync(filePath).isFile()) {
              res.setHeader("Content-Type", "application/json");
              res.end(fs.readFileSync(filePath));
              return;
            }
          } catch {}
          next();
        });
      },
    },
  ],
  base: "./",
  server: {
    strictPort: false,
  },
  publicDir: false,
  resolve: {
    alias: {
      "@schema": path.resolve(__dirname, "../skills/changelog/schema"),
    },
  },
});
