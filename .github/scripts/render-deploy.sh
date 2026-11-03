#!/usr/bin/env bash
# Déclenche le déploiement Render de chaque service dont le Deploy Hook est configuré.
# Les URL des hooks sont secrètes (elles suffisent à lancer un déploiement) : jamais affichées.
set -euo pipefail

triggered=0
for name in BACKEND FRONTEND GATEWAY NOTIFICATIONS STOCK; do
  var="HOOK_${name}"
  url="${!var:-}"
  # Nettoie les copier-coller : espaces, retours à la ligne, guillemets
  url="$(printf '%s' "$url" | tr -d '[:space:]"'"'"'')"
  if [ -z "$url" ]; then
    echo "::warning::Deploy Hook absent pour ${name} : service ignoré"
    continue
  fi
  case "$url" in
    https://api.render.com/deploy/srv-*\?key=*) ;;
    *)
      echo "::error::Le secret RENDER_DEPLOY_HOOK_${name} n'est pas une URL de Deploy Hook Render valide (format attendu : https://api.render.com/deploy/srv-…?key=…)."
      exit 1
      ;;
  esac
  echo "Déploiement de ${name}…"
  curl --fail --silent --show-error -X POST "$url" > /dev/null
  triggered=$((triggered + 1))
done

if [ "$triggered" -eq 0 ]; then
  echo "::error::Aucun Deploy Hook configuré dans cet environnement GitHub."
  exit 1
fi
echo "${triggered} déploiement(s) déclenché(s)."
