---
name: changelog
description: Generate a visual changelog entry for the current PR. Runs git commands and test suites to gather data, outputs structured JSON, rendered by the visual changelog viewer.
allowed-tools:
  - Bash(git diff *)
  - Bash(git log *)
  - Bash(git rev-parse *)
  - Bash(git rev-list *)
  - Bash(git branch *)
  - Bash(git merge-base *)
  - Bash(git status *)
  - Bash(git ls-files *)
  - Bash(git add *)
  - Bash(git commit *)
  - Bash(wc -l *)
  - Bash(find . *)
  - Bash(cat */visual-changelog/entries/*)
  - Bash(cat */manifest.json*)
  - Bash(cat */package.json*)
  - Bash(mkdir -p */visual-changelog/entries)
  - Bash(echo *)
  - Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/validate-entry.js *)
  - Bash(python3 -c *)
  - Read(*/visual-changelog/entries/*)
  - Read(${CLAUDE_PLUGIN_ROOT}/skills/changelog/schema/types.ts)
  - Write(*/visual-changelog/entries/*)
  - Write(*/visual-changelog/run.sh)
---

# Visual Changelog

Generate a JSON changelog entry for the current branch's changes vs the base branch.

## Guards

Before gathering data, run two checks:

### Branch check
```bash
BRANCH=$(git branch --show-current)
if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  echo "ERROR: on $BRANCH"
  exit 1
fi
```
If on main/master, tell the user to switch to a feature branch and stop.

### Dirty tree check
```bash
git status --porcelain
```
If this produces output, there are uncommitted or staged changes. Ask the user which option they prefer:

**Option 1: Commit and continue** — Ask the user for a commit message (or default to "WIP: pre-changelog"). Run:
```bash
git add -A
git commit -m "{message}"
```
Then proceed with normal changelog generation.

**Option 2: Continue as draft** — Proceed with generation but:
- Set `"draft": true` on the entry
- Include a note in the `prose` section: "This entry was generated from uncommitted work and may not reflect the final state of the branch."
- `commitHash` should be the current HEAD (which won't include the uncommitted changes — that's expected for drafts)

**Option 3: Cancel** — Stop. Tell the user to commit or stash their changes first.

Present these options to the user and wait for their choice before proceeding.

## Setup

Determine the project root and prepare the entries directory:

```bash
PROJECT_ROOT=$(git rev-parse --show-toplevel)
ENTRIES_DIR="$PROJECT_ROOT/visual-changelog/entries"

# Create entries directory on first run
mkdir -p "$ENTRIES_DIR"
if [ ! -f "$ENTRIES_DIR/manifest.json" ]; then
  echo '[]' > "$ENTRIES_DIR/manifest.json"
fi

# Create local run script if it doesn't exist
if [ ! -f "$PROJECT_ROOT/visual-changelog/run.sh" ]; then
  cat > "$PROJECT_ROOT/visual-changelog/run.sh" << SCRIPT
#!/usr/bin/env bash
set -euo pipefail
PROJECT_ROOT="\$(cd "\$(dirname "\$0")/.." && pwd)"
exec "${CLAUDE_PLUGIN_ROOT}/run.sh" "\$PROJECT_ROOT"
SCRIPT
  chmod +x "$PROJECT_ROOT/visual-changelog/run.sh"
fi
```

## Output

- **File:** `$ENTRIES_DIR/{id}.json`
- **Naming:** If the branch name starts with an issue number (e.g. `42-auth-refactor`), use that as the filename: `42-auth-refactor.json`. Otherwise use the full branch slug: `feature-new-login.json`.
- **Manifest:** After writing the entry, read `$ENTRIES_DIR/manifest.json`, parse the JSON array, push the new filename, and write the updated array back. Do NOT overwrite — preserve existing entries.
- **Schema:** Read `${CLAUDE_PLUGIN_ROOT}/skills/changelog/schema/types.ts` for the exact TypeScript types.

## Data Gathering

Run these bash commands to populate the JSON. Always determine base ref first (default: `main`).

### Git data (always available)
```bash
# Base ref detection
BASE=$(git merge-base HEAD main 2>/dev/null || echo "main")

# File statuses
git diff --name-status $BASE

# Per-file line counts
git diff --numstat $BASE

# Overall stats
git diff --stat $BASE

# Commit count
git rev-list --count $BASE..HEAD

# Current state
git branch --show-current
git rev-parse --short HEAD

# Untracked files (respects .gitignore)
git ls-files --others --exclude-standard
```

Include untracked files in both the `file-list` (with `status: "untracked"`) and `heatmap`. For untracked files, estimate line counts using `wc -l`. Do NOT include files that would be ignored by `.gitignore`.

