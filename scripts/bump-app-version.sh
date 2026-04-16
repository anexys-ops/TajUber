#!/usr/bin/env bash
# Incrémente le patch dans version.txt (semver M.m.p).
# Affiche la nouvelle version sur stdout.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
F="$ROOT/version.txt"
if [[ ! -f "$F" ]]; then
  echo "0.0.0" >"$F"
fi
line=$(tr -d ' \t\r\n' <"$F")
if [[ ! "$line" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "version.txt invalide: « $line » (attendu M.m.p, ex. 1.0.0)" >&2
  exit 1
fi
IFS='.' read -r major minor patch <<<"$line"
patch=$((patch + 1))
next="${major}.${minor}.${patch}"
echo "$next" >"$F"
echo "$next"
