# visual-changelog (plugin)

This directory is the installable Claude Code plugin. It contains everything needed to generate and view visual changelog entries.

## Contents

```
.claude-plugin/plugin.json    plugin manifest (name, version, metadata)
skills/changelog/SKILL.md     skill definition — the instructions Claude follows
skills/changelog/schema/      TypeScript types defining the entry format
hooks/hooks.json              pre-PR hook reminding users to generate a changelog
scripts/validate-entry.js     standalone entry validator (checks structure, math, duplicates)
viewer/                       React app (Chakra UI + Mermaid) for browsing entries
  src/                        source code
  dist/                       pre-built production bundle (committed, served by run.sh)
run.sh                        starts a local Python HTTP server with symlinked entries
```

## How It Works

The skill (`/visual-changelog:changelog`) runs entirely inside Claude Code. It executes git commands and test runners in the user's project, builds a structured JSON entry, validates it, and writes it to `{project}/visual-changelog/entries/`. The viewer is a static React app served locally via `run.sh` — it reads the JSON entries and renders them as an interactive report.

Entries live in the user's project, not in this plugin directory. This keeps the plugin stateless and means it works correctly whether installed globally or per-project.

## Schema

The canonical type definitions are in `skills/changelog/schema/types.ts`. The viewer has a corresponding Zod validation schema in `viewer/src/schema/validation.ts`. These must stay in sync (the test suite verifies this).

A `ChangelogEntry` has:

- `id`, `title`, `date`, optional `draft` flag
- `git` metadata (branch, commit hash, base ref, optional PR number)
- `previousEntryId` for delta tracking
- `sections` array containing any combination of: `kpi-bar`, `prose`, `heatmap`, `test-suite`, `file-list`, `mermaid`

## Hooks

`hooks/hooks.json` registers a `PreToolUse` hook that fires before `gh pr create`. If the project has no changelog entries, it warns the user to run the changelog skill first. The hook checks for the existence of `{project}/visual-changelog/entries/` and is non-blocking (it warns but doesn't prevent the PR).

## Validation

`scripts/validate-entry.js` is a standalone Node.js script that checks:

- Required fields exist (id, title, date, git.branch, git.commitHash, git.baseRef)
- All section types are valid
- Test suite math adds up (passed + failed + skipped === total)
- Heatmap sums are consistent (parent.changes === sum of children)
- File list has no duplicate paths
- File statuses are valid (added, modified, deleted, renamed, untracked)
- Draft field, if present, is boolean

The skill calls this validator after writing each entry. It can also be run manually:

```bash
node scripts/validate-entry.js path/to/entry.json
```

## Rebuilding the Viewer

The `viewer/dist/` directory is committed so that consumers don't need Node.js to view entries. If you modify the viewer source:

```bash
cd viewer
npm install
npm run build
```

Then commit the updated `dist/`.

For development with hot reload:

```bash
cd viewer && npm run dev                     # uses test fixtures
ENTRIES_DIR=/path/to/entries npm run dev      # uses real entries
```
