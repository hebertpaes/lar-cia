#!/usr/bin/env node
/* Gera ghost/import/secom-hoje.json — matérias do DIA (30/06/2026) baseadas em
   notícias OFICIAIS do Governo de Mato Grosso (SECOM-MT) e órgãos do Estado.

   PROCEDÊNCIA / HONESTIDADE: o site da SECOM bloqueia leitura automática do
   corpo das matérias neste ambiente. Os fatos abaixo (números, datas, ações)
   foram levantados em buscas públicas das próprias publicações oficiais e de
   veículos que as reproduziram em junho/2026. Cada texto traz SEMPRE a fonte e
   o link. REVISE contra o original antes de publicar em produção — em especial
   nomes de autoridades, valores e datas.

   Uso: node ghost/import/generate-secom-hoje.mjs
   Importe em: Ghost Admin → Settings → Labs → Import content
   ou publique via automação: node ghost/automation/publish.mjs ghost/import/secom-hoje.json */

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, "secom-hoje.json");

const slugify = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const mobiledoc = (html) => JSON.stringify({
  version: "0.3.1", atoms: [], markups: [], sections: [[10, 0]], cards: [["html", { html }]],
});
const photo = (seed) => `https://picsum.photos/seed/${seed}/1200/675`;

const BASE_MS = Date.UTC(2026, 5, 30, 18, 0, 0); // 30/06/2026
const iso = (ms) => new Date(ms).toISOString().replace(/\.\d+Z$/, ".000Z");

const tags = [];
const tagId = new Map();
function tag(name, slug, visibility, description) {
  if (tagId.has(slug)) return tagId.get(slug);
  const id = tags.length + 1;
  tags.push({ id, name, slug, visibility, description: description || null });
  tagId.set(slug, id);
  return id;
}
const EDIT = {
  politica: tag("Política", "politica", "public", "Governo, gestão e poder público em Mato Grosso."),
  cidades: tag("Cidades", "cidades", "public", "Saúde, educação e serviços nos municípios de MT."),
  economia: tag("Economia", "economia", "public", "Economia, indústria e desenvolvimento."),
  agro: tag("Agro", "agro", "public", "O agronegócio que move Mato Grosso."),
};
const T_SECOM = tag("#fonte-secom", "hash-fonte-secom", "internal");
const T_VIDEO = tag("Vídeo", "video", "public", "Matérias com vídeo.");

const posts = [];
const posts_tags = [];
let pid = 0;
let when = BASE_MS;
function addPost({ title, slug, html, feature_image, feature_image_caption, custom_excerpt, tagIds }) {
  const id = ++pid;
  const published = when; when -= 35 * 60 * 1000;
  posts.push({
    id, title, slug: slugify(slug || title), type: "post", status: "published", visibility: "public",
    mobiledoc: mobiledoc(html), feature_image: feature_image || null,
    feature_image_caption: feature_image_caption || null, custom_excerpt: custom_excerpt || null,
    created_at: iso(published), updated_at: iso(published), published_at: iso(published),
  });
  tagIds.forEach((tid, i) => posts_tags.push({ tag_id: tid, post_id: id, sort_order: i }));
  return id;
}
const body = (paras) => paras.map((p) => `<p>${esc(p)}</p>`).join("");
// A FONTE vai na legenda da imagem (feature_image_caption) — aparece logo ABAIXO da foto.
const credito = (fonte) => `Fonte: <a href="${fonte.url}" target="_blank" rel="noopener">${esc(fonte.nome)}</a>`;

