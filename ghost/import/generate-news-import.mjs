#!/usr/bin/env node
/* Gera ghost/import/news-import.json para o tema lar-cia-news.
   Importe em: Ghost Admin → Settings → Labs → Import content.

   Conteúdo:
   - Editorias (tags públicas) + tags internas de anúncio (#ad-*) e #demo.
   - Artigos-MODELO originais por editoria (serviço/explicativo), marcados com #demo.
   - Releases-MODELO de órgãos públicos, com atribuição de fonte.
   - Páginas institucionais (Sobre, Anuncie/Mídia Kit, Fontes oficiais, Contato).
   - Anúncios de exemplo (house ads) para as zonas leaderboard/sidebar/in-article.

   IMPORTANTE: todo o texto é original e de demonstração. Nada é copiado de
   veículos privados. Releases oficiais devem ser substituídos pelo conteúdo
   real publicado pelos próprios órgãos, sempre com atribuição. */

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, "news-import.json");

const slugify = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const mobiledoc = (html) => JSON.stringify({
  version: "0.3.1", atoms: [], markups: [], sections: [[10, 0]], cards: [["html", { html }]],
});
const photo = (seed) => `https://picsum.photos/seed/${seed}/1200/675`;
const banner = (w, h, text) => `https://placehold.co/${w}x${h}/C20017/ffffff?text=${encodeURIComponent(text)}`;

// Datas determinísticas (primeiro item = mais recente → vira manchete).
const BASE_MS = Date.UTC(2026, 5, 20, 15, 0, 0); // 20/06/2026 15:00 UTC
const iso = (ms) => new Date(ms).toISOString().replace(/\.\d+Z$/, ".000Z");

/* ---- registro de tags ---------------------------------------------------- */
const tags = [];
const tagId = new Map();
function tag(name, slug, visibility, description) {
  if (tagId.has(slug)) return tagId.get(slug);
  const id = tags.length + 1;
  tags.push({ id, name, slug, visibility, description: description || null });
  tagId.set(slug, id);
  return id;
}
// Editorias (públicas)
const EDIT = {
  politica: tag("Política", "politica", "public", "Cobertura do legislativo, executivo e poder público em Mato Grosso."),
  cidades: tag("Cidades", "cidades", "public", "Cuiabá, Várzea Grande e os municípios de MT."),
  policia: tag("Polícia", "policia", "public", "Segurança pública e serviços ao cidadão."),
  economia: tag("Economia", "economia", "public", "Negócios, empreendedorismo e o bolso do cidadão."),
  agro: tag("Agro", "agro", "public", "O agronegócio que move Mato Grosso."),
  "brasil-mundo": tag("Brasil & Mundo", "brasil-mundo", "public", "Notícias nacionais e internacionais."),
  esportes: tag("Esportes", "esportes", "public", "Esporte amador e profissional em MT."),
  cultura: tag("Cultura", "cultura", "public", "Agenda, patrimônio e cultura cuiabana."),
  imoveis: tag("Imóveis", "imoveis", "public", "Mercado imobiliário, financiamento e moradia."),
  servicos: tag("Serviços", "servicos", "public", "Guias práticos e utilidade pública."),
};
// Tags internas
const T_DEMO = tag("#demo", "hash-demo", "internal");
const T_AD = tag("#ad", "hash-ad", "internal");
const T_AD_LB = tag("#ad-leaderboard", "hash-ad-leaderboard", "internal");
const T_AD_SB = tag("#ad-sidebar", "hash-ad-sidebar", "internal");
const T_AD_IA = tag("#ad-inarticle", "hash-ad-inarticle", "internal");

/* ---- posts --------------------------------------------------------------- */
const posts = [];
const posts_tags = [];
let pid = 0;
let when = BASE_MS;
function addPost({ title, slug, type = "post", html, feature_image, custom_excerpt, tagIds = [], at }) {
  const id = ++pid;
  const published = at != null ? at : when;
  if (at == null) when -= 30 * 60 * 1000; // 30 min entre posts
  posts.push({
    id, title, slug: slugify(slug || title), type, status: "published", visibility: "public",
    mobiledoc: mobiledoc(html), feature_image: feature_image || null,
    custom_excerpt: custom_excerpt || null,
    created_at: iso(published), updated_at: iso(published), published_at: iso(published),
  });
  tagIds.forEach((tid, i) => posts_tags.push({ tag_id: tid, post_id: id, sort_order: i }));
  return id;
}

