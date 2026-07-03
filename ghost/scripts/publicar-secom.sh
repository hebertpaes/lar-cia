#!/usr/bin/env bash
# Esteira COMPLETA da SECOM, na SUA máquina (IP do Brasil, que o site não bloqueia):
#   1) coleta as notícias do dia (navegador headless)
#   2) edita cada matéria com IA (título/subtítulo/corpo/resumo SEO)
#   3) publica nos portais, roteando por editoria
#
# As chaves ficam com VOCÊ — em variáveis de ambiente ou no arquivo (gitignored)
# ghost/automation/.env.local (veja .env.local.example). Nada de chave no repo.
#
# Uso:
#   bash ghost/scripts/publicar-secom.sh --dry-run   # só simula (não publica)
#   bash ghost/scripts/publicar-secom.sh             # publica de verdade
set -eo pipefail
cd "$(cd "$(dirname "$0")/../.." && pwd)"

# 1) carrega as chaves locais, se existir o arquivo (NÃO versionado)
if [ -f ghost/automation/.env.local ]; then set -a; . ghost/automation/.env.local; set +a; fi

# 2) navegador headless (instala uma vez)
if ! node -e "require.resolve('playwright')" >/dev/null 2>&1; then
  echo "• Instalando o navegador headless (uma vez)…"
  npm i playwright >/dev/null 2>&1 && npx playwright install chromium
fi

DRY=""; [ "$1" = "--dry-run" ] && DRY="--dry-run"
OUT="ghost/import/secom-hoje.json"

echo "• 1/3 Coletando a SECOM (navegador headless)…"
node ghost/automation/secom-headless.mjs --out="$OUT" --verbose || { echo "A SECOM não retornou matérias (veja o log acima)."; exit 1; }

echo "• 2/3 Editando as matérias com IA…"
node ghost/automation/reescrever.mjs "$OUT" --verbose

echo "• 3/3 Publicando ${DRY:-(de verdade)}…"
node ghost/automation/publish.mjs "$OUT" $DRY

echo "✅ Concluído."
