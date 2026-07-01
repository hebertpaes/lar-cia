#!/usr/bin/env bash
# Ativa um portal SEM dor de cabeça. Entra na pasta certa sozinho, pergunta a
# Admin API Key (você cola SÓ ela, sem editar linha comprida) e roda o
# ativar-tudo.mjs. Roda na SUA máquina — a chave nunca sai daqui.
#
# Uso:
#   bash ghost/scripts/ativar.sh hojemt              # liga Membros/Portal, menu,
#                                                    # comentários e cria as
#                                                    # páginas do rodapé (mata o 404)
#   bash ghost/scripts/ativar.sh hojemt --dry-run    # só SIMULA, não altera nada
#   bash ghost/scripts/ativar.sh hojemt --completo   # + sobe o tema e importa as
#                                                    # 300 notícias
#
# Portais: hojemt, odiapolitico, pacunews
set -eo pipefail

# 1) vai pra raiz do repositório — funciona de qualquer pasta que você chamar
cd "$(cd "$(dirname "$0")/../.." && pwd)"

# 2) portal -> domínio, nome e cor
PORTAL="${1:-}"
case "$PORTAL" in
  hojemt)        DOM="hojemt.com.br";        NOME="Hoje MT";        COR="#C20017" ;;
  odiapolitico)  DOM="odiapolitico.com.br";  NOME="O Dia Político"; COR="#C20017" ;;
  pacunews)      DOM="pacunews.com.br";      NOME="Pacu News";      COR="#1466B8" ;;
  *) echo "Uso: bash ghost/scripts/ativar.sh <hojemt|odiapolitico|pacunews> [--dry-run] [--completo]"; exit 1 ;;
esac
shift

# 3) separa --completo dos demais flags (que são repassados ao node)
COMPLETO=0
PASS=""
for a in "$@"; do
  if [ "$a" = "--completo" ]; then COMPLETO=1; else PASS="$PASS $a"; fi
done

# 4) pede a chave (cole SÓ a chave e tecle Enter)
echo "Cole a Admin API Key do $NOME e tecle Enter."
echo "(Ghost Admin -> Settings -> Integrations -> Add custom integration -> copie a Admin API Key)"
printf "Chave: "
read -r KEY
case "$KEY" in
  *:*) : ;;
  *) echo "Isso não parece uma Admin API Key (falta o ':'). Copie de novo e rode outra vez."; exit 1 ;;
esac

# 5) opcional: gera o tema e prepara o conteúdo
export SITE_URL="https://$DOM"
export SITE_ADMIN_KEY="$KEY"
export EMAIL_CONTATO="contato@$DOM"
if [ "$COMPLETO" = "1" ]; then
  echo "• Gerando o tema de $NOME…"
  ( cd ghost/theme && bash build-portal.sh "$PORTAL" "$NOME" "$COR" )
  export THEME_ZIP="ghost/theme/$PORTAL.zip"
  export CONTENT_JSON="ghost/import/noticias-300.json"
fi

# 6) roda de verdade
echo ""
node ghost/scripts/ativar-tudo.mjs $PASS