const body = (paras, fonte) => {
  let h = paras.map((p) => `<p>${esc(p)}</p>`).join("");
  if (fonte) h += `<p><em>Fonte: <a href="${fonte.url}" target="_blank" rel="noopener">${esc(fonte.nome)}</a>.</em></p>`;
  return h;
};

// Artigos-modelo (originais, serviço/explicativo). Primeiro = manchete.
const ARTICLES = [
  { ed: "cidades", seed: "cuiaba-iptu", title: "Cuiabá: como solicitar a 2ª via do IPTU pela internet",
    excerpt: "Passo a passo para emitir o boleto sem sair de casa, pelo portal da prefeitura.",
    paras: ["Contribuintes de Cuiabá podem emitir a segunda via do IPTU diretamente pelo portal oficial da prefeitura, informando a inscrição do imóvel ou o CPF do proprietário.",
      "O serviço funciona em qualquer horário e dispensa o comparecimento presencial. Em caso de dúvida sobre valores ou parcelamento, a orientação é procurar os canais de atendimento ao cidadão."],
    fonte: { nome: "Prefeitura de Cuiabá", url: "https://www.cuiaba.mt.gov.br/" } },

  { ed: "politica", seed: "almt-legislativo", title: "Entenda como funciona o processo legislativo na Assembleia de MT",
    excerpt: "Da apresentação do projeto à sanção: o caminho de uma lei estadual.",
    paras: ["Um projeto de lei em Mato Grosso percorre etapas de apresentação, análise em comissões, votação em plenário e, por fim, sanção ou veto do Executivo.",
      "As sessões podem ser acompanhadas pelos canais oficiais da Assembleia Legislativa, o que amplia a transparência e a participação da população no debate público."],
    fonte: { nome: "TV Assembleia MT", url: "https://www.youtube.com/tvassembleiamt" } },

  { ed: "economia", seed: "mei-mt", title: "Guia: como abrir um MEI em Mato Grosso passo a passo",
    excerpt: "Formalizar o pequeno negócio garante CNPJ, nota fiscal e acesso a benefícios.",
    paras: ["O Microempreendedor Individual pode se formalizar gratuitamente pelo Portal do Empreendedor, obtendo CNPJ na hora e a possibilidade de emitir nota fiscal.",
      "A formalização dá acesso a benefícios previdenciários e facilita a abertura de conta empresarial e a contratação de crédito. O pagamento mensal é feito por meio do DAS."],
    fonte: { nome: "Gov.br", url: "https://www.gov.br/secom/pt-br" } },

  { ed: "agro", seed: "safra-mt", title: "Safra em Mato Grosso: entenda o calendário agrícola do estado",
    excerpt: "Plantio e colheita seguem janelas técnicas que organizam a produção do estado.",
    paras: ["Mato Grosso é um dos maiores produtores de grãos do país, e o calendário agrícola organiza as janelas de plantio e colheita de soja, milho e algodão ao longo do ano.",
      "O respeito ao zoneamento e ao vazio sanitário é parte da estratégia que sustenta a produtividade do campo e a competitividade do agro mato-grossense."] },

  { ed: "policia", seed: "bo-online", title: "Segurança: como registrar um boletim de ocorrência online em MT",
    excerpt: "Para casos sem flagrante, o registro pode ser feito pela delegacia virtual.",
    paras: ["Determinadas ocorrências, como perda de documentos e furtos sem violência, podem ser registradas pela delegacia eletrônica, sem deslocamento até uma unidade física.",
      "Em situações de emergência ou flagrante, o orientado é acionar imediatamente os canais oficiais de segurança pública pelos telefones de urgência."] },

  { ed: "imoveis", seed: "financiamento-sim", title: "Financiamento de imóveis: simule sua parcela em minutos",
    excerpt: "Ferramenta da LAR & CIA estima a prestação pela Tabela Price antes da proposta.",
    paras: ["Antes de fechar negócio, simular o financiamento ajuda a planejar o orçamento. A calculadora considera valor do imóvel, entrada, prazo e taxa para estimar a parcela.",
      "Depois da simulação, o ideal é comparar condições entre os principais bancos com apoio de um corretor para encontrar a melhor proposta."],
    fonte: { nome: "Portal LAR & CIA", url: "http://localhost:3000/imoveis" } },

  { ed: "cidades", seed: "vg-saude", title: "Várzea Grande reforça orientações sobre atendimento na saúde",
    excerpt: "Cidadãos podem consultar unidades e horários pelos canais oficiais do município.",
    paras: ["A população de Várzea Grande pode consultar endereços, horários e serviços das unidades de saúde pelos canais oficiais da prefeitura, evitando deslocamentos desnecessários.",
      "A recomendação é manter a carteira de vacinação em dia e procurar a unidade de referência mais próxima da residência para atendimento de rotina."],
    fonte: { nome: "Prefeitura de Várzea Grande", url: "https://www.varzeagrande.mt.gov.br/" } },

  { ed: "brasil-mundo", seed: "govbr-docs", title: "Serviços do gov.br: como acessar seus documentos digitais",
    excerpt: "Conta gov.br reúne CNH, título de eleitor e outros documentos no celular.",
    paras: ["A conta gov.br dá acesso a centenas de serviços públicos digitais e permite guardar versões digitais de documentos como a carteira de motorista e o título de eleitor.",
      "O nível de segurança da conta (bronze, prata ou ouro) define quais serviços ficam disponíveis; a validação por biometria eleva o nível de acesso."],
    fonte: { nome: "Gov.br", url: "https://www.gov.br/secom/pt-br" } },

  { ed: "politica", seed: "transparencia-mt", title: "Transparência: onde acompanhar os gastos públicos em Mato Grosso",
    excerpt: "Portais oficiais permitem consultar receitas, despesas e contratos do estado.",
    paras: ["O acompanhamento das contas públicas é um direito do cidadão. Portais de transparência reúnem dados de receitas, despesas, licitações e contratos do poder público.",
      "Consultar essas informações com regularidade fortalece o controle social e ajuda a sociedade a fiscalizar a aplicação dos recursos."],
    fonte: { nome: "SECOM Mato Grosso", url: "https://www.secom.mt.gov.br/noticias" } },

  { ed: "economia", seed: "imobiliario-cuiaba", title: "Mercado imobiliário de Cuiabá segue aquecido; veja os fatores",
    excerpt: "Crescimento populacional e novos bairros planejados impulsionam a demanda.",
    paras: ["A expansão de bairros planejados e a chegada de novos empreendimentos mantêm o mercado imobiliário da capital em ritmo positivo, com procura por casas e apartamentos.",
      "Para quem pensa em investir, a recomendação é avaliar localização, infraestrutura do entorno e potencial de valorização antes da decisão."],
    fonte: { nome: "Portal LAR & CIA", url: "http://localhost:3000" } },

  { ed: "agro", seed: "agro-sustentavel", title: "Sustentabilidade no campo: práticas que ganham espaço em MT",
    excerpt: "Integração lavoura-pecuária e plantio direto reduzem impacto e custos.",
    paras: ["Técnicas como o plantio direto e a integração lavoura-pecuária-floresta avançam entre produtores que buscam equilibrar produtividade e responsabilidade ambiental.",
      "Além do ganho ambiental, essas práticas podem reduzir custos e melhorar a saúde do solo no médio e longo prazo."] },

  { ed: "policia", seed: "transito-chuva", title: "Trânsito seguro: cuidados para o período de chuvas em Mato Grosso",
    excerpt: "Velocidade reduzida e distância segura previnem acidentes nas estradas.",
    paras: ["Com o aumento das chuvas, a atenção redobrada no trânsito é essencial: reduzir a velocidade, manter distância segura e checar pneus e freios são medidas básicas.",
      "Em rodovias, a recomendação é evitar ultrapassagens em baixa visibilidade e acompanhar os alertas dos órgãos de trânsito."] },

  { ed: "imoveis", seed: "comprar-alugar", title: "Comprar ou alugar em Cuiabá? Veja o que pesar na decisão",
    excerpt: "Tempo de permanência, reserva financeira e objetivos definem a melhor escolha.",
    paras: ["A escolha entre comprar e alugar depende do tempo que se pretende ficar no imóvel, da reserva disponível para entrada e dos objetivos de longo prazo de cada família.",
      "Comprar tende a compensar para quem busca estabilidade; alugar oferece flexibilidade. Simular cenários ajuda a tomar a decisão com mais segurança."],
    fonte: { nome: "Portal LAR & CIA", url: "http://localhost:3000/imoveis" } },

  { ed: "brasil-mundo", seed: "clima-alertas", title: "Clima: como acompanhar os alertas meteorológicos oficiais",
    excerpt: "Avisos de chuva intensa e calor são emitidos por órgãos federais.",
    paras: ["Alertas de chuvas intensas, baixa umidade e temperaturas extremas são divulgados por órgãos oficiais de meteorologia e podem ser acompanhados pela população.",
      "Ficar atento a esses avisos ajuda a planejar deslocamentos e a adotar cuidados com a saúde em dias de calor forte ou tempestades."] },

  { ed: "servicos", seed: "vacinacao-mt", title: "Vacinação: como consultar o calendário oficial em Mato Grosso",
    excerpt: "Calendário define doses por faixa etária e campanhas sazonais.",
    paras: ["O calendário de vacinação organiza as doses por faixa etária e as campanhas sazonais. Mantê-lo em dia protege a saúde individual e coletiva.",
      "A consulta pode ser feita pelos canais oficiais de saúde do estado e dos municípios, que também informam os pontos de aplicação."],
    fonte: { nome: "SECOM Mato Grosso", url: "https://www.secom.mt.gov.br/noticias" } },

  { ed: "servicos", seed: "rg-cpf", title: "Documentos: guia rápido para emitir RG e CPF em Mato Grosso",
    excerpt: "Agendamento prévio agiliza o atendimento nos postos de identificação.",
    paras: ["A emissão de documentos como RG e CPF costuma exigir agendamento prévio. Levar a documentação correta evita retrabalho e filas.",
      "Os canais oficiais informam endereços, horários e a lista de documentos necessários para cada serviço."] },

  { ed: "esportes", seed: "corrida-cuiaba", title: "Corrida de rua em Cuiabá: dicas para quem está começando",
    excerpt: "Progressão gradual e hidratação são essenciais no clima quente da capital.",
    paras: ["A corrida de rua cresce em Cuiabá, mas o clima quente exige cuidados: começar devagar, hidratar-se bem e escolher os horários mais frescos do dia.",
      "Avaliação física antes de iniciar e progressão gradual de distância reduzem o risco de lesões para os iniciantes."] },

  { ed: "cultura", seed: "agenda-cultural", title: "Agenda cultural de Cuiabá: como descobrir os eventos da cidade",
    excerpt: "Equipamentos públicos e canais oficiais divulgam shows, feiras e exposições.",
    paras: ["A capital tem uma agenda cultural diversa, com feiras, shows e exposições divulgados pelos equipamentos públicos e canais oficiais de cultura.",
      "Acompanhar essas programações é uma forma de valorizar artistas locais e movimentar a economia criativa da região."] },
];

