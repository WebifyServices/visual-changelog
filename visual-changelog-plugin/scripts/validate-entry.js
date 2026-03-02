#!/usr/bin/env node
const fs = require("fs");
const path = process.argv[2];
if (!path) { console.error("Usage: validate-entry.js <entry.json>"); process.exit(1); }

const entry = JSON.parse(fs.readFileSync(path, "utf-8"));
const errors = [];

if (!entry.id) errors.push("Missing id");
if (!entry.title) errors.push("Missing title");
if (!entry.date) errors.push("Missing date");
if (!entry.git?.branch) errors.push("Missing git.branch");
if (!entry.git?.commitHash) errors.push("Missing git.commitHash");
if (!entry.git?.baseRef) errors.push("Missing git.baseRef");
if (!Array.isArray(entry.sections) || entry.sections.length === 0) errors.push("sections must be non-empty array");

if (entry.draft !== undefined && typeof entry.draft !== "boolean") errors.push("draft must be a boolean");

const validTypes = ["kpi-bar", "heatmap", "file-list", "prose", "mermaid", "test-suite"];
for (const s of entry.sections) {
  if (!validTypes.includes(s.type)) errors.push("Invalid section type: " + s.type);
  if (s.type === "test-suite" && s.passed + s.failed + s.skipped !== s.total)
    errors.push("Test suite math mismatch: " + s.title);
}

const fileList = entry.sections.find(s => s.type === "file-list");
if (fileList) {
  const validStatuses = ["added", "modified", "deleted", "renamed", "untracked"];
  for (const f of fileList.files) {
    if (!validStatuses.includes(f.status)) errors.push("Invalid file status: " + f.status + " at " + f.path);
  }
  const paths = fileList.files.map(f => f.path);
  const dupes = paths.filter((p, i) => paths.indexOf(p) !== i);
  if (dupes.length) errors.push("Duplicate file paths: " + dupes.join(", "));
}

const heatmap = entry.sections.find(s => s.type === "heatmap");
if (heatmap) {
  (function check(node) {
    if (!node.children?.length) return;
    const sum = node.children.reduce((a, c) => a + c.changes, 0);
    if (sum !== node.changes) errors.push("Heatmap sum mismatch at " + node.name);
    node.children.forEach(check);
  })(heatmap.root);
}

if (errors.length === 0) { console.log("VALID"); process.exit(0); }
else { console.log("ERRORS:"); errors.forEach(e => console.log("  - " + e)); process.exit(1); }
