#!/usr/bin/env node
/* Gera ghost/import/structure-import.json — configura a ESTRUTURA do portal:
   - Cria todas as editorias (tags públicas) com nome/slug/descrição.
   - Define o MENU principal (navigation) apontando para /tag/{slug}/.
   - Define o MENU secundário (Fontes oficiais) — usado no bloco "Fontes".
   - Cria as páginas institucionais (Sobre, Anuncie, Fontes oficiais, Contato).

   No Ghost: Settings → Labs → Import content → selecione structure-import.json.
   As páginas de cada categoria são automáticas (/tag/{slug}/) — não precisa
   criar uma a uma; basta a tag existir (este import cria todas). */

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, "structure-import.json");
const NOW = Date.UTC(2026, 5, 29, 12, 0, 0);
const iso = (ms) => new Date(ms).toISOString().replace(/\.\d+Z$/, ".000Z");

/* ---- editorias (tags públicas) ------------------------------------------ */
const EDITORIAS = [
  ["Política", "politica", "Governo, gestão e poder público em Mato Grosso."],
  ["Cidades", "cidades", "Cuiabá, Várzea Grande e os municípios de MT."],
  ["Polícia", "policia", "Segurança pública e serviços ao cidadão."],
  ["Economia", "economia", "Negócios, empreendedorismo e o bolso do cidadão."],
  ["Agro", "agro", "O agronegócio que move Mato Grosso."],
  ["Brasil & Mundo", "brasil-mundo", "Notícias nacionais e internacionais."],
  ["Esportes", "esportes", "Esporte amador e profissional em MT."],
  ["Cultura", "cultura", "Agenda, patrimônio e cultura."],
  ["Imóveis", "imoveis", "Mercado imobiliário, financiamento e moradia."],
  ["Serviços", "servicos", "Guias práticos e utilidade pública."],
];
const tags = EDITORIAS.map(([name, slug, description], i) => ({ id: i + 1, name, slug, description, visibility: "public" }));

/* ---- menu principal (navigation) ---------------------------------------- */
const navigation = [
  { label: "Política", url: "/tag/politica/" },
  { label: "Cidades", url: "/tag/cidades/" },
  { label: "Polícia", url: "/tag/policia/" },
  { label: "Economia", url: "/tag/economia/" },
  { label: "Agro", url: "/tag/agro/" },
  { label: "Brasil & Mundo", url: "/tag/brasil-mundo/" },
  { label: "Esportes", url: "/tag/esportes/" },
  { label: "Imóveis", url: "/tag/imoveis/" },
  { label: "Fontes", url: "/fontes-oficiais/" },
  { label: "Anuncie", url: "/anuncie/" },
];

/* ---- menu secundário (Fontes oficiais → bloco "Fontes") ----------------- */
const secondary_navigation = [
  { label: "SECOM Mato Grosso", url: "https://www.secom.mt.gov.br/noticias" },
  { label: "Prefeitura de Cuiabá", url: "https://www.cuiaba.mt.gov.br/" },
  { label: "Prefeitura de Várzea Grande", url: "https://www.varzeagrande.mt.gov.br/" },
  { label: "Gov.br / SECOM", url: "https://www.gov.br/secom/pt-br" },
  { label: "TV Assembleia MT", url: "https://www.youtube.com/tvassembleiamt" },
];

/* ---- páginas institucionais --------------------------------------------- */
const mobiledoc = (html) => JSON.stringify({ version: "0.3.1", atoms: [], markups: [], sections: [[10, 0]], cards: [["html", { html }]] });
let pid = 0;
const posts = [];
function page(title, slug, html) {
  posts.push({
    id: ++pid, title, slug, type: "page", status: "published", visibility: "public",
    mobiledoc: mobiledoc(html), created_at: iso(NOW), updated_at: iso(NOW), published_at: iso(NOW),
  });
}
page("Sobre o portal", "sobre",
  `<p>Portal de notícias de Mato Grosso — Cuiabá, Várzea Grande e região. Conteúdo de serviço e utilidade pública. Releases de órgãos oficiais são reproduzidos com atribuição; matérias de veículos privados são creditadas e linkadas à fonte.</p>`);
page("Anuncie conosco", "anuncie",
  `<p>Sua marca no portal. Formatos de banner gerenciados pela equipe comercial: <b>Topo</b> (970×250), <b>No vídeo</b> (300×250), <b>Vertical</b> (300×600), <b>Retângulo</b> (300×250) e <b>In-article</b> (728×90). Banners na mesma zona giram a cada 5 segundos.</p>
<p>Fale com o comercial: <a href="https://wa.me/5565999900005" target="_blank" rel="noopener">WhatsApp da redação</a>.</p>`);
page("Fontes oficiais", "fontes-oficiais",
  `<p>Acompanhe os canais oficiais. Releases de órgãos públicos são reproduzidos com atribuição.</p>
<ul>
  <li><a href="https://www.secom.mt.gov.br/noticias" target="_blank" rel="noopener">SECOM Mato Grosso</a></li>
  <li><a href="https://www.cuiaba.mt.gov.br/" target="_blank" rel="noopener">Prefeitura de Cuiabá</a></li>
  <li><a href="https://www.varzeagrande.mt.gov.br/" target="_blank" rel="noopener">Prefeitura de Várzea Grande</a></li>
  <li><a href="https://www.gov.br/secom/pt-br" target="_blank" rel="noopener">Gov.br / SECOM</a></li>
  <li><a href="https://www.youtube.com/tvassembleiamt" target="_blank" rel="noopener">TV Assembleia MT</a></li>
</ul>`);
page("Contato", "contato",
  `<p>Tem uma pauta, denúncia ou sugestão? Fale com a redação.</p>
<ul><li>💬 <a href="https://wa.me/5565999900005" target="_blank" rel="noopener">WhatsApp</a></li><li>✉️ <a href="mailto:ciencia@msn.com">ciencia@msn.com</a></li><li>📍 Cuiabá / Várzea Grande - MT</li></ul>`);

/* ---- settings (menus) --------------------------------------------------- */
const settings = [
  { key: "navigation", value: JSON.stringify(navigation) },
  { key: "secondary_navigation", value: JSON.stringify(secondary_navigation) },
];

const out = { db: [{ meta: { exported_on: NOW, version: "5.0.0" }, data: { posts, tags, posts_tags: [], settings } }] };
writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`OK: ${outPath} — tags=${tags.length} páginas=${posts.length} menu=${navigation.length} itens, fontes=${secondary_navigation.length}`);