**Exclude lock files** from the `heatmap` and `file-list` sections. These files are: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `Gemfile.lock`, `Cargo.lock`, `poetry.lock`, `composer.lock`, `go.sum`.

If lock files were changed, add a KPI card to the `kpi-bar` section: `{ "label": "Lock File Changes", "value": "{total lines changed in lock files}" }`. This preserves the information without polluting the visual components.

### Test discovery & execution (conditional)

Probe for test infrastructure. Do NOT use shell globs (`*.config.*`) for test discovery — they fail in zsh when no matches exist. Use `find` instead:

```bash
# Discover test config files
find . -maxdepth 3 -name "vitest.config.*" -o -name "jest.config.*" -o -name "pytest.ini" -o -name ".rspec" 2>/dev/null

# Check package.json for test scripts or jest config
cat package.json 2>/dev/null | grep -E '"test":|"jest"' || true
```

Match discovered files to runners:

| Config file | Runner | Command |
|---|---|---|
| `vitest.config.*` or `vite.config.*` with test | vitest | `npx vitest run --reporter=json` |
| `jest.config.*` or `package.json` has "jest" | jest | `npx jest --json` |
| `pytest.ini` or `pyproject.toml` with [tool.pytest] or `setup.cfg` with [tool:pytest] | pytest | `python -m pytest --tb=short -q` |
| `Cargo.toml` with `[dev-dependencies]` | cargo | `cargo test -- --format=json` (nightly) or `cargo test 2>&1` |
| `.rspec` or `spec/` directory | rspec | `bundle exec rspec --format json` |
| `go.mod` + `*_test.go` files | go test | `go test ./... -json` |

For each discovered runner:

1. Run the test command
2. Parse output for pass/fail/skip/total counts and duration
3. Create a `test-suite` section with `title` being a human-readable name (e.g. "Unit Tests (vitest)")

**Duration units:** All test runners must normalize duration to **seconds** before writing to JSON.
- vitest/jest: reporter=json outputs milliseconds → divide by 1000
- pytest: outputs seconds natively → use as-is
- cargo test: outputs seconds natively → use as-is
- go test: outputs nanoseconds → divide by 1,000,000,000

If multiple test suites exist (e.g. separate unit + integration configs), create separate test-suite sections for each.

If NO test infrastructure is found, do not include any test-suite sections.

### Previous entry (conditional)

Read `$ENTRIES_DIR/manifest.json`. If it has entries:

1. Load the last entry's JSON
2. Set `previousEntryId` in the new entry
3. Compute deltas:
   - KPI deltas: compare line counts, file counts between entries
   - Test deltas: match test-suite sections by `title`, compute differences in pass/fail/skip/total

## Building the Entry

Construct a `ChangelogEntry` object. Include sections in this order:

1. **`kpi-bar`** (always) — cards for: Lines Added, Lines Removed, Files Changed, Commits. Include deltas if previous entry exists.

2. **`prose`** (always) — Write 1-2 paragraphs summarizing WHAT changed and WHY. Focus on the functional impact, not file-by-file narration. Be concise.

3. **`heatmap`** (always) — Build from `git diff --numstat` + untracked files. Exclude lock files. Parse each file path into directory tree. Each node's `changes` = sum of lines added + removed for all files under it. Leaf nodes are individual files.

4. **`test-suite`** (zero or more) — One per discovered test suite. Include deltas if a matching suite existed in the previous entry.

5. **`file-list`** (always) — From `git diff --name-status` + `--numstat` + `git ls-files --others --exclude-standard`. Exclude lock files. Map statuses: A=added, M=modified, D=deleted, R=renamed; untracked files get `status: "untracked"`. For each file, include a `reason` field with a 1-sentence explanation of why this file was changed. Base this on the diff content — read the actual changes to understand the purpose. Keep it under 15 words. Focus on WHAT and WHY, not HOW.

6. **`mermaid`** (optional) — Include ONLY if the changes touch 3+ distinct top-level directories or introduce new modules/packages. Diagram should show the high-level module relationships affected by this PR. Use `graph TD` or `graph LR`. Keep it simple — 5-15 nodes max.

## Continuity

If a previous entry exists:

- Include at minimum the same section types it had (unless the capability was removed, e.g. a test suite was deleted)
- Add new sections if changes warrant it (e.g. new test suite added)
- Always recompute all data fresh — never copy from previous entry

## Validation

After writing the JSON, run the bundled validator:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-entry.js" "$ENTRIES_DIR/{filename}"
```

If it prints ERRORS, fix the JSON and re-validate. Do NOT write your own validation logic.

## After Writing

Tell the user:
- Entry written to `visual-changelog/entries/{filename}`
- To view, run from a separate terminal:
  ```
  ./visual-changelog/run.sh
  ```
