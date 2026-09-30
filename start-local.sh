#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
if command -v node >/dev/null 2>&1; then
  portal_node="$(command -v node)"
else
  portal_node="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi
if [[ ! -x "$portal_node" || ! -f node_modules/vite/bin/vite.js || ! -f dist/index.html ]]; then
  echo "README.md の起動手順で依存関係をインストールし、pnpm build を実行してください。"
  exit 1
fi
exec "$portal_node" node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173