ARTICLES.forEach((a) => {
  addPost({
    title: a.title, slug: a.seed, html: body(a.paras, a.fonte),
    feature_image: photo(a.seed), custom_excerpt: a.excerpt,
    tagIds: [EDIT[a.ed], T_DEMO],
  });
});

// Releases-modelo (atribuição forte). Mantidos neutros e institucionais.
const RELEASES = [
  { ed: "cidades", seed: "release-secom-infra", title: "[Release-modelo] Governo de MT divulga balanço de obras de infraestrutura",
    excerpt: "Modelo de release institucional — substitua pelo texto oficial publicado pelo órgão.",
    paras: ["Este é um modelo de release institucional para demonstrar como o portal publica comunicados oficiais com atribuição de fonte.",
      "Ao reproduzir um comunicado de órgão público, o portal mantém o crédito ao emissor e o link para a publicação original, preservando a integridade da informação."],
    fonte: { nome: "SECOM Mato Grosso", url: "https://www.secom.mt.gov.br/noticias" } },
  { ed: "cidades", seed: "release-cuiaba-servicos", title: "[Release-modelo] Prefeitura de Cuiabá informa serviços ao cidadão",
    excerpt: "Modelo de release municipal — substitua pelo texto oficial da prefeitura.",
    paras: ["Modelo de comunicado municipal usado para ilustrar a seção de releases oficiais do portal.",
      "Releases reais devem ser obtidos diretamente nos canais oficiais e reproduzidos com a devida atribuição."],
    fonte: { nome: "Prefeitura de Cuiabá", url: "https://www.cuiaba.mt.gov.br/" } },
];
RELEASES.forEach((r) => {
  addPost({
    title: r.title, slug: r.seed, html: body(r.paras, r.fonte),
    feature_image: photo(r.seed), custom_excerpt: r.excerpt,
    tagIds: [EDIT[r.ed], T_DEMO],
  });
});

