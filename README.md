# Visual Changelog

A [Claude Code](https://docs.anthropic.com/en/docs/claude-code) plugin that generates visual changelog entries for your feature branches. It runs git diffs, discovers and executes test suites, and produces structured JSON that renders as an interactive report with KPI cards, a change heatmap, file-level annotations, test results, and architecture diagrams.

The core idea is that every PR should have a visual summary of what changed, why it changed, and what the impact was. The plugin automates the data gathering so the developer just runs a single command and gets a complete, browsable report.

Inspired by [nicobailon/visual-explainer](https://github.com/nicobailon/visual-explainer/tree/main).

## Install

Add the marketplace and install the plugin from within Claude Code:

```
/plugin marketplace add WebifyServices/visual-changelog
/plugin install visual-changelog@visual-changelog
```

## Usage

On any feature branch (not main/master):

```
/visual-changelog:changelog
```

The plugin will:

1. Detect the base branch and gather git diffs, file statuses, and commit history
2. Discover test infrastructure (vitest, jest, pytest, cargo, rspec, go test) and run any test suites it finds
3. Collect untracked files and estimate their line counts
4. Build a structured JSON entry with KPIs, a prose summary, a treemap heatmap, test results, a file list with per-file change reasons, and optionally a Mermaid architecture diagram
5. Validate the entry against the schema and write it to `visual-changelog/entries/` in your project

If there are uncommitted changes, the plugin will ask whether to commit first, continue as a draft, or cancel.

## Viewing

After generating an entry, the plugin creates a local `run.sh` wrapper in your project:

```bash
./visual-changelog/run.sh
```

This starts a local HTTP server (Python 3, no Node required) and symlinks your entries into the pre-built viewer. Open the printed URL to browse the interactive report.

## Entry Sections

Each changelog entry can contain:

| Section | Description |
|---|---|
| `kpi-bar` | Cards for lines added/removed, files changed, commits, lock file changes, with trend deltas |
| `prose` | 1-2 paragraph summary of what changed and why |
| `heatmap` | Treemap visualization of change density across the file tree (lock files excluded) |
| `test-suite` | Pass/fail/skip/total counts and duration for each discovered test runner |
| `file-list` | Every changed file with status, line counts, and a 1-sentence reason for the change |
| `mermaid` | Architecture diagram (included when changes span 3+ top-level directories) |

When a previous entry exists, the plugin computes deltas automatically so you can track how metrics evolve across entries.

## Project Structure

```
visual-changelog-plugin/     the plugin (what gets installed)
  .claude-plugin/plugin.json  plugin manifest
  skills/changelog/           skill definition + schema
  hooks/                      pre-PR reminder hook
  scripts/                    entry validator
  viewer/                     React + Chakra UI + Mermaid viewer (pre-built in dist/)
  run.sh                      local HTTP server launcher
tests/                        test suite (not installed with the plugin)
```

Entries are stored in your project at `visual-changelog/entries/`, not inside the plugin. This means the plugin can be installed globally while each project maintains its own changelog history.

## Development

```bash
# Run tests
cd tests && npm test

# Viewer dev server (hot reload, uses test fixtures)
cd visual-changelog-plugin/viewer && npm run dev

# Viewer dev server with real project entries
ENTRIES_DIR=/path/to/project/visual-changelog/entries npm run dev --prefix visual-changelog-plugin/viewer

# Rebuild viewer dist
cd visual-changelog-plugin/viewer && npm run build
```

## License

MIT
