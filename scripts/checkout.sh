#!/usr/bin/env bash
# Checkout branch in all submodules and in main repo.
# Usage: ./scripts/checkout.sh <branch> [branch args...]
# Example: ./scripts/checkout.sh dev
# Example: ./scripts/checkout.sh -b feature/foo

set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if [ $# -eq 0 ]; then
  echo "Usage: $0 <branch> [branch args...]"
  echo "Example: $0 dev"
  echo "Example: $0 -b feature/foo"
  exit 1
fi

run_checkout() {
  local dir="$1"
  shift
  (cd "$dir" && git checkout "$@")
}

echo "==> Main repo: git checkout $*"
run_checkout "$REPO_ROOT" "$@"

while IFS= read -r path; do
  [ -z "$path" ] && continue
  [ ! -d "$REPO_ROOT/$path" ] && continue
  echo "==> $path: git checkout $*"
  run_checkout "$REPO_ROOT/$path" "$@"
done < <(git config --file .gitmodules --get-regexp path | awk '{ print $2 }')

echo "Done."