/* ---- páginas institucionais --------------------------------------------- */
const FIX = BASE_MS - 60 * 24 * 60 * 60 * 1000; // bem no passado (não viram manchete)

addPost({ type: "page", title: "Sobre o portal", slug: "sobre", at: FIX,
  html: body([
    "O LAR & CIA News é um portal de notícias voltado a Mato Grosso, com foco em Cuiabá, Várzea Grande e região. É uma iniciativa ligada à atuação de Hebert Paes.",
    "O portal prioriza serviço, utilidade pública e transparência. Conteúdo de demonstração aparece identificado com o selo DEMO. Releases de órgãos públicos são reproduzidos com atribuição, e matérias de veículos privados são sempre creditadas e linkadas à fonte original.",
  ]) });

addPost({ type: "page", title: "Anuncie conosco", slug: "anuncie", at: FIX,
  html: body([
    "Sua marca no portal de notícias de Mato Grosso. Oferecemos três formatos de banner gerenciados diretamente pela nossa equipe comercial.",
    "Leaderboard (970×90) — topo de todas as páginas. Retângulo (300×250) — trilho lateral da home e dos artigos. In-article (728×90) — dentro das matérias e entre as editorias.",
    "As campanhas contratadas pelas agências são publicadas internamente no painel do portal, com imagem do banner e link de destino do anunciante. Fale com o comercial pelo WhatsApp da redação para receber a tabela de preços e disponibilidade.",
  ], { nome: "WhatsApp da redação", url: "https://wa.me/5565999900005" }) });

