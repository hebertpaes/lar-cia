#!/usr/bin/env bash
# Gera uma variante do tema lar-cia-news para um portal específico (nome + cor).
# O layout é o mesmo; muda só o nome do tema e a cor de destaque padrão.
#
# Uso:
#   bash build-portal.sh <slug> "<Nome do portal>" "<#cor>" [dominio.com.br]
# O e-mail de contato vira contato@<dominio> (derivado do slug se omitido).
# Exemplos:
#   bash build-portal.sh odiapolitico "O Dia Político" "#C20017"
#   bash build-portal.sh hojemt       "Hoje MT"        "#C20017"
#   bash build-portal.sh pacunews     "Pacu News"      "#1466B8"
#   bash build-portal.sh larcia-news  "Lar & Cia News" "#1976D2"
#
# Saída: <slug>/ (pasta do tema) e <slug>.zip (pronto para subir no Ghost).
set -euo pipefail

SLUG="${1:?informe o slug, ex.: odiapolitico}"
NOME="${2:?informe o nome, ex.: \"O Dia Político\"}"
COR="${3:-#C20017}"
# 4º argumento opcional: domínio (ex.: hojemt.com.br). Se ausente, deriva do slug.
case "$SLUG" in
  hojemt)             DOM_DEFAULT="hojemt.com.br" ;;
  odiapolitico)       DOM_DEFAULT="odiapolitico.com.br" ;;
  estadomt)           DOM_DEFAULT="estadomt.com.br" ;;
  hebertpaes)         DOM_DEFAULT="hebertpaes.com.br" ;;
  pacunews)           DOM_DEFAULT="pacunews.com.br" ;;
  larcia|larcia-news) DOM_DEFAULT="larcia.com.br" ;;
  *)                  DOM_DEFAULT="$SLUG.com.br" ;;
esac
DOM="${4:-$DOM_DEFAULT}"
EMAIL="contato@$DOM"

DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$DIR/lar-cia-news"
OUT="$DIR/$SLUG"

[ -d "$SRC" ] || { echo "Tema base não encontrado em $SRC"; exit 1; }

rm -rf "$OUT" "$DIR/$SLUG.zip"
cp -R "$SRC" "$OUT"

# Banner do portal (house ad) — usa o GIF da marca, se existir
mkdir -p "$OUT/assets/img"
[ -f "$DIR/../banners/anuncie-$SLUG.gif" ] && cp "$DIR/../banners/anuncie-$SLUG.gif" "$OUT/assets/img/anuncie.gif"

# Logo da marca (se existir): embute no tema e faz o cabeçalho/rodapé usarem ele
# quando o Ghost ainda não tem um logo definido. Portais sem SVG mantêm o nome
# em texto (o tema-base não é alterado).
if [ -f "$DIR/../brand/$SLUG-logo.svg" ]; then
  cp "$DIR/../brand/$SLUG-logo.svg" "$OUT/assets/img/logo.svg"
  node -e '
    const fs = require("fs");
    const out = process.argv[1];
    const span = "<span class=\"brand-mark\">{{@site.title}}</span>";
    const img = (cls) => `<img class="${cls}" src="{{asset "img/logo.svg"}}" alt="{{@site.title}}" />`;
    for (const [file, cls] of [["partials/site-header.hbs", "brand-logo"], ["partials/site-footer.hbs", "footer-logo"]]) {
      const p = out + "/" + file;
      fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace(span, img(cls)));
    }
  ' "$OUT"
fi

node -e '
const fs = require("fs");
const [file, slug, nome, cor, email] = process.argv.slice(1);
const j = JSON.parse(fs.readFileSync(file, "utf8"));
j.name = slug;
j.description = nome + " — portal de notícias de Mato Grosso.";
if (j.author) j.author.email = email;
const c = j.config && j.config.custom;
if (c && c.cor_destaque) c.cor_destaque.default = cor;
if (c && c.email_contato) c.email_contato.default = email;
fs.writeFileSync(file, JSON.stringify(j, null, 2) + "\n");
' "$OUT/package.json" "$SLUG" "$NOME" "$COR" "$EMAIL"

( cd "$DIR" && zip -rq "$SLUG.zip" "$SLUG" -x "*.DS_Store" )
echo "OK: $DIR/$SLUG.zip  (tema=$SLUG, cor=$COR)"
echo "Suba esse .zip em Settings → Design → Change theme → Upload, e defina o Site title e a logo no painel."
