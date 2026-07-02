#!/usr/bin/env bash
# =============================================================================
# Instala o portal de notícias LAR & CIA News no seu Ghost local, de uma vez:
#   1) envia o tema lar-cia-news      2) ativa o tema
#   3) sobe o roteamento (routes.yaml) 4) importa o conteúdo de demonstração
#
# Pré-requisito (uma vez): uma Admin API Key do Ghost.
#   Ghost Admin → Settings → Integrations → Add custom integration →
#   nome "Setup" → copie a "Admin API Key" (formato id:secret).
#
# Uso:
#   GHOST_ADMIN_API_KEY='SUA_CHAVE_id:secret' bash ghost/scripts/setup-news-portal.sh
#
# A chave fica só no seu Mac. Nada é enviado para fora da sua máquina.
# =============================================================================
set -euo pipefail

GHOST_URL="${GHOST_URL:-http://localhost:2368}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/../.." && pwd)"
THEME_PARENT="$REPO/ghost/theme"
THEME_DIR="$THEME_PARENT/lar-cia-news"
ROUTES="$THEME_DIR/routes.yaml"
IMPORT_JSON="$REPO/ghost/import/news-import.json"
API="$GHOST_URL/ghost/api/admin"

say() { printf "\033[1;34m→ %s\033[0m\n" "$1"; }
ok()  { printf "\033[1;32m✓ %s\033[0m\n" "$1"; }
die() { printf "\033[1;31m✗ %s\033[0m\n" "$1" >&2; exit 1; }

[ -n "${GHOST_ADMIN_API_KEY:-}" ] || die "Defina GHOST_ADMIN_API_KEY. \
Pegue em: Ghost Admin → Settings → Integrations → Add custom integration → Admin API Key. \
Depois rode:  GHOST_ADMIN_API_KEY='id:secret' bash $0"
[ -d "$THEME_DIR" ] || die "Tema não encontrado em $THEME_DIR (rode 'git pull' primeiro)."
[ -f "$IMPORT_JSON" ] || die "Conteúdo não encontrado em $IMPORT_JSON (rode 'git pull' primeiro)."
command -v node >/dev/null || die "Node.js não encontrado no PATH."
command -v curl >/dev/null || die "curl não encontrado."
command -v zip  >/dev/null || die "zip não encontrado."

say "Verificando se o Ghost está no ar em $GHOST_URL …"
curl -fsS "$GHOST_URL/ghost/api/admin/site/" >/dev/null 2>&1 \
  || curl -fsS "$GHOST_URL/" >/dev/null 2>&1 \
  || die "Não consegui falar com o Ghost em $GHOST_URL. Ele está rodando?"

token() { GHOST_ADMIN_API_KEY="$GHOST_ADMIN_API_KEY" node "$SCRIPT_DIR/ghost-jwt.mjs"; }

say "Empacotando o tema…"
TMPDIR="$(mktemp -d)"; ZIP="$TMPDIR/lar-cia-news.zip"
( cd "$THEME_PARENT" && zip -rq "$ZIP" lar-cia-news -x "*.DS_Store" )

say "Enviando o tema para o Ghost…"
curl -fsS -X POST "$API/themes/upload/" \
  -H "Authorization: Ghost $(token)" \
  -F "file=@$ZIP;type=application/zip" >/dev/null \
  || die "Falha ao enviar o tema (a chave de API está correta?)."

say "Ativando o tema lar-cia-news…"
curl -fsS -X PUT "$API/themes/lar-cia-news/activate/" \
  -H "Authorization: Ghost $(token)" >/dev/null \
  || die "Falha ao ativar o tema."
ok "Tema enviado e ativado."

say "Subindo o roteamento de editorias (routes.yaml)…"
curl -fsS -X POST "$API/settings/routes/yaml/" \
  -H "Authorization: Ghost $(token)" \
  -F "routes=@$ROUTES;type=application/yaml" >/dev/null \
  || curl -fsS -X POST "$API/settings/routes/yaml/" \
       -H "Authorization: Ghost $(token)" \
       -F "routes=@$ROUTES" >/dev/null \
  || die "Falha ao subir o routes.yaml."
ok "Roteamento aplicado (/editoria/{slug}/, /autor/{slug}/)."

say "Importando o conteúdo de demonstração (editorias, matérias, anúncios)…"
curl -fsS -X POST "$API/db/" \
  -H "Authorization: Ghost $(token)" \
  -F "importfile=@$IMPORT_JSON;type=application/json" >/dev/null \
  || die "Falha ao importar o conteúdo."
ok "Conteúdo importado."

rm -rf "$TMPDIR"
printf "\n"
ok "Portal pronto! Abra: $GHOST_URL/"
echo "   Admin: $GHOST_URL/ghost  ·  Editorias: $GHOST_URL/editoria/politica/"
echo "   Publicidade: veja ghost/theme/lar-cia-news/PUBLICIDADE.md"
