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

# Generate manifest from directory contents (never committed, always fresh)
python3 -c "
import json, glob, os
entries_dir = '$ENTRIES_DIR'
files = sorted(
    [os.path.basename(f) for f in glob.glob(os.path.join(entries_dir, '*.json')) if os.path.basename(f) != 'manifest.json'],
)
# Sort by date field inside each entry for chronological order
dated = []
for f in files:
    try:
        with open(os.path.join(entries_dir, f)) as fh:
            data = json.load(fh)
            dated.append((data.get('date', ''), f))
    except: dated.append(('', f))
dated.sort(key=lambda x: x[0])
manifest = [f for _, f in dated]
with open(os.path.join(entries_dir, 'manifest.json'), 'w') as fh:
    json.dump(manifest, fh, indent='\t')
"

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
