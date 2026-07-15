#!/usr/bin/env node
/* Colunas de ANÁLISE POLÍTICA de Mato Grosso para o O Dia Político — no gênero
   "quem está na disputa" (ex.: a coluna do RDNews sobre o PSDB). Ancoradas em
   FATOS PÚBLICOS do ciclo 2026 (eleição em 4/10/2026: governador, 2 senadores,
   10 deputados federais, 30 estaduais; Mauro Mendes/União ao Senado; Otaviano
   Pivetta/Republicanos pela continuidade; campo de ~11 pré-candidatos).

   São textos de ANÁLISE/OPINIÃO — o cenário eleitoral muda rápido. REVISE e
   confira os nomes/fatos antes de publicar. Saem como RASCUNHO (status: draft).

   Gera:  ghost/import/colunas-politica.json  (import do Ghost, rascunhos)
          ghost/import/colunas-politica.md     (preview legível)
   Publicar como rascunho (revisar no Ghost antes de tornar público):
     ODIAPOLITICO_ADMIN_KEY='id:secret' \
       node ghost/automation/publish.mjs ghost/import/colunas-politica.json --only=odiapolitico --draft
*/
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const slug = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);

// Cada coluna: título (≤76), subtítulo (deck), resumo SEO e o corpo em blocos.
// "h3" vira subtítulo interno; strings comuns viram parágrafos.
const COLUNAS = [
  {
    titulo: "A sucessão de Mauro Mendes abre a eleição mais aberta de MT",
    subtitulo: "Continuidade x renovação num campo de quase 11 nomes",
    resumo: "Sem Mauro Mendes na disputa pelo governo, 2026 vira a eleição mais aberta de MT: continuidade e renovação medem forças num campo fragmentado.",
    corpo: [
      "Pela primeira vez em anos, Mato Grosso vai ao Palácio Paiaguás sem um governador tentando a reeleição. Reeleito em 2018 e 2022, Mauro Mendes (União Brasil) está impedido de um terceiro mandato e migrou para a disputa ao Senado — e a vacância transforma 2026 na eleição mais aberta do estado, com o campo já beirando 11 pré-candidaturas.",
      { h3: "O eixo da continuidade" },
      "O nome que herda o discurso da continuidade é Otaviano Pivetta (Republicanos). Produtor rural, ex-prefeito de Lucas do Rio Verde por três mandatos e hoje à frente do Executivo após a saída de Mendes, Pivetta se apresenta como fiador do modelo de gestão adotado desde 2019 — ajuste fiscal, obras de infraestrutura e um estado calibrado para o agro. Para o leitor que decide investimento, continuidade é, antes de tudo, previsibilidade.",
      { h3: "O campo que quer virar a página" },
      "Do outro lado, a renovação chega fragmentada. O senador Wellington Fagundes (PL) desponta como a principal aposta do seu partido ao Executivo; Jayme Campos (União Brasil) carrega trajetória de ex-governador e ex-prefeito de Várzea Grande, mas esbarra na preferência de Mendes por Pivetta dentro da própria legenda; e a médica Natasha Slhessarenko (PSD), até aqui a única mulher no páreo, organiza o campo à esquerda com o apoio da Federação Brasil da Esperança (PT, PV e PCdoB).",
      "A disputa real, porém, é menos de nomes e mais de projeto. De um lado, a tese de que a competitividade de MT — grãos, energia, logística — depende de manter o motor fiscal e o ambiente de negócios como estão. De outro, a aposta de que o próximo ciclo exige uma agenda mais social e uma redistribuição do que o boom do agro gerou.",
      "Para o público de O Dia Político, a pergunta que organiza 2026 não é apenas quem larga na frente, e sim qual coalizão consegue sustentar o ciclo econômico do estado sem travar sua conta pública. É essa equação — e não o calendário eleitoral de 4 de outubro — que vai definir o tamanho do próximo governo.",
    ],
    tags: ["politica", "governo", "colunas"],
  },
  {
    titulo: "Duas cadeiras no Senado: a janela rara que redefine o peso de MT",
    subtitulo: "MT elege dois senadores e muda seu peso em Brasília",
    resumo: "Em 2026 Mato Grosso elege dois senadores de uma vez — uma janela rara que pode consolidar, ou fraturar, o peso do estado no Congresso.",
    corpo: [
      "A eleição de 2026 renova dois terços do Senado, e Mato Grosso está entre os estados que colocam as duas cadeiras em jogo ao mesmo tempo — as hoje ocupadas por Carlos Fávaro (PSD) e Jayme Campos (União Brasil). Na prática, o eleitor mato-grossense vota em dois nomes, uma janela que aparece poucas vezes numa geração.",
      { h3: "Quem larga na frente" },
      "Entre os mais bem posicionados aparecem Mauro Mendes (União Brasil), que trocou o Executivo pela corrida ao Senado, e Janaína Riva (MDB). A aritmética de duas vagas favorece o voto dividido e os arranjos entre grupos: raramente uma só chapa leva as duas cadeiras, o que abre espaço para composições que cruzam o tabuleiro estadual.",
      { h3: "Por que isso importa para a economia" },
      "Um estado com dois senadores afinados — ou em rota de colisão — muda o próprio poder de fogo de MT em Brasília. É no Senado que se decidem pautas que tocam diretamente o bolso do agro e da indústria mato-grossense: reforma tributária em regulamentação, marco ambiental, crédito rural e a infraestrutura que escoa a safra, da BR-163 aos projetos ferroviários.",
      "Para o leitor qualificado, a leitura é direta: uma bancada de dois senadores em sintonia com a economia do estado pode valer mais, no médio prazo, do que a cadeira de governador. São oito anos de mandato — tempo suficiente para blindar (ou atrasar) agendas que definem a competitividade do estado.",
      "O risco espelha a oportunidade. A mesma janela que pode consolidar um bloco coeso pode também dispersar o voto e entregar duas cadeiras a projetos opostos, anulando o ganho. 2026 dirá se MT usa a raridade a seu favor.",
    ],
    tags: ["politica", "congresso", "colunas"],
  },
  {
    titulo: "O 10º deputado federal reabre a briga por vagas em Mato Grosso",
    subtitulo: "Mais uma cadeira acirra a disputa dentro dos partidos",
    resumo: "Mato Grosso salta de 8 para 10 deputados federais em 2026, e a nova régua reorganiza os grupos e acirra a briga por vaga dentro de cada legenda.",
    corpo: [
      "Mato Grosso chega a 2026 com uma novidade que reorganiza todo o tabuleiro: o estado passa a eleger dez deputados federais, dois a mais do que os oito atuais. É um crescimento de 25% na bancada — e cada partido já refaz suas contas.",
      { h3: "A matemática da vaga" },
      "Mais cadeiras não significam disputa mais fácil; significam disputa mais acirrada dentro das legendas. É o clássico jogo do \"cinco fortes para três vagas\": o quociente eleitoral premia quem monta chapa com puxadores de voto e nomes competitivos ao mesmo tempo, e pune o partido que aposta em ego em vez de estratégia. Não à toa, 11 deputados estaduais já trocaram de legenda na janela aberta pelo TSE, remontando grupos de olho justamente nessa conta.",
      { h3: "O que MT ganha — se souber usar" },
      "Uma bancada federal 25% maior é, potencialmente, mais peso para a agenda do estado: agro, logística, energia e a infraestrutura que sustenta o escoamento da produção. O condicional é a palavra-chave. Bancada grande só vira poder real quando age coordenada; fragmentada, dilui o ganho e devolve MT à condição de coadjuvante nas votações que interessam.",
      "Para o público de O Dia Político, o 10º deputado é ao mesmo tempo oportunidade e armadilha. Recompensa as legendas que constroem chapas — nomes regionais fortes somados a puxadores de voto — e expõe as que confundem quantidade de candidatos com qualidade de representação.",
      "A pergunta que vale a eleição não é quantas cadeiras MT vai ocupar em Brasília, e sim quantas delas o estado vai transformar em votos que mexem com a sua economia. É aí que a nova régua federal separa quem faz política de quem apenas ocupa espaço.",
    ],
    tags: ["politica", "congresso", "colunas"],
  },
];

