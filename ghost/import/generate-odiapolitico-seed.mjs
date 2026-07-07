// Gera o conteúdo-semente do O DIA POLÍTICO (pele "Fox News").
// Saída: odiapolitico-seed.json — formato de import nativo do Ghost (db[0].data),
// que também é aceito pelo publish.mjs. São matérias EDITORIAIS PERENES (educação
// cívica), com fonte oficial atribuída — nada de "notícia" fabricada. Servem para
// as editorias (Política, Congresso, Governo, Brasil, Mundo, Colunas) já nascerem
// com conteúdo real. A automação de hora em hora segue publicando o factual.
//
// Uso:  node ghost/import/generate-odiapolitico-seed.mjs
// Importar:  Ghost Admin → Settings → Import  (ou via publish.mjs — roteia p/ Política)
import { writeFileSync } from "node:fs";

const NOW = "2026-07-07T09:00:00.000Z";

// Editorias (tags públicas) + tag interna de origem.
const TAGS = [
  { id: 99, name: "#gerado-ia",  slug: "hash-gerado-ia", visibility: "internal" },
  { id: 3,  name: "Política",     slug: "politica",       visibility: "public" },
  { id: 10, name: "Congresso",    slug: "congresso",      visibility: "public" },
  { id: 11, name: "Governo",      slug: "governo",        visibility: "public" },
  { id: 12, name: "Brasil & Mundo", slug: "brasil-mundo", visibility: "public" },
  { id: 13, name: "Mundo",        slug: "internacional",  visibility: "public" },
  { id: 14, name: "Colunas",      slug: "colunas",        visibility: "public" },
];
const slugToId = Object.fromEntries(TAGS.map((t) => [t.slug, t.id]));

// Corpo → mobiledoc (card html), igual ao formato do gerado-*.json.
const body = (deck, paras) =>
  JSON.stringify({
    version: "0.3.1", atoms: [], markups: [], sections: [[10, 0]],
    cards: [["html", { html:
      `<p class="post-deck"><strong>${deck}</strong></p>` +
      paras.map((p) => `<p>${p}</p>`).join("") }]],
  });

