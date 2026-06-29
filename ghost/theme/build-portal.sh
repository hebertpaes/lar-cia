#!/usr/bin/env bash
# Gera uma variante do tema lar-cia-news para um portal específico (nome + cor).
# O layout é o mesmo; muda só o nome do tema e a cor de destaque padrão.
#
# Uso:
#   bash build-portal.sh <slug> "<Nome do portal>" "<#cor>"
# Exemplos:
#   bash build-portal.sh odiapolitico "O Dia Político" "#C20017"
#   bash build-portal.sh hojemt       "Hoje MT"        "#C20017"
#   bash build-portal.sh larcia-news  "Lar & Cia News" "#1976D2"
#
# Saída: <slug>/ (pasta do tema) e <slug>.zip (pronto para subir no Ghost).
set -euo pipefail

SLUG="${1:?informe o slug, ex.: odiapolitico}"
NOME="${2:?informe o nome, ex.: \"O Dia Político\"}"
COR="${3:-#C20017}"

DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$DIR/lar-cia-news"
OUT="$DIR/$SLUG"

[ -d "$SRC" ] || { echo "Tema base não encontrado em $SRC"; exit 1; }

rm -rf "$OUT" "$DIR/$SLUG.zip"
cp -R "$SRC" "$OUT"

node -e '
const fs = require("fs");
const [file, slug, nome, cor] = process.argv.slice(1);
const j = JSON.parse(fs.readFileSync(file, "utf8"));
j.name = slug;
j.description = nome + " — portal de notícias de Mato Grosso.";
if (j.config && j.config.custom && j.config.custom.cor_destaque) j.config.custom.cor_destaque.default = cor;
fs.writeFileSync(file, JSON.stringify(j, null, 2) + "\n");
' "$OUT/package.json" "$SLUG" "$NOME" "$COR"

( cd "$DIR" && zip -rq "$SLUG.zip" "$SLUG" -x "*.DS_Store" )
echo "OK: $DIR/$SLUG.zip  (tema=$SLUG, cor=$COR)"
echo "Suba esse .zip em Settings → Design → Change theme → Upload, e defina o Site title e a logo no painel."
