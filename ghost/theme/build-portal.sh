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
  # versão branca p/ dark mode (se existir); senão reusa a colorida
  if [ -f "$DIR/../brand/$SLUG-logo-branco.svg" ]; then
    cp "$DIR/../brand/$SLUG-logo-branco.svg" "$OUT/assets/img/logo-branco.svg"
  else
    cp "$DIR/../brand/$SLUG-logo.svg" "$OUT/assets/img/logo-branco.svg"
  fi
  node -e '
    const fs = require("fs");
    const out = process.argv[1];
    const span = "<span class=\"brand-mark\">{{@site.title}}</span>";
    // duas imagens: colorida (light) e branca (dark) — o CSS troca conforme o tema
    const pair = (base) =>
      `<img class="${base} logo-light" src="{{asset "img/logo.svg"}}" alt="{{@site.title}}" />` +
      `<img class="${base} logo-dark" src="{{asset "img/logo-branco.svg"}}" alt="{{@site.title}}" />`;
    for (const [file, base] of [["partials/site-header.hbs", "brand-logo"], ["partials/site-footer.hbs", "footer-logo"]]) {
      const p = out + "/" + file;
      fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace(span, pair(base)));
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

# O Dia Político — pele "Fox News": faixa de editorias política (aba vermelha
# "Início" + AO VIVO), home com editorias políticas e a folha de estilo Fox.
if [ "$SLUG" = "odiapolitico" ]; then
  node -e '
    const fs = require("fs");
    const out = process.argv[1];
    // 1) Faixa de editorias no estilo Fox (aba vermelha "Início" + AO VIVO).
    const nav = out + "/partials/main-nav.hbs";
    let s = fs.readFileSync(nav, "utf8");
    const strip = "{{!-- FALLBACK-NAV-START --}}\n" +
      "                    <li class=\"nav-home\"><a href=\"{{@site.url}}/\">Início</a></li>\n" +
      "                    <li><a href=\"{{@site.url}}/tag/politica/\">Política</a></li>\n" +
      "                    <li><a href=\"{{@site.url}}/tag/congresso/\">Congresso</a></li>\n" +
      "                    <li><a href=\"{{@site.url}}/tag/governo/\">Governo</a></li>\n" +
      "                    <li><a href=\"{{@site.url}}/tag/brasil-mundo/\">Brasil</a></li>\n" +
      "                    <li><a href=\"{{@site.url}}/tag/internacional/\">Mundo</a></li>\n" +
      "                    <li><a href=\"{{@site.url}}/tag/colunas/\">Colunas</a></li>\n" +
      "                    <li class=\"nav-live\"><a href=\"{{@site.url}}/#live\">AO VIVO</a></li>\n" +
      "                    {{!-- FALLBACK-NAV-END --}}";
    s = s.replace(/\{\{!-- FALLBACK-NAV-START --\}\}[\s\S]*?\{\{!-- FALLBACK-NAV-END --\}\}/, strip);
    fs.writeFileSync(nav, s);
    // 2) Home: troca as editorias gerais por editorias políticas.
    const home = out + "/home.hbs";
    let h = fs.readFileSync(home, "utf8");
    const pol =
      "    {{> section-block slug=\"congresso\"     titulo=\"Congresso\"            filter=\"tag:congresso+tag:-hash-ad\"}}\n" +
      "    {{> section-block slug=\"governo\"       titulo=\"Governo\"              filter=\"tag:governo+tag:-hash-ad\"}}\n\n" +
      "    {{> ad zone=\"inarticle\" filter=\"tag:hash-ad-inarticle\" limit=\"6\"}}\n\n" +
      "    {{> section-block slug=\"brasil-mundo\"  titulo=\"Brasil &amp; Mundo\"    filter=\"tag:brasil-mundo+tag:-hash-ad\"}}\n" +
      "    {{> section-block slug=\"internacional\" titulo=\"Mundo\"                filter=\"tag:internacional+tag:-hash-ad\"}}\n" +
      "    {{> section-block slug=\"colunas\"       titulo=\"Colunas &amp; Opinião\" filter=\"tag:colunas+tag:-hash-ad\"}}\n";
    h = h.replace(/(\{\{!-- ===== Demais editorias ===== --\}\}\n<div class="container sections">\n)[\s\S]*?(\n<\/div>)/, "$1" + pol + "$2");
    // 3) Player AO VIVO vira o LEGISLATIVO (ALMT, Câmara, Senado, Câmara de Cuiabá).
    h = h.replace("{{> live}}", "{{> live-legislativo}}");
    fs.writeFileSync(home, h);
  ' "$OUT"
  # 3) Anexa a pele Fox ao CSS do tema (só nesta variação).
  cat "$DIR/overrides/odiapolitico-fox.css" >> "$OUT/assets/css/screen.css"
fi

# Pacu News: identidade VERMELHO + BRANCO → o "quase-preto" do tema (barra do
# menu e newsletter) vira vermelho só nesse portal.
if [ "$SLUG" = "pacunews" ]; then
  printf '\n/* Pacu News — identidade vermelho + branco */\n:root{ --nav-bg:#c11616; }\n[data-theme="dark"]{ --nav-bg:#8f1010; }\n' >> "$OUT/assets/css/screen.css"
fi

( cd "$DIR" && zip -rq "$SLUG.zip" "$SLUG" -x "*.DS_Store" )
echo "OK: $DIR/$SLUG.zip  (tema=$SLUG, cor=$COR)"
echo "Suba esse .zip em Settings → Design → Change theme → Upload, e defina o Site title e a logo no painel."
