#!/usr/bin/env bash
# DESTAVE (desfixe) as matérias fixadas da CAPA — sem dor de cabeça. Entra na
# pasta certa sozinho, pergunta a Admin API Key (você cola SÓ ela) e roda o
# desfixar.mjs. Ao tirar o Featured, a capa deixa de "prender" manchetes antigas
# e o conteúdo passa a descer no fluxo cronológico (mais nova no topo) até o fim
# da rolagem/páginas. Roda na SUA máquina — a chave nunca sai daqui.
#
# Uso:
#   bash ghost/scripts/desfixar.sh hojemt              # SIMULA (dry-run): lista as
#                                                      # fixadas com +2 dias
#   bash ghost/scripts/desfixar.sh hojemt --tudo       # SIMULA destavar TODAS
#   bash ghost/scripts/desfixar.sh hojemt --tudo --apply  # DESTAVA todas de verdade
#   bash ghost/scripts/desfixar.sh hojemt --apply      # destava só as +2 dias
#
# Portais: hojemt, odiapolitico, pacunews
set -eo pipefail

# 1) vai pra raiz do repositório — funciona de qualquer pasta que você chamar
cd "$(cd "$(dirname "$0")/../.." && pwd)"

# 2) portal -> nome e a variável de ambiente da chave (keyEnv do sites.config.json)
PORTAL="${1:-}"
case "$PORTAL" in
  hojemt)        NOME="Hoje MT";        KEYENV="HOJEMT_ADMIN_KEY" ;;
  odiapolitico)  NOME="O Dia Político"; KEYENV="ODIAPOLITICO_ADMIN_KEY" ;;
  pacunews)      NOME="Pacu News";      KEYENV="PACUNEWS_ADMIN_KEY" ;;
  *) echo "Uso: bash ghost/scripts/desfixar.sh <hojemt|odiapolitico|pacunews> [--tudo] [--apply]"; exit 1 ;;
esac
shift

# 3) pede a chave (cole SÓ a chave e tecle Enter)
echo "Cole a Admin API Key do $NOME e tecle Enter."
echo "(Ghost Admin -> Settings -> Integrations -> Add custom integration -> copie a Admin API Key)"
printf "Chave: "
read -r KEY
case "$KEY" in
  *:*) : ;;
  *) echo "Isso não parece uma Admin API Key (falta o ':'). Copie de novo e rode outra vez."; exit 1 ;;
esac

# 4) roda: só este portal (--only), passando os flags (--tudo/--apply) adiante
export "$KEYENV=$KEY"
echo ""
node ghost/automation/desfixar.mjs --only="$PORTAL" "$@"
