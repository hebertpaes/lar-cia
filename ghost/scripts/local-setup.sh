#!/usr/bin/env bash
# Configura um Ghost LOCAL já em execução com o tema + conteúdo LAR & CIA.
# Pré-requisito: Ghost rodando (ex.: `ghost install local` ou `docker compose up`).
#
# Uso:
#   GHOST_URL=http://localhost:2368 \
#   ADMIN_EMAIL=ciencia@msn.com ADMIN_PASS='TroqueEstaSenha123' \
#   ghost/scripts/local-setup.sh
#
# Faz: setup do admin → sessão → upload+ativação do tema → import do conteúdo
#      → routes.yaml → cor da marca + navegação. Idempotente o suficiente p/ dev.
set -euo pipefail

GHOST_URL="${GHOST_URL:-http://localhost:2368}"
ADMIN_NAME="${ADMIN_NAME:-Hebert Paes}"
ADMIN_EMAIL="${ADMIN_EMAIL:-ciencia@msn.com}"
ADMIN_PASS="${ADMIN_PASS:-LarCia#2026Forte}"
BLOG_TITLE="${BLOG_TITLE:-LAR & CIA}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"          # .../ghost
THEME_DIR="$ROOT/theme"
IMPORT="$ROOT/import/ghost-import.json"
ROUTES="$ROOT/routes.yaml"
ZIP="$(mktemp -d)/lar-cia.zip"
JAR="$(mktemp)"
API="$GHOST_URL/ghost/api/admin"
H=(-H "Accept-Version: v5.0" -H "Origin: $GHOST_URL")

echo "→ Empacotando o tema"
( cd "$THEME_DIR" && zip -rq "$ZIP" lar-cia -x '*/.DS_Store' )

echo "→ Setup do admin (ignora erro se já existir)"
curl -fsS -X POST "$API/authentication/setup/" -H "Content-Type: application/json" "${H[@]}" \
  -d "{\"setup\":[{\"name\":\"$ADMIN_NAME\",\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\",\"blogTitle\":\"$BLOG_TITLE\"}]}" \
  >/dev/null 2>&1 || echo "  (setup já realizado)"

echo "→ Sessão"
curl -fsS -c "$JAR" -X POST "$API/session/" -H "Content-Type: application/json" "${H[@]}" \
  -d "{\"username\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}" >/dev/null

echo "→ Upload + ativação do tema (Ghost valida via gscan)"
curl -fsS -b "$JAR" -X POST "$API/themes/upload/" "${H[@]}" -F "file=@$ZIP;type=application/zip" >/dev/null
curl -fsS -b "$JAR" -X PUT  "$API/themes/lar-cia/activate/" "${H[@]}" >/dev/null

echo "→ Import do conteúdo"
curl -fsS -b "$JAR" -X POST "$API/db/" "${H[@]}" -F "importfile=@$IMPORT;type=application/json" >/dev/null

echo "→ routes.yaml"
curl -fsS -b "$JAR" -X POST "$API/settings/routes/yaml/" "${H[@]}" -F "routes=@$ROUTES;type=application/x-yaml" >/dev/null

echo "→ Cor da marca + navegação"
curl -fsS -b "$JAR" -X PUT "$API/settings/" -H "Content-Type: application/json" "${H[@]}" \
  -d '{"settings":[{"key":"accent_color","value":"#1976D2"},{"key":"navigation","value":"[{\"label\":\"Imóveis\",\"url\":\"/\"},{\"label\":\"Diferenciais\",\"url\":\"/#diferenciais\"},{\"label\":\"Financiamento\",\"url\":\"/financiamento/\"},{\"label\":\"Blog\",\"url\":\"/blog/\"},{\"label\":\"Contato\",\"url\":\"/contato/\"}]"}]}' >/dev/null

echo "✓ Pronto: $GHOST_URL  (admin em $GHOST_URL/ghost/)"
