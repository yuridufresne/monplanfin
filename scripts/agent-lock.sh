#!/usr/bin/env bash
# ============================================================================
# Verrou coopératif « un seul agent à la fois » — checkout partagé MonPlanFin.
# Cowork / Claude Code / Cursor éditent le MÊME répertoire : deux agents en
# même temps s'écrasent (edits non commités perdus ; un `git checkout`/`reset`
# efface le travail de l'autre). Ce verrou évite ça.
#
# Usage :
#   bash scripts/agent-lock.sh status
#   bash scripts/agent-lock.sh claim "Claude Code"     # ou "Cowork", "Cursor"…
#   bash scripts/agent-lock.sh release
#
# Le verrou = fichier LOCAL .agent-lock (dans .gitignore → jamais commité,
# visible instantanément par tous les agents du même répertoire).
# Auto-expiration après 120 min (un agent planté ne bloque pas éternellement).
# ============================================================================
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK="$ROOT/.agent-lock"
STALE_MIN=120
now=$(date +%s)

case "${1:-status}" in
  status)
    if [ -f "$LOCK" ]; then
      IFS='|' read -r who ts _ < "$LOCK"
      age=$(( (now - ts) / 60 ))
      echo "🔒 VERROU tenu par : $who (depuis ${age} min)"
      [ "$age" -ge "$STALE_MIN" ] && echo "   ⚠️ périmé (>${STALE_MIN} min) — tu peux le reprendre avec 'claim'."
    else
      echo "🔓 libre"
    fi
    ;;
  claim)
    name="${2:-}"
    [ -z "$name" ] && { echo "Usage: bash scripts/agent-lock.sh claim \"<TonNom>\""; exit 2; }
    if [ -f "$LOCK" ]; then
      IFS='|' read -r who ts _ < "$LOCK"
      age=$(( (now - ts) / 60 ))
      if [ "$who" != "$name" ] && [ "$age" -lt "$STALE_MIN" ]; then
        echo "❌ REFUSÉ — verrou tenu par « $who » (depuis ${age} min)."
        echo "   Attends qu'il libère, ou coordonne-toi via JOURNAL-AGENTS.md."
        exit 1
      fi
    fi
    printf '%s|%s\n' "$name" "$now" > "$LOCK"
    echo "✅ verrou pris par « $name » — pense à 'release' à la fin."
    ;;
  release)
    if [ -f "$LOCK" ]; then rm -f "$LOCK"; echo "🔓 verrou libéré"; else echo "🔓 (déjà libre)"; fi
    ;;
  *)
    echo "Usage: bash scripts/agent-lock.sh {status|claim \"<nom>\"|release}"; exit 2
    ;;
esac
