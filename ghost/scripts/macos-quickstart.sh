#!/usr/bin/env bash
# =====================================================================
# Lar&Cia — Quickstart para macOS
# Sobe um Ghost LOCAL, provisiona o projeto "Lar&Cia" (tema + conteúdo +
# rotas + marca), roda os testes e abre no navegador. Um comando só.
#
#   bash ghost/scripts/macos-quickstart.sh
#
# Variáveis opcionais:
#   GHOST_DIR   diretório da instalação local   (padrão ~/lar-cia-ghost)
#   GHOST_URL   URL do Ghost local              (padrão http://localhost:2368)
#   ADMIN_EMAIL / ADMIN_PASS  credenciais do admin (padrão demo)
# =====================================================================
set -euo pipefail

GHOST_DIR="${GHOST_DIR:-$HOME/lar-cia-ghost}"
GHOST_URL="${GHOST_URL:-http://localhost:2368}"
ADMIN_EMAIL="${ADMIN_EMAIL:-ciencia@msn.com}"
ADMIN_PASS="${ADMIN_PASS:-LarCia#2026Forte}"
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"   # raiz do repositório

say() { printf "\n\033[1;34m▶ %s\033[0m\n" "$1"; }
die() { printf "\n\033[1;31m✗ %s\033[0m\n" "$1" >&2; exit 1; }

# --- Pré-requisitos --------------------------------------------------
command -v node >/dev/null 2>&1 || die "Node não encontrado. Instale: brew install node@22"
command -v npm  >/dev/null 2>&1 || die "npm não encontrado (vem com o Node)."
command -v zip  >/dev/null 2>&1 || die "zip não encontrado."

if ! command -v ghost >/dev/null 2>&1; then
  say "Instalando Ghost CLI (npm -g ghost-cli)"
  npm install -g ghost-cli
fi

# --- Instalar OU iniciar o Ghost local -------------------------------
mkdir -p "$GHOST_DIR"
if [ -f "$GHOST_DIR/.ghost-cli" ]; then
  say "Ghost já instalado em $GHOST_DIR — iniciando"
  ( cd "$GHOST_DIR" && ghost start || ghost restart )
else
  say "Instalando Ghost local em $GHOST_DIR (SQLite, dev)"
  ( cd "$GHOST_DIR" && ghost install local )
fi

# --- Esperar ficar no ar ---------------------------------------------
say "Aguardando o Ghost responder em $GHOST_URL"
for i in $(seq 1 40); do
  curl -fsS -o /dev/null "$GHOST_URL/ghost/" && break
  sleep 1
  [ "$i" = 40 ] && die "Ghost não respondeu a tempo."
done

# --- Provisionar o projeto Lar&Cia -----------------------------------
say "Provisionando o projeto Lar&Cia (tema + conteúdo + rotas + marca)"
GHOST_URL="$GHOST_URL" ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASS="$ADMIN_PASS" \
  BLOG_TITLE="Lar&Cia" bash "$REPO_ROOT/ghost/scripts/local-setup.sh"

# --- Testes ----------------------------------------------------------
say "Rodando os testes de fumaça"
GHOST_URL="$GHOST_URL" bash "$REPO_ROOT/ghost/scripts/smoke-test.sh"

# --- Abrir no navegador ----------------------------------------------
say "Pronto! Abrindo $GHOST_URL"
echo "  Site:  $GHOST_URL"
echo "  Admin: $GHOST_URL/ghost  (login: $ADMIN_EMAIL)"
command -v open >/dev/null 2>&1 && open "$GHOST_URL" || true
