# Visual Changelog

Visual PR changelog — generates structured JSON from git/test data, rendered as an interactive report.

## Install

```bash
claude plugin add /path/to/visual-changelog-plugin
```

## Usage

In any project with Claude Code:

```
/visual-changelog:changelog
```

This creates `visual-changelog/entries/` in your project root (if it doesn't exist) and writes a JSON entry there. Entries belong to your project and should be committed to your repo.

## View

```bash
# From within your project directory
/path/to/visual-changelog-plugin/run.sh

# Or specify the project path
/path/to/visual-changelog-plugin/run.sh /path/to/my-project
```

Opens at http://localhost:5173. Requires Python 3 (no Node.js needed).

## Development (rebuilding the viewer)

```bash
cd viewer && npm install && npm run dev    # dev server with hot reload (uses test fixtures)
cd viewer && npm run build                  # rebuild dist/

# Dev with real project entries:
ENTRIES_DIR=/path/to/project/visual-changelog/entries npm run dev --prefix viewer
```