// slug primeiro = editoria de roteamento (Política); segundo = subeditoria.
const ARTS = [
  {
    sub: "politica",
    title: "Como funciona a Assembleia Legislativa de Mato Grosso",
    slug: "como-funciona-assembleia-legislativa-mato-grosso",
    fonte: ["Assembleia Legislativa de MT", "https://www.al.mt.gov.br/"],
    excerpt: "A ALMT reúne 24 deputados estaduais que elaboram leis e fiscalizam o Executivo; entenda o papel do Legislativo de Mato Grosso.",
    deck: "O Legislativo estadual tem 24 deputados e três funções centrais: legislar, fiscalizar e representar.",
    paras: [
      "A Assembleia Legislativa de Mato Grosso (ALMT) é a casa do Poder Legislativo estadual. É formada por 24 deputados estaduais, eleitos a cada quatro anos, responsáveis por elaborar e votar as leis do estado e por fiscalizar os atos do Governo.",
      "O trabalho legislativo passa pelas comissões — grupos temáticos que analisam os projetos antes de irem a plenário — e pelas sessões, quando os deputados debatem e votam as propostas. A Comissão de Constituição, Justiça e Redação (CCJR) é uma das mais importantes, por avaliar a legalidade dos textos.",
      "Além de legislar, cabe à Assembleia acompanhar a aplicação do orçamento estadual e convocar autoridades para prestar contas. As sessões são públicas e podem ser acompanhadas ao vivo pelos canais oficiais da Casa.",
    ],
  },
  {
    sub: "congresso",
    title: "O que faz um deputado federal e como acompanhar as votações",
    slug: "o-que-faz-deputado-federal-como-acompanhar-votacoes",
    fonte: ["Câmara dos Deputados", "https://www.camara.leg.br/"],
    excerpt: "Deputados federais representam a população na Câmara, votam leis e fiscalizam o governo; veja como acompanhar as votações em tempo real.",
    deck: "A Câmara dos Deputados tem 513 parlamentares que legislam em nome de todo o país.",
    paras: [
      "A Câmara dos Deputados é uma das duas casas do Congresso Nacional, ao lado do Senado. São 513 deputados federais, distribuídos entre os estados de acordo com a população, com mandato de quatro anos.",
      "Entre as atribuições estão propor e votar leis, analisar o orçamento da União e fiscalizar o Poder Executivo. Projetos aprovados na Câmara seguem para o Senado e, depois, para sanção presidencial.",
      "As votações e o andamento dos projetos podem ser acompanhados em tempo real no portal oficial da Câmara e pela TV Câmara, que transmite as sessões do plenário e das comissões.",
    ],
  },
  {
    sub: "governo",
    title: "Como é organizado o Governo de Mato Grosso e suas secretarias",
    slug: "como-organizado-governo-mato-grosso-secretarias",
    fonte: ["Governo de Mato Grosso", "https://www.mt.gov.br/"],
    excerpt: "O Executivo estadual é chefiado pelo governador e dividido em secretarias que cuidam de saúde, educação, segurança e outras áreas; entenda.",
    deck: "O Poder Executivo de MT executa as políticas públicas por meio de secretarias temáticas.",
    paras: [
      "O Poder Executivo de Mato Grosso é chefiado pelo governador, eleito para um mandato de quatro anos. Cabe ao Executivo administrar o estado e colocar em prática as políticas públicas aprovadas em lei.",
      "Para dar conta das diferentes áreas, o governo se divide em secretarias — como Saúde, Educação, Segurança Pública, Fazenda e Infraestrutura. Cada secretaria é responsável por planejar e executar ações do seu setor.",
      "O controle sobre o uso dos recursos é feito pela Assembleia Legislativa e pelo Tribunal de Contas do Estado. Os dados de gastos e contratos ficam disponíveis nos portais de transparência oficiais.",
    ],
  },
  {
    sub: "brasil-mundo",
    title: "Como funcionam os três Poderes da República no Brasil",
    slug: "como-funcionam-tres-poderes-republica-brasil",
    fonte: ["Presidência da República", "https://www.gov.br/planalto/"],
    excerpt: "Executivo, Legislativo e Judiciário são independentes e se controlam mutuamente; entenda o sistema de freios e contrapesos da democracia brasileira.",
    deck: "A Constituição de 1988 organiza o país em três Poderes independentes e harmônicos.",
    paras: [
      "A República Federativa do Brasil é organizada em três Poderes: o Executivo, que governa e administra; o Legislativo, que faz as leis e fiscaliza; e o Judiciário, que julga e garante o cumprimento da Constituição.",
      "Os Poderes são independentes, mas se controlam mutuamente — é o chamado sistema de freios e contrapesos. Uma lei aprovada pelo Congresso, por exemplo, pode ser vetada pelo presidente ou questionada no Supremo Tribunal Federal.",
      "Esse equilíbrio, previsto na Constituição de 1988, existe para evitar a concentração de poder e proteger os direitos dos cidadãos. Cada esfera — federal, estadual e municipal — reproduz essa mesma divisão.",
    ],
  },
  {
    sub: "internacional",
    title: "O que é a ONU e como o Brasil participa das decisões globais",
    slug: "o-que-e-onu-como-brasil-participa-decisoes-globais",
    fonte: ["Nações Unidas", "https://www.un.org/pt/"],
    excerpt: "A ONU reúne 193 países para promover paz, direitos humanos e cooperação; o Brasil é membro fundador e voz ativa nos debates internacionais.",
    deck: "Criada em 1945, a ONU é o principal fórum de cooperação entre as nações.",
    paras: [
      "A Organização das Nações Unidas (ONU) foi criada em 1945, após a Segunda Guerra Mundial, para promover a paz, os direitos humanos e a cooperação entre os países. Hoje reúne 193 Estados-membros.",
      "Suas decisões passam por órgãos como a Assembleia Geral, onde cada país tem um voto, e o Conselho de Segurança, responsável por questões de paz e segurança internacional. Também mantém agências para saúde, educação e refugiados.",
      "O Brasil é um dos membros fundadores e, por tradição, é o primeiro país a discursar na abertura da Assembleia Geral. A atuação brasileira é conduzida pelo Ministério das Relações Exteriores, o Itamaraty.",
    ],
  },
  {
    sub: "colunas",
    title: "Por que a transparência pública fortalece a democracia",
    slug: "por-que-transparencia-publica-fortalece-democracia",
    fonte: ["Controladoria-Geral da União", "https://www.gov.br/cgu/"],
    excerpt: "Acesso a dados de gastos e contratos permite ao cidadão fiscalizar o poder público; a transparência é um pilar do controle social e da confiança.",
    deck: "Opinião — quando o cidadão enxerga como o dinheiro público é usado, a democracia ganha.",
    paras: [
      "Transparência não é favor: é dever do poder público e direito do cidadão. A Lei de Acesso à Informação garante a qualquer pessoa consultar como os recursos são arrecadados e gastos.",
      "Quando os dados de contratos, salários e obras estão abertos, o controle deixa de ser exclusivo dos órgãos oficiais e passa a ser também da imprensa e da sociedade. É o chamado controle social.",
      "Portais de transparência, audiências públicas e prestações de contas não eliminam problemas sozinhos, mas encurtam o caminho entre o desvio e a descoberta. Cobrar clareza é uma forma concreta de fortalecer a democracia.",
    ],
  },
];

const posts = [];
const posts_tags = [];
ARTS.forEach((a, i) => {
  const id = i + 1;
  posts.push({
    id, title: a.title, slug: a.slug, type: "post", status: "published", visibility: "public",
    mobiledoc: body(a.deck, a.paras),
    feature_image: null,
    feature_image_caption: `Fonte: <a href="${a.fonte[1]}" target="_blank" rel="noopener">${a.fonte[0]}</a>`,
    custom_excerpt: a.excerpt,
    created_at: NOW, updated_at: NOW, published_at: NOW,
  });
  // Política sempre primeiro (roteia p/ O Dia Político); depois a subeditoria; depois a interna.
  let order = 0;
  posts_tags.push({ tag_id: slugToId.politica, post_id: id, sort_order: order++ });
  if (a.sub !== "politica") posts_tags.push({ tag_id: slugToId[a.sub], post_id: id, sort_order: order++ });
  posts_tags.push({ tag_id: 99, post_id: id, sort_order: order++ });
});

const out = { db: [{ data: { posts, tags: TAGS, posts_tags } }] };
const path = new URL("./odiapolitico-seed.json", import.meta.url);
writeFileSync(path, JSON.stringify(out, null, 1) + "\n");
console.log(`OK: odiapolitico-seed.json — ${posts.length} matérias, ${TAGS.length} tags.`);