// Ordem do array = ordem de publicação (1º = mais recente = manchete).
const NEWS = [
  { ed: "politica", seed: "mt-lidera-investimentos-2026", title: "Governo de MT lidera investimentos e avança em entregas em todas as regiões",
    excerpt: "Estado afirma manter ritmo recorde de obras em 2026, sustentado pela saúde fiscal construída nos últimos anos.",
    paras: [
      "O Governo de Mato Grosso afirma liderar os investimentos públicos e avançar em entregas que melhoram a vida da população em todas as regiões do estado.",
      "Segundo o Executivo estadual, os aportes em obras e ações cresceram de forma expressiva nos últimos anos, e a expectativa para 2026 é manter o alto nível de investimentos, sustentado pela solidez fiscal construída no período.",
      "As entregas envolvem infraestrutura, saúde, educação e segurança, com foco em levar serviços a municípios de todo o território mato-grossense.",
    ], fonte: { nome: "SECOM-MT", url: "https://www.secom.mt.gov.br/w/governo-de-mt-lidera-investimentos-avan%C3%A7a-em-entregas-e-melhora-vida-da-popula%C3%A7%C3%A3o-em-todas-as-regi%C3%B5es" } },

  { ed: "economia", seed: "investimentos-crescem-637", title: "Investimentos do Estado crescem 637% e sustentam novo ciclo de obras em 2026",
    excerpt: "Aportes saltaram de R$ 773,5 milhões em 2019 para R$ 5,7 bilhões em 2025, segundo o Governo de MT.",
    paras: [
      "Os investimentos do Governo de Mato Grosso cresceram 637,2% entre 2019 e 2025, passando de R$ 773,5 milhões para R$ 5,7 bilhões ao ano.",
      "De acordo com o Estado, o salto foi possível graças ao reequilíbrio das contas públicas e à disciplina fiscal adotada no período, o que abriu espaço para ampliar obras sem comprometer o pagamento de servidores e fornecedores.",
      "A expectativa é manter o patamar elevado de investimentos em 2026, sustentando um novo ciclo de obras em infraestrutura, saúde e educação.",
    ], fonte: { nome: "SECOM-MT", url: "https://www.secom.mt.gov.br/noticias" } },

  { ed: "politica", seed: "60-mil-casas-populares", title: "Governo encaminha à Assembleia projeto para viabilizar mais 60 mil casas populares",
    excerpt: "Proposta enviada à AL busca ampliar o acesso à moradia em Mato Grosso.",
    paras: [
      "O Governo de Mato Grosso, sob o comando do governador Otaviano Pivetta, encaminhou à Assembleia Legislativa um projeto para viabilizar a construção de mais 60 mil casas populares no estado.",
      "A proposta integra a política habitacional do Estado e tem como objetivo ampliar o acesso à moradia, com foco em famílias de baixa renda.",
      "Caso aprovada, a medida deve impulsionar a habitação popular em municípios de diferentes regiões de Mato Grosso.",
    ], fonte: { nome: "SECOM-MT / Sinfra", url: "https://www.secom.mt.gov.br/noticias" } },

  { ed: "cidades", seed: "hospital-regional-barra-garcas", title: "Governo anuncia construção de Hospital Regional em Barra do Garças",
    excerpt: "Município terá 60 dias para apresentar terreno e documentação; depois o Estado inicia os projetos técnicos.",
    paras: [
      "O Governo de Mato Grosso anunciou a construção de um Hospital Regional em Barra do Garças, em encontro com o prefeito e vereadores do município.",
      "Pelo cronograma apresentado, o município terá 60 dias para apresentar o terreno e a documentação da área. Em seguida, o Estado inicia os projetos técnicos e avança para a fase de licitação.",
      "A nova unidade deve ampliar o atendimento de média e alta complexidade para a população da região do Araguaia.",
    ], fonte: { nome: "SECOM-MT", url: "https://www.secom.mt.gov.br/noticias" } },

  { ed: "politica", seed: "7-mil-km-asfalto-2026", title: "Mais de 7 mil km de novo asfalto serão entregues até o fim de 2026",
    excerpt: "Volume previsto equivale ao dobro do pavimentado em 271 anos de história do estado, afirma o Governo.",
    paras: [
      "O Governo de Mato Grosso projeta entregar mais de 7 mil quilômetros de novo asfalto até o fim de 2026.",
      "Segundo o Estado, o volume previsto para o período corresponde ao dobro de tudo o que foi pavimentado em 271 anos de história de Mato Grosso.",
      "As obras viárias buscam melhorar a logística, reduzir custos de transporte e integrar as regiões produtoras do estado.",
    ], fonte: { nome: "SECOM-MT", url: "https://www.secom.mt.gov.br/noticias" } },

  { ed: "cidades", seed: "meninas-que-transformam-prazo", title: "Inscrições do programa 'Meninas que Transformam' terminam nesta segunda (30)",
    excerpt: "Iniciativa da Seplag oferece estágio a alunas do Ensino Médio; inscrições vão até as 18h pelo SiesMT.",
    paras: [
      "Terminam nesta segunda-feira (30) as inscrições para o programa 'Meninas que Transformam', do Governo de Mato Grosso, voltado a alunas do Ensino Médio.",
      "As inscrições podem ser feitas até as 18h por meio do sistema SiesMT. A iniciativa é conduzida pela Secretaria de Estado de Planejamento e Gestão (Seplag) em parceria com o Gabinete de Enfrentamento à Violência de Gênero contra a Mulher.",
      "O programa busca aproximar as estudantes do mundo do trabalho e estimular a participação feminina em diferentes áreas.",
    ], fonte: { nome: "SECOM-MT / SEPLAG", url: "https://www.secom.mt.gov.br/noticias" } },

  { ed: "cidades", seed: "10-obras-infraestrutura-cuiaba", title: "Veja 10 obras de infraestrutura do Governo de MT em Cuiabá",
    excerpt: "Estado lista intervenções viárias e estruturantes que mudam a mobilidade na capital.",
    paras: [
      "O Governo de Mato Grosso destacou dez obras de infraestrutura realizadas em Cuiabá, com foco em mobilidade urbana e qualidade de vida na capital.",
      "Entre as intervenções estão obras viárias, drenagem e requalificação de avenidas e corredores que concentram grande fluxo de veículos.",
      "Segundo a Sinfra, as entregas integram o plano do Estado de modernizar a infraestrutura da capital e da região metropolitana.",
    ], fonte: { nome: "SECOM-MT / Sinfra", url: "https://www.secom.mt.gov.br/web/sinfra/w/veja-10-obras-de-infraestrutura-realizadas-pelo-governo-de-mato-grosso-em-cuiab%C3%A1" } },

  { ed: "agro", seed: "regularizacao-ambiental-referencia", title: "Mato Grosso é destaque em regularização ambiental, afirma secretária",
    excerpt: "Estado afirma ter a estratégia mais consistente de regularização ambiental do país, com avanço no CAR.",
    paras: [
      "Mato Grosso tem a estratégia mais consistente de regularização ambiental do país, segundo a secretária da área, em balanço divulgado pelo Governo do Estado.",
      "O trabalho avança com o Cadastro Ambiental Rural (CAR) e o apoio à recuperação de áreas, conciliando produção agropecuária e preservação.",
      "A regularização dá mais segurança jurídica ao produtor e fortalece a imagem do agro mato-grossense nos mercados.",
    ], fonte: { nome: "SECOM-MT / Sema", url: "https://www.secom.mt.gov.br/noticias" } },
];

// Marca algumas matérias com vídeo (bloco "Vídeos" da barra lateral).
const COM_VIDEO = new Set(["mt-lidera-investimentos-2026", "10-obras-infraestrutura-cuiaba", "hospital-regional-barra-garcas"]);
NEWS.forEach((n) => {
  const tagIds = [EDIT[n.ed], T_SECOM];
  if (COM_VIDEO.has(n.seed)) tagIds.push(T_VIDEO);
  addPost({
    title: n.title, slug: n.seed, html: body(n.paras),
    feature_image: photo(n.seed), feature_image_caption: credito(n.fonte),
    custom_excerpt: n.excerpt, tagIds,
  });
});

const out = { db: [{ meta: { exported_on: BASE_MS, version: "5.0.0" }, data: { posts, tags, posts_tags } }] };
writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`OK: ${outPath} — posts=${posts.length} tags=${tags.length} posts_tags=${posts_tags.length}`);