// ---- montagem do import + preview ----------------------------------------
const now = new Date().toISOString().replace(/\.\d+Z$/, ".000Z");
const tagIndex = new Map(); const tags = [];
const tagId = (s) => { if (tagIndex.has(s)) return tagIndex.get(s); const id = tags.length + 1; tags.push({ id, name: s[0].toUpperCase() + s.slice(1), slug: s, visibility: "public", description: null }); tagIndex.set(s, id); return id; };
const bodyHtml = (col) => `<p class="post-deck"><strong>${esc(col.subtitulo)}</strong></p>` +
  col.corpo.map((b) => (typeof b === "object" && b.h3) ? `<h3>${esc(b.h3)}</h3>` : `<p>${esc(b)}</p>`).join("");
const mobiledoc = (html) => JSON.stringify({ version: "0.3.1", atoms: [], markups: [], sections: [[10, 0]], cards: [["html", { html }]] });

const posts = []; const posts_tags = []; let pid = 0;
for (const col of COLUNAS) {
  const id = ++pid;
  posts.push({
    id, title: col.titulo, slug: `coluna-${slug(col.titulo)}`, type: "post",
    status: "draft", visibility: "public",
    mobiledoc: mobiledoc(bodyHtml(col)), feature_image: null,
    feature_image_caption: "Análise — O Dia Político",
    custom_excerpt: col.resumo, created_at: now, updated_at: now, published_at: now,
  });
  col.tags.forEach((t, i) => posts_tags.push({ tag_id: tagId(t), post_id: id, sort_order: i }));
}
const db = { db: [{ meta: { exported_on: Date.now(), version: "5.0.0" }, data: { posts, tags, posts_tags } }] };
writeFileSync(resolve(__dirname, "colunas-politica.json"), JSON.stringify(db, null, 2) + "\n", "utf8");

// Preview legível (markdown)
const md = ["# Colunas — O Dia Político (análise política de MT · 2026)", "",
  "> Rascunhos de ANÁLISE/OPINIÃO ancorados em fatos públicos do ciclo 2026. **Revise e confira nomes/fatos antes de publicar** — o cenário eleitoral muda rápido.", ""]
  .concat(COLUNAS.flatMap((c) => [`## ${c.titulo}`, `*${c.subtitulo}*`, "", ...c.corpo.map((b) => (typeof b === "object" && b.h3) ? `### ${b.h3}` : b), "", `— *Resumo SEO:* ${c.resumo}`, "", "---", ""]));
writeFileSync(resolve(__dirname, "colunas-politica.md"), md.join("\n"), "utf8");

console.log(`OK: colunas-politica.json (${posts.length} rascunhos) + colunas-politica.md`);
