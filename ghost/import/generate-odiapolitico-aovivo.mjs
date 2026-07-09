#!/usr/bin/env node
/* Gera ghost/import/odiapolitico-aovivo-legislativo.json — 1 matéria do O Dia
   Político apresentando/resumindo a cobertura AO VIVO das casas legislativas,
   com as 4 sessões oficiais EMBUTIDAS (ALMT, Câmara dos Deputados, Senado e
   Câmara de Cuiabá). Tag "politica" → roteia para o O Dia Político.

   Publicar (na máquina do usuário, com a chave do portal):
     ODIAPOLITICO_ADMIN_KEY='id:secret' \
       node ghost/automation/publish.mjs ghost/import/odiapolitico-aovivo-legislativo.json --only=odiapolitico
*/
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = resolve(__dirname, "odiapolitico-aovivo-legislativo.json");

// Canais OFICIAIS no YouTube (IDs verificados por busca).
const CH = {
  almt: "UCIxlLEYzjWPLb_CXpc-e74w",   // TV Assembleia (ALMT)
  camara: "UC-ZkSRh-7UEuwXJQ9UMCFJA", // Câmara dos Deputados
  senado: "UCLgti7NuK0RuW9wty-fxPjQ", // TV Senado
  cuiaba: "UCNCoIaMma_H-aFP6rRNb56w", // Câmara Municipal de Cuiabá
};
const live = (ch) => `https://www.youtube.com/channel/${ch}/live`;
const embed = (ch, title) =>
  `<figure class="kg-card kg-embed-card"><iframe width="560" height="315" ` +
  `src="https://www.youtube.com/embed/live_stream?channel=${ch}&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3" ` +
  `title="${title}" frameborder="0" loading="lazy" ` +
  `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ` +
  `allowfullscreen></iframe></figure>`;

const html = [
  `<p class="post-deck"><strong>Acompanhe as sessões e votações em tempo real, num só lugar.</strong></p>`,
  `<p>O Dia Político passa a transmitir, ao vivo, as sessões das casas legislativas que mais impactam Mato Grosso e o país. Num só lugar, o leitor acompanha a Assembleia Legislativa de Mato Grosso (ALMT), a Câmara dos Deputados, o Senado Federal e a Câmara Municipal de Cuiabá — do plenário às comissões, com as votações que definem o ambiente político, econômico e de negócios do estado.</p>`,
  `<h3>ALMT — Assembleia Legislativa de Mato Grosso</h3>`, embed(CH.almt, "ALMT ao vivo"),
  `<h3>Câmara dos Deputados</h3>`, embed(CH.camara, "Câmara dos Deputados ao vivo"),
  `<h3>Senado Federal</h3>`, embed(CH.senado, "TV Senado ao vivo"),
  `<h3>Câmara Municipal de Cuiabá</h3>`, embed(CH.cuiaba, "Câmara de Cuiabá ao vivo"),
  `<p>As transmissões seguem a agenda de cada casa — em geral de terça a quinta-feira, nos dias de sessão e de reuniões das comissões. Fora dos horários de sessão, o player exibe a programação mais recente do canal oficial.</p>`,
  `<p>Para o leitor de O Dia Político, acompanhar as votações em tempo real é acompanhar, na origem, as decisões que afetam orçamento, investimentos, economia e negócios em Mato Grosso — antes de virarem manchete.</p>`,
].join("");

const mobiledoc = JSON.stringify({ version: "0.3.1", atoms: [], markups: [], sections: [[10, 0]], cards: [["html", { html }]] });
const now = new Date().toISOString().replace(/\.\d+Z$/, ".000Z");

const caption =
  `Transmissões oficiais no YouTube: ` +
  `<a href="${live(CH.almt)}" target="_blank" rel="noopener">TV Assembleia (ALMT)</a>, ` +
  `<a href="${live(CH.camara)}" target="_blank" rel="noopener">Câmara dos Deputados</a>, ` +
  `<a href="${live(CH.senado)}" target="_blank" rel="noopener">TV Senado</a> e ` +
  `<a href="${live(CH.cuiaba)}" target="_blank" rel="noopener">Câmara de Cuiabá</a>.`;

const tags = [
  { id: 1, name: "Política", slug: "politica", visibility: "public", description: null },
  { id: 2, name: "Congresso", slug: "congresso", visibility: "public", description: null },
  { id: 3, name: "Vídeo", slug: "video", visibility: "public", description: null },
];
const posts = [{
  id: 1,
  title: "O Dia Político transmite ao vivo ALMT, Congresso e Câmara de Cuiabá",
  slug: "ao-vivo-legislativo-almt-congresso-camara-cuiaba",
  type: "post", status: "published", visibility: "public", featured: true,
  mobiledoc, feature_image: null, feature_image_caption: caption,
  custom_excerpt: "O Dia Político transmite ao vivo as sessões da ALMT, da Câmara dos Deputados, do Senado e da Câmara de Cuiabá — votações em tempo real, num só lugar.",
  created_at: now, updated_at: now, published_at: now,
}];
const posts_tags = [
  { tag_id: 1, post_id: 1, sort_order: 0 },
  { tag_id: 2, post_id: 1, sort_order: 1 },
  { tag_id: 3, post_id: 1, sort_order: 2 },
];

const db = { db: [{ meta: { exported_on: Date.now(), version: "5.0.0" }, data: { posts, tags, posts_tags } }] };
writeFileSync(out, JSON.stringify(db, null, 2) + "\n", "utf8");
console.log(`OK: ${out} — 1 post (tags: politica, congresso, video)`);
