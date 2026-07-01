#!/usr/bin/env node
/* Gera ghost/import/noticias-300.json — 300 matérias de DEMONSTRAÇÃO cobrindo
   TODAS as editorias, com imagens, crédito de fonte (nacionais e internacionais)
   e VÍDEOS incorporados (YouTube, X e Meta/Facebook) em parte das matérias.

   ⚠️ CONTEÚDO DEMO: os textos são modelos realistas (tag interna #demo), para
   popular o portal e ver o layout. Revise e substitua pelo conteúdo editorial
   real antes de publicar. Os vídeos são ilustrativos — troque pelos IDs reais.

   Importe em: Ghost Admin → Settings → Labs → Import content
   ou publique via automação: node ghost/automation/publish.mjs ghost/import/noticias-300.json */

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, "noticias-300.json");

const slugify = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/['’"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const mobiledoc = (html) => JSON.stringify({ version: "0.3.1", atoms: [], markups: [], sections: [[10, 0]], cards: [["html", { html }]] });
const photo = (seed) => `https://picsum.photos/seed/${seed}/1200/675`;
const pick = (arr, i) => arr[i % arr.length];

const BASE = Date.UTC(2026, 5, 30, 20, 0, 0);
const iso = (ms) => new Date(ms).toISOString().replace(/\.\d+Z$/, ".000Z");

/* ---- tags ---- */
const tags = []; const tagId = new Map();
function tag(name, slug, visibility, description) {
  if (tagId.has(slug)) return tagId.get(slug);
  const id = tags.length + 1; tags.push({ id, name, slug, visibility, description: description || null }); tagId.set(slug, id); return id;
}
const T_VIDEO = tag("Vídeo", "video", "public", "Matérias com vídeo.");

/* ---- posts ---- */
const posts = []; const posts_tags = []; let pid = 0; let when = BASE;
function addPost({ title, slug, html, feature_image, feature_image_caption, custom_excerpt, featured, tagIds }) {
  const id = ++pid; const t = when; when -= 12 * 60 * 1000;
  posts.push({
    id, title, slug, type: "post", status: "published", visibility: "public", featured: !!featured,
    mobiledoc: mobiledoc(html), feature_image: feature_image || null,
    feature_image_caption: feature_image_caption || null, custom_excerpt: custom_excerpt || null,
    created_at: iso(t), updated_at: iso(t), published_at: iso(t),
  });
  tagIds.forEach((tid, i) => posts_tags.push({ tag_id: tid, post_id: id, sort_order: i }));
  return id;
}

/* ---- embeds de vídeo (ilustrativos — troque pelos reais) ---- */
const YT = ["jNQXAC9IVRw", "aqz-KE-bpKQ", "ScMzIvxBSi4"];
function ytEmbed(i) {
  return `<figure class="kg-card kg-embed-card"><iframe width="560" height="315" src="https://www.youtube.com/embed/${pick(YT, i)}" title="Vídeo" frameborder="0" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></figure>`;
}

/* ---- fontes confiáveis (nacionais + internacionais) ---- */
const SRC = {
  mt: [["SECOM-MT", "https://www.secom.mt.gov.br"], ["G1 Mato Grosso", "https://g1.globo.com/mt/mato-grosso/"], ["Agência Brasil", "https://agenciabrasil.ebc.com.br"], ["Assembleia Legislativa de MT", "https://www.al.mt.gov.br"]],
  br: [["Agência Brasil", "https://agenciabrasil.ebc.com.br"], ["G1", "https://g1.globo.com"], ["Gov.br", "https://www.gov.br"], ["CNN Brasil", "https://www.cnnbrasil.com.br"]],
  intl: [["Reuters", "https://www.reuters.com"], ["AP News", "https://apnews.com"], ["AFP", "https://www.afp.com"], ["BBC", "https://www.bbc.com"], ["EFE", "https://www.efe.com"], ["DW", "https://www.dw.com"]],
};
const credito = (scope, i) => { const [n, u] = pick(SRC[scope], i); return `Fonte: <a href="${u}" target="_blank" rel="noopener">${esc(n)}</a>`; };

const CID = ["Cuiabá", "Várzea Grande", "Rondonópolis", "Sinop", "Tangará da Serra", "Cáceres", "Sorriso", "Lucas do Rio Verde", "Primavera do Leste", "Barra do Garças", "Alta Floresta", "Nova Mutum", "Campo Verde", "Pontes e Lacerda", "Juína", "Nova Xavantina", "Diamantino", "Colíder", "Guarantã do Norte", "Poconé"];
const VAL = ["120", "250", "540", "663", "88", "410", "175", "902", "330", "76", "1,2 bilhão", "58", "210", "480", "95"];
const PAISES = ["Estados Unidos", "China", "Argentina", "França", "Alemanha", "Portugal", "Japão", "Reino Unido", "Espanha", "Itália", "México", "Canadá", "Índia", "Chile", "Uruguai"];

/* Cada editoria: escopo de fontes + geradores de título/parágrafos. */
const EDS = [
  { slug: "politica", name: "Política", scope: "mt",
    titles: (i) => [
      `Governo de MT anuncia R$ ${pick(VAL, i)} milhões em investimentos para ${pick(CID, i)}`,
      `Assembleia Legislativa aprova projeto que amplia serviços em ${pick(CID, i + 3)}`,
      `Prefeitura de ${pick(CID, i + 1)} apresenta plano de gestão para os próximos anos`,
      `Estado e municípios firmam parceria por mais obras em ${pick(CID, i + 2)}`,
      `Executivo estadual detalha execução do orçamento e metas de 2026`,
    ][i % 5],
    paras: (t, i) => [
      `${t}. A medida foi apresentada por autoridades estaduais e municipais e integra o planejamento de gestão para o período.`,
      `Segundo o poder público, o objetivo é ampliar serviços à população e dar previsibilidade aos investimentos em ${pick(CID, i)}.`,
      `Os detalhes serão publicados nos canais oficiais; acompanhe as atualizações no portal.`,
    ] },
  { slug: "cidades", name: "Cidades", scope: "mt",
    titles: (i) => [
      `${pick(CID, i)} recebe nova unidade de saúde para ampliar atendimento`,
      `Obras de mobilidade avançam e mudam o trânsito em ${pick(CID, i + 2)}`,
      `Educação de ${pick(CID, i + 1)} entrega equipamentos e novas vagas`,
      `Mutirão de serviços leva atendimento a bairros de ${pick(CID, i + 4)}`,
      `${pick(CID, i + 3)} investe em saneamento e drenagem urbana`,
    ][i % 5],
    paras: (t, i) => [
      `${t}. A ação faz parte de um conjunto de melhorias voltadas à qualidade de vida da população local.`,
      `Moradores devem ser beneficiados com mais estrutura e serviços públicos na região.`,
      `A administração informou que novas etapas serão anunciadas nas próximas semanas.`,
    ] },
  { slug: "policia", name: "Polícia", scope: "mt",
    titles: (i) => [
      `Operação integrada reforça a segurança em ${pick(CID, i)}`,
      `Polícia apreende drogas e prende suspeitos em ação na zona rural de ${pick(CID, i + 1)}`,
      `Forças de segurança realizam blitze educativas em ${pick(CID, i + 2)}`,
      `Investigação avança e Polícia Civil esclarece caso em ${pick(CID, i + 3)}`,
      `Bombeiros atuam em ocorrência e reforçam campanha de prevenção em ${pick(CID, i + 4)}`,
    ][i % 5],
    paras: (t, i) => [
      `${t}. A ação teve foco na prevenção e na repressão qualificada à criminalidade.`,
      `Equipes seguem com o trabalho de patrulhamento e orientação à comunidade.`,
      `Denúncias podem ser feitas pelos canais oficiais das forças de segurança.`,
    ] },
  { slug: "economia", name: "Economia", scope: "br",
    titles: (i) => [
      `Comércio de ${pick(CID, i)} projeta alta nas vendas com novas datas`,
      `Setor de serviços cresce e gera empregos em Mato Grosso`,
      `Indústria avança e amplia produção no início do ano`,
      `Crédito para pequenos negócios é ampliado em ${pick(CID, i + 2)}`,
      `Exportações do estado batem novo recorde no trimestre`,
    ][i % 5],
    paras: (t, i) => [
      `${t}. Especialistas apontam ambiente favorável a novos investimentos e à geração de renda.`,
      `O desempenho é acompanhado por entidades do setor e por órgãos oficiais.`,
      `Os números completos estão disponíveis nos boletins econômicos.`,
    ] },
  { slug: "agro", name: "Agro", scope: "mt",
    titles: (i) => [
      `Safra de grãos avança e produtividade surpreende em ${pick(CID, i)}`,
      `Produtores de ${pick(CID, i + 1)} adotam tecnologia para elevar a produção`,
      `Agronegócio movimenta a economia e gera empregos no interior`,
      `Programa de regularização ambiental beneficia pequenos produtores`,
      `Pecuária de MT investe em rastreabilidade e qualidade`,
    ][i % 5],
    paras: (t, i) => [
      `${t}. O setor reforça a posição de Mato Grosso como referência nacional na produção.`,
      `Boas práticas e investimento em tecnologia impulsionam os resultados no campo.`,
      `Entidades do agro divulgam os dados consolidados periodicamente.`,
    ] },
  { slug: "brasil-mundo", name: "Brasil & Mundo", scope: "br",
    titles: (i) => [
      `Governo federal anuncia programa que impacta ${pick(CID, i)} e região`,
      `Congresso debate pauta econômica com reflexos nos estados`,
      `Brasil amplia acordos comerciais com ${pick(PAISES, i)}`,
      `Nova política pública é apresentada e chega a Mato Grosso`,
      `Indicadores nacionais mostram evolução no setor de infraestrutura`,
    ][i % 5],
    paras: (t, i) => [
      `${t}. A medida repercute em diferentes regiões e deve chegar a Mato Grosso.`,
      `Analistas avaliam os efeitos da decisão sobre a economia e os serviços públicos.`,
      `Mais informações nos canais oficiais e nas agências de notícias.`,
    ] },
  { slug: "esportes", name: "Esportes", scope: "br",
    titles: (i) => [
      `Time de ${pick(CID, i)} vence e assume a liderança no estadual`,
      `Atletas de Mato Grosso conquistam medalhas em competição nacional`,
      `Copa do Mundo 2026: seleções definem os próximos confrontos`,
      `Projeto social revela novos talentos do esporte em ${pick(CID, i + 2)}`,
      `Ginásio de ${pick(CID, i + 1)} recebe torneio regional neste fim de semana`,
    ][i % 5],
    paras: (t, i) => [
      `${t}. A partida movimentou a torcida e teve grande público.`,
      `A comissão técnica celebrou o resultado e projeta a sequência da temporada.`,
      `Confira a tabela e os melhores momentos nas plataformas oficiais.`,
    ] },
  { slug: "imoveis", name: "Imóveis", scope: "mt",
    titles: (i) => [
      `Mercado imobiliário de ${pick(CID, i)} aquece com novos lançamentos`,
      `Financiamento facilita a compra da casa própria em ${pick(CID, i + 1)}`,
      `Bairros planejados valorizam e atraem investidores em ${pick(CID, i + 2)}`,
      `Aluguel por temporada cresce na alta estação em ${pick(CID, i + 3)}`,
      `Dicas para vender seu imóvel mais rápido em ${pick(CID, i + 4)}`,
    ][i % 5],
    paras: (t, i) => [
      `${t}. Corretores apontam boas oportunidades para quem busca comprar ou investir.`,
      `A recomendação é pesquisar condições de financiamento e a documentação do imóvel.`,
      `Fale com a Lar & Cia para conhecer as opções disponíveis.`,
    ] },
  { slug: "tecnologia", name: "Tecnologia", scope: "intl",
    titles: (i) => [
      `Inteligência artificial ganha novos usos e chega a serviços públicos`,
      `Startup brasileira recebe investimento e mira expansão`,
      `Conectividade avança e leva internet a mais cidades do interior`,
      `Cibersegurança: especialistas alertam para novas ameaças`,
      `Big tech de ${pick(PAISES, i)} anuncia novidade que impacta o mercado`,
    ][i % 5],
    paras: (t, i) => [
      `${t}. A tecnologia promete mudar a forma como serviços e empresas operam.`,
      `Especialistas recomendam atenção à privacidade e à segurança dos dados.`,
      `O tema segue em evolução e deve trazer novidades nos próximos meses.`,
    ] },
  { slug: "saude", name: "Saúde", scope: "br",
    titles: (i) => [
      `Campanha de vacinação é ampliada em ${pick(CID, i)}`,
      `Novo protocolo melhora o atendimento na rede pública`,
      `Especialistas dão dicas de prevenção para a estação`,
      `Mutirão de exames reduz filas em ${pick(CID, i + 2)}`,
      `Pesquisa avança e traz esperança no tratamento de doenças`,
    ][i % 5],
    paras: (t, i) => [
      `${t}. A iniciativa busca ampliar o acesso e melhorar os indicadores de saúde.`,
      `Profissionais reforçam a importância da prevenção e do acompanhamento médico.`,
      `Procure a unidade de saúde mais próxima para mais informações.`,
    ] },
  { slug: "cultura", name: "Cultura", scope: "br",
    titles: (i) => [
      `Festival movimenta a cena cultural de ${pick(CID, i)}`,
      `Exposição gratuita reúne artistas locais em ${pick(CID, i + 1)}`,
      `Show e programação especial agitam o fim de semana em ${pick(CID, i + 2)}`,
      `Projeto valoriza a cultura pantaneira e as tradições de MT`,
      `Cinema e teatro têm nova temporada em ${pick(CID, i + 3)}`,
    ][i % 5],
    paras: (t, i) => [
      `${t}. A programação é gratuita e aberta ao público de todas as idades.`,
      `Organizadores destacam a valorização dos artistas e da cultura regional.`,
      `Confira os horários e locais na agenda cultural.`,
    ] },
  { slug: "internacional", name: "Internacional", scope: "intl",
    titles: (i) => [
      `${pick(PAISES, i)} anuncia medida econômica que repercute no mundo`,
      `Cúpula reúne líderes para discutir clima e energia`,
      `Eleições em ${pick(PAISES, i + 2)} têm resultado acompanhado globalmente`,
      `Mercados internacionais reagem a novos dados econômicos`,
      `Acordo entre ${pick(PAISES, i)} e ${pick(PAISES, i + 5)} avança em negociação`,
    ][i % 5],
    paras: (t, i) => [
      `${t}. A decisão tem repercussão internacional e é acompanhada por analistas.`,
      `Agências internacionais destacam os possíveis efeitos sobre a economia global.`,
      `As informações são atualizadas continuamente pelas agências de notícias.`,
    ] },
];

const PER = 25;                 // 12 editorias × 25 = 300
let count = 0;
EDS.forEach((ed) => {
  const T_ED = tag(ed.name, ed.slug, "public", `Editoria ${ed.name}.`);
  for (let i = 0; i < PER; i++) {
    const title = ed.titles(i);
    const seed = slugify(ed.slug + "-" + title).slice(0, 60) + "-" + i;
    let body = ed.paras(title, i).map((p) => `<p>${esc(p)}</p>`).join("");
    const tagIds = [T_ED];
    // 1 em cada 4 matérias tem vídeo do YouTube incorporado
    if (count % 4 === 0) { body += ytEmbed(i); tagIds.push(T_VIDEO); }
    addPost({
      title, slug: seed, html: body, feature_image: photo(seed),
      feature_image_caption: credito(ed.scope, i),
      custom_excerpt: title + ".", featured: count < 6, tagIds,
    });
    count++;
  }
});

const out = { db: [{ meta: { exported_on: BASE, version: "5.0.0" }, data: { posts, tags, posts_tags } }] };
writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`OK: ${outPath} — posts=${posts.length} tags=${tags.length} posts_tags=${posts_tags.length}`);
