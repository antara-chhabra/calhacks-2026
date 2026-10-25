#!/usr/bin/env bash
# Secrets + model-ID scan over tracked files (FC-N-020, FC-N-024). Exit 1 on any hit.
set -euo pipefail
cd "$(dirname "$0")/.."
hits=0
files=$(git ls-files | grep -vE '^(\.env\.example|docs/PRD\.md|scripts/scan-secrets\.sh)$' || true)
check() { if out=$(echo "$files" | xargs grep -nIE "$1" 2>/dev/null); then echo "[$2]"; echo "$out"; hits=1; fi; }
check '(sk-[A-Za-z0-9]{20,}|fk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)' 'secret-shaped token'
check '^(FACTORY_API_KEY|FC_STDB_TOKEN|CDP_API_KEY_SECRET|CDP_WALLET_SECRET|ELEVENLABS_API_KEY|FC_DIRECTOR_TOKEN)=.+' 'filled env key'
# Model IDs: any value from the local .env FC_MODEL_* / tier keys must not appear in tracked files.
if [ -f .env ]; then
  while IFS='=' read -r k v; do
    v="${v%%#*}"; v="$(echo "$v" | xargs)"
    [ -n "$v" ] && check "$(printf '%s' "$v" | sed 's/[.[\*^$/]/\\&/g')" "model id from $k"
  done < <(grep -E '^(FC_MODEL_|FC_TIER_|FC_DIRECT_MODEL)' .env || true)
fi
[ $hits -eq 0 ] && echo "scan: clean" || { echo "scan: FAILED"; exit 1; }
