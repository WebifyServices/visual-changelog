#!/usr/bin/env bash
set -euo pipefail
PLUGIN_DIR="$(cd "$(dirname "$0")" && pwd)"

# Accept project path as argument, default to current working directory
PROJECT_ROOT="${1:-$(pwd)}"
ENTRIES_DIR="$PROJECT_ROOT/visual-changelog/entries"

if [ ! -d "$ENTRIES_DIR" ]; then
  echo "No visual-changelog/entries/ found in $PROJECT_ROOT"
  echo "Run /visual-changelog:changelog in Claude Code first."
  exit 1
fi

# Symlink entries into dist so the viewer reflects live changes
ln -sfn "$ENTRIES_DIR" "$PLUGIN_DIR/viewer/dist/entries"

# Try ports 5173-5183 until one works
PORT=5173
while lsof -ti:$PORT >/dev/null 2>&1; do
  PORT=$((PORT + 1))
  if [ $PORT -gt 5183 ]; then
    echo "No available ports in range 5173-5183. Kill an existing process and retry."
    exit 1
  fi
done

echo "Serving visual changelog for: $PROJECT_ROOT"
echo "http://localhost:$PORT"
python3 -m http.server $PORT -d "$PLUGIN_DIR/viewer/dist"
