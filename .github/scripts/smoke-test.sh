#!/usr/bin/env bash
# Vérifie que le backend répond sur /health après le déploiement.
# Attente longue : build Docker sur Render + réveil d'un service gratuit endormi.
set -euo pipefail

BACKEND_URL="${1:-}"
if [ -z "$BACKEND_URL" ]; then
  echo "::warning::Variable BACKEND_URL non définie : test de fumée ignoré"
  exit 0
fi

sleep 60
for attempt in $(seq 1 20); do
  if curl --fail --silent --max-time 30 "${BACKEND_URL}/health" | grep -q '"status":"ok"'; then
    echo "Backend opérationnel (tentative ${attempt})."
    exit 0
  fi
  echo "Backend pas encore prêt (tentative ${attempt}/20), nouvel essai dans 30 s…"
  sleep 30
done

echo "::error::${BACKEND_URL}/health ne répond pas après le déploiement."
exit 1