addPost({ type: "page", title: "Fontes oficiais", slug: "fontes-oficiais", at: FIX,
  html: `<p>Acompanhe os canais oficiais e os parceiros de imprensa. Releases de órgãos públicos são reproduzidos com atribuição; matérias de veículos privados são creditadas e linkadas à fonte.</p>
<h3>Órgãos públicos</h3>
<ul>
  <li><a href="https://www.secom.mt.gov.br/noticias" target="_blank" rel="noopener">SECOM Mato Grosso</a></li>
  <li><a href="https://www.cuiaba.mt.gov.br/" target="_blank" rel="noopener">Prefeitura de Cuiabá</a></li>
  <li><a href="https://www.varzeagrande.mt.gov.br/" target="_blank" rel="noopener">Prefeitura de Várzea Grande</a></li>
  <li><a href="https://www.gov.br/secom/pt-br" target="_blank" rel="noopener">Gov.br / SECOM</a></li>
  <li><a href="https://www.youtube.com/tvassembleiamt" target="_blank" rel="noopener">TV Assembleia MT</a></li>
</ul>
` });

addPost({ type: "page", title: "Contato", slug: "contato", at: FIX,
  html: `<p>Tem uma pauta, denúncia ou sugestão? Fale com a redação.</p>
<ul>
  <li>💬 <a href="https://wa.me/5565999900005" target="_blank" rel="noopener">WhatsApp da redação</a></li>
  <li>✉️ <a href="mailto:contato@hojemt.com.br">contato@hojemt.com.br</a></li>
  <li>📍 Cuiabá / Várzea Grande - MT</li>
</ul>` });

/* ---- anúncios de exemplo (house ads) ------------------------------------ */
function addAd({ title, slug, zoneTag, w, h, text, dest }) {
  addPost({
    title, slug, at: FIX,
    feature_image: banner(w, h, text),
    custom_excerpt: dest,
    tagIds: [T_AD, zoneTag],
  });
}
addAd({ title: "House Ad — Leaderboard", slug: "ad-leaderboard-demo", zoneTag: T_AD_LB, w: 970, h: 90, text: "Anuncie aqui · 970x90", dest: "/anuncie/" });
addAd({ title: "House Ad — LAR & CIA Imóveis", slug: "ad-sidebar-imoveis", zoneTag: T_AD_SB, w: 300, h: 250, text: "LAR & CIA Imoveis", dest: "http://localhost:3000" });
addAd({ title: "House Ad — In-article", slug: "ad-inarticle-demo", zoneTag: T_AD_IA, w: 728, h: 90, text: "Sua marca aqui · 728x90", dest: "/anuncie/" });

/* ---- arquivo final ------------------------------------------------------- */
const out = {
  db: [{
    meta: { exported_on: BASE_MS, version: "5.0.0" },
    data: { posts, tags, posts_tags },
  }],
};
writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`OK: ${outPath} — posts=${posts.length} tags=${tags.length} posts_tags=${posts_tags.length}`);
