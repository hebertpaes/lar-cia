#!/usr/bin/env node
/* Gera ghost/import/secom-import.json — 20 matérias completas baseadas em
   notícias OFICIAIS do Governo de Mato Grosso (SECOM-MT), com atribuição e
   link para a fonte. Importe em: Ghost Admin → Settings → Labs → Import content.

   NOTA DE PROCEDÊNCIA: os fatos (números, datas, ações) foram levantados nas
   próprias publicações da SECOM-MT/órgãos do Estado. O site bloqueia leitura
   automática do corpo integral, então os textos foram redigidos a partir dos
   fatos verificados e trazem SEMPRE a fonte e o link da matéria original.
   Revise contra o original antes de publicar em produção. */

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, "secom-import.json");

const slugify = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const mobiledoc = (html) => JSON.stringify({
  version: "0.3.1", atoms: [], markups: [], sections: [[10, 0]], cards: [["html", { html }]],
});
const photo = (seed) => `https://picsum.photos/seed/${seed}/1200/675`;

const BASE_MS = Date.UTC(2026, 5, 29, 18, 0, 0); // 29/06/2026
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
  policia: tag("Polícia", "policia", "public", "Segurança pública em Mato Grosso."),
  economia: tag("Economia", "economia", "public", "Economia, indústria e desenvolvimento."),
  agro: tag("Agro", "agro", "public", "O agronegócio que move Mato Grosso."),
  "brasil-mundo": tag("Brasil & Mundo", "brasil-mundo", "public", "MT no cenário nacional e internacional."),
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
  { ed: "politica", seed: "cuiaba-663mi", title: "Governo de MT anuncia pacote de R$ 663,3 milhões em investimentos para Cuiabá",
    excerpt: "Recursos serão aplicados em infraestrutura, educação e habitação na capital, segundo o governador Mauro Mendes.",
    paras: [
      "O Governo de Mato Grosso anunciou um pacote de R$ 663,3 milhões em novos investimentos para Cuiabá. Segundo o governador Mauro Mendes, os recursos serão direcionados a obras de infraestrutura, educação e habitação na capital.",
      "De acordo com o Executivo estadual, as ações têm como objetivo melhorar a qualidade de vida da população cuiabana e ampliar a oferta de serviços públicos na cidade.",
      "O anuncio integra a estratégia do Estado de levar investimentos a todas as regiões de Mato Grosso, com foco em obras estruturantes.",
    ], fonte: { nome: "SECOM-MT", url: "https://www.secom.mt.gov.br/w/-governo-de-mt-vai-ajudar-a-melhorar-a-qualidade-de-vida-do-cuiabano-com-esses-investimentos-afirma-governador" } },

  { ed: "cidades", seed: "hospitais-regionais", title: "Construção dos Hospitais Regionais avança em Mato Grosso; veja o andamento",
    excerpt: "Quatro novas unidades regionais somam mais de meio bilhão em investimento; Alta Floresta está 96% concluída.",
    paras: [
      "As obras dos novos Hospitais Regionais avançam em Mato Grosso. O Hospital Regional de Alta Floresta, com investimento de R$ 186 milhões, é o mais próximo da conclusão, com 96% das obras executadas.",
      "Também estão em andamento o Hospital Regional de Juína (R$ 135 milhões, 56% concluído), o Hospital Regional do Araguaia, em Confresa (R$ 141 milhões, 45%), e o Hospital Regional de Tangará da Serra (R$ 132 milhões, 51%).",
      "As unidades fazem parte do plano do Governo do Estado de fortalecer a saúde pública e ampliar o atendimento de média e alta complexidade no interior.",
    ], fonte: { nome: "SECOM-MT", url: "https://www.secom.mt.gov.br/w/constru%C3%A7%C3%A3o-dos-hospitais-regionais-avan%C3%A7a-em-mato-grosso-veja-o-andamento-das-obras" } },

  { ed: "policia", seed: "forca-total", title: "Polícia Militar deflagra Operação Força Total nos 142 municípios de MT",
    excerpt: "Ação integrada reforça o policiamento ostensivo simultaneamente em todo o estado.",
    paras: [
      "A Polícia Militar de Mato Grosso deflagrou a Operação Força Total, com reforço do policiamento ostensivo de forma simultânea nos 142 municípios do estado.",
      "A iniciativa intensifica a presença das forças de segurança nas ruas, com foco na prevenção e na repressão qualificada à criminalidade.",
      "A operação integra o conjunto de medidas do Governo do Estado para fortalecer a segurança pública em Mato Grosso.",
    ], fonte: { nome: "SECOM-MT / SESP", url: "https://www.secom.mt.gov.br/web/sesp/w/pol%C3%ADcia-militar-deflagra-opera%C3%A7%C3%A3o-for%C3%A7a-total-nos-142-munic%C3%ADpios-de-mato-grosso-1" } },

  { ed: "agro", seed: "plano-florestal", title: "Governo aprova Plano de Desenvolvimento Florestal e Biomassa 2026–2040",
    excerpt: "Decreto aposta na floresta como fonte de renda; meta é chegar a 700 mil hectares de florestas plantadas até 2040.",
    paras: [
      "O Governo de Mato Grosso assinou o decreto que aprova o Plano de Desenvolvimento Florestal e Biomassa 2026–2040, estratégia que aposta na floresta como fonte de renda e de desenvolvimento sustentável.",
      "Entre as metas, o plano prevê ampliar a área de florestas plantadas para 700 mil hectares até 2040, fortalecer o manejo sustentável em áreas nativas e aumentar a participação do setor florestal nas exportações.",
      "A medida busca conciliar produção e preservação, em um estado que lidera a produção de grãos e também avança na redução do desmatamento.",
    ], fonte: { nome: "SECOM-MT", url: "https://www.secom.mt.gov.br/w/governo-de-mato-grosso-assina-decreto-que-aprova-o-plano-de-desenvolvimento-florestal-e-biomassa-1" } },

  { ed: "economia", seed: "incentivos-fiscais", title: "Governo de MT prorroga incentivos fiscais ao comércio e garante competitividade",
    excerpt: "Prorrogação de benefícios concedidos ao comércio do estado vale até 30 de abril de 2026.",
    paras: [
      "O Governo de Mato Grosso oficializou a prorrogação de diversos incentivos fiscais concedidos ao comércio do estado, com validade até 30 de abril de 2026.",
      "Segundo a Secretaria de Fazenda, a medida busca garantir competitividade às empresas mato-grossenses e preservar a geração de emprego e renda.",
      "A prorrogação dá previsibilidade ao setor e mantém condições para a continuidade dos investimentos no comércio.",
    ], fonte: { nome: "SECOM-MT / SEFAZ", url: "https://www.secom.mt.gov.br/web/sefaz/w/governo-de-mt-prorroga-incentivos-fiscais-para-o-com%C3%A9rcio-e-garante-competitividade" } },

  { ed: "cidades", seed: "hospital-central", title: "Hospital Central de Alta Complexidade de Cuiabá recebe R$ 541 milhões",
    excerpt: "Unidade soma R$ 295 milhões em construção e R$ 246 milhões em equipamentos.",
    paras: [
      "O Hospital Central de Alta Complexidade, em Cuiabá, recebe um dos maiores investimentos em saúde do estado: R$ 295 milhões na construção e R$ 246 milhões em equipamentos, totalizando R$ 541 milhões.",
      "A unidade vai ampliar a oferta de procedimentos de alta complexidade e desafogar a rede de atendimento na capital e região metropolitana.",
      "A obra integra o conjunto de investimentos do Governo do Estado na infraestrutura da saúde em Cuiabá.",
    ], fonte: { nome: "SECOM-MT", url: "https://www.secom.mt.gov.br/w/governo-de-mt-investe-meio-bilh%C3%A3o-na-infraestrutura-da-sa%C3%BAde-em-cuiab%C3%A1" } },

  { ed: "policia", seed: "pm-739", title: "Polícia Militar promove 739 militares em aniversário de 189 anos",
    excerpt: "Cerimônia oficializou as promoções e a nomeação de dois novos coronéis da corporação.",
    paras: [
      "A Polícia Militar de Mato Grosso oficializou a promoção de 739 militares em cerimônia alusiva aos 189 anos da instituição.",
      "Entre as promoções, foram formalizados dois novos coronéis, reconhecendo o mérito e a trajetória dos profissionais da corporação.",
      "O ato reforça a valorização dos agentes de segurança pública do estado, segundo o Governo de Mato Grosso.",
    ], fonte: { nome: "SECOM-MT / PMMT", url: "https://www.secom.mt.gov.br/web/pm/w/pol%C3%ADcia-militar-oficializa-promo%C3%A7%C3%A3o-de-739-militares-em-189%C2%BA-anivers%C3%A1rio-da-institui%C3%A7%C3%A3o" } },

  { ed: "cidades", seed: "educacao-8a", title: "Educação de MT se torna a 8ª melhor do país no Ideb",
    excerpt: "Rede estadual saltou da 22ª para a 8ª posição em seis anos, com investimento em infraestrutura e tecnologia.",
    paras: [
      "O ensino na rede estadual de Mato Grosso deu um salto histórico nos últimos seis anos, passando da 22ª para a 8ª melhor posição do país no Índice de Desenvolvimento da Educação Básica (Ideb).",
      "Segundo o Governo do Estado, o avanço é resultado de investimentos em infraestrutura escolar, tecnologia e valorização dos profissionais da educação.",
      "Entre as ações, estão a entrega de equipamentos como chromebooks e smart TVs e a ampliação de vagas na rede.",
    ], fonte: { nome: "SECOM-MT / SEDUC", url: "https://www.secom.mt.gov.br/w/com-investimentos-em-infraestrutura-e-tecnologia-educa%C3%A7%C3%A3o-de-mt-passa-a-ser-a-8%C2%AA-melhor-do-pa%C3%ADs" } },

  { ed: "politica", seed: "salarios-junho", title: "Governo de MT paga folha de junho de R$ 833,5 milhões a servidores",
    excerpt: "Pagamento contemplou ativos, aposentados e pensionistas do Executivo estadual.",
    paras: [
      "O Governo de Mato Grosso pagou a folha salarial referente a junho, que somou R$ 833,5 milhões líquidos, contemplando servidores ativos, aposentados e pensionistas do Poder Executivo.",
      "Do total, R$ 581,1 milhões foram destinados aos servidores ativos da administração direta e indireta, e R$ 252,4 milhões ao pagamento de aposentados e pensionistas.",
      "O pagamento em dia, segundo o Estado, reflete o equilíbrio das contas públicas de Mato Grosso.",
    ], fonte: { nome: "SECOM-MT", url: "https://www.secom.mt.gov.br/noticias" } },

  { ed: "agro", seed: "safra-recorde", title: "Safra de grãos de MT será a maior da história, com recorde de produtividade da soja",
    excerpt: "Projeções apontam novo recorde de produção e da produtividade média da soja no estado.",
    paras: [
      "As projeções indicam que a safra de grãos de Mato Grosso será a maior da história, acompanhada da maior produtividade média da soja já registrada no estado.",
      "O resultado reforça a posição de Mato Grosso como líder nacional na produção de grãos.",
      "Segundo o Governo do Estado, o desempenho combina tecnologia no campo, boas práticas e condições favoráveis de produção.",
    ], fonte: { nome: "SECOM-MT / SEDEC", url: "https://www.secom.mt.gov.br/web/sedec/w/safra-de-gr%C3%A3os-em-mt-ser%C3%A1-a-maior-da-hist%C3%B3ria-e-com-maior-produtividade-m%C3%A9dia-da-soja" } },

  { ed: "economia", seed: "industria-38", title: "Indústria de Mato Grosso cresce 3,8% no início de 2026",
    excerpt: "Setor industrial avançou nos dois primeiros meses do ano em relação ao mesmo período de 2025.",
    paras: [
      "A indústria de Mato Grosso cresceu 3,8% nos dois primeiros meses de 2026, na comparação com o mesmo período de 2025.",
      "De acordo com o Governo do Estado, o desempenho está associado aos incentivos concedidos ao setor e ao ambiente favorável a novos investimentos.",
      "O crescimento industrial contribui para a diversificação da economia e a geração de empregos em Mato Grosso.",
    ], fonte: { nome: "SECOM-MT", url: "https://www.secom.mt.gov.br/w/ind%C3%BAstria-de-mato-grosso-cresce-em-2026-com-incentivos-do-governo-do-estado" } },

  { ed: "policia", seed: "201-servidores", title: "Governo nomeia 201 servidores para reforçar a Segurança Pública de MT",
    excerpt: "Convocados vão atuar no sistema prisional, no socioeducativo e na perícia técnica.",
    paras: [
      "O Governo de Mato Grosso nomeou 201 servidores para reforçar a Segurança Pública do estado.",
      "Os convocados vão atuar em áreas como o sistema prisional, o sistema socioeducativo e a perícia técnica.",
      "A medida amplia o efetivo e fortalece a estrutura das forças de segurança em Mato Grosso.",
    ], fonte: { nome: "SECOM-MT", url: "https://www.secom.mt.gov.br/w/governo-nomeia-201-servidores-para-refor%C3%A7ar-a-seguran%C3%A7a-p%C3%BAblica-de-mt" } },

  { ed: "politica", seed: "relatorio-gestao", title: "Relatório de Gestão 2025 aponta 98% das metas estratégicas cumpridas em MT",
    excerpt: "Documento apresentado na Assembleia mostra alto índice de execução das ações planejadas.",
    paras: [
      "O Relatório Anual de Gestão de 2025, apresentado em audiência pública na Assembleia Legislativa, aponta que Mato Grosso alcançou 98% das metas dos indicadores estratégicos.",
      "Segundo o documento, o estado executou 91% das ações planejadas e atingiu 97% da execução financeira prevista para o ano.",
      "Os números, segundo o relatório, refletem o cumprimento do planejamento e o foco em resultados na gestão pública.",
    ], fonte: { nome: "Assembleia Legislativa de MT", url: "https://www.al.mt.gov.br/midia/texto/relatorio-de-gestao-de-2025-destaca-avancos-e-metas-cumpridas-em-mato-grosso/visualizar" } },

  { ed: "cidades", seed: "colegios-alto-padrao", title: "Meta do Governo é encerrar 2026 com 30 colégios estaduais de alto padrão",
    excerpt: "Seis unidades já foram entregues e novas construções avançam no interior do estado.",
    paras: [
      "A meta do Governo de Mato Grosso é finalizar 2026 com 30 colégios estaduais de alto padrão em funcionamento. Seis unidades já foram entregues à comunidade escolar.",
      "Outras construções no mesmo modelo estão em andamento no interior do estado, com novas obras previstas para os próximos meses.",
      "Os complexos educacionais ampliam a oferta de ensino de qualidade na rede estadual, segundo a Seduc.",
    ], fonte: { nome: "SECOM-MT / SEDUC", url: "https://www.secom.mt.gov.br/w/meta-do-governador-%C3%A9-finalizar-2026-com-30-col%C3%A9gios-de-alto-padr%C3%A3o" } },

  { ed: "economia", seed: "agricultura-familiar", title: "Governo de MT investe R$ 720 milhões na agricultura familiar",
    excerpt: "Recursos viabilizaram a entrega de 7.709 máquinas e equipamentos em seis anos.",
    paras: [
      "O Governo de Mato Grosso investiu R$ 720 milhões na agricultura familiar ao longo dos últimos seis anos.",
      "Os recursos viabilizaram a entrega de 7.709 máquinas e equipamentos, fortalecendo a produção no campo e o uso de tecnologia para aumentar a produtividade.",
      "O Fundo de Apoio à Agricultura Familiar (Fundaaf) dará continuidade às ações, com aportes do Tesouro Estadual nos próximos anos.",
    ], fonte: { nome: "SECOM-MT / SEAF", url: "https://www.secom.mt.gov.br/web/seaf/w/governo-de-mt-investiu-r-720-milh%C3%B5es-na-agricultura-familiar" } },

  { ed: "policia", seed: "tolerancia-zero", title: "Governo lança pacote de medidas integradas contra o crime organizado em MT",
    excerpt: "Conjunto de ações intensifica o enfrentamento ao crime organizado no estado.",
    paras: [
      "O Governo de Mato Grosso lançou um pacote de medidas integradas para o combate ao crime organizado no estado.",
      "O conjunto de ações intensifica a atuação das forças de segurança e a integração entre os órgãos responsáveis pelo enfrentamento à criminalidade.",
      "A iniciativa faz parte da estratégia do Estado para fortalecer a segurança pública em Mato Grosso.",
    ], fonte: { nome: "SECOM-MT", url: "https://www.secom.mt.gov.br/w/governador-lan%C3%A7a-pacote-de-medidas-integradas-para-combate-ao-crime-organizado-em-mt" } },

  { ed: "politica", seed: "7mil-km-rodovias", title: "Governador projeta quase 7 mil km de rodovias asfaltadas até o fim de 2026",
    excerpt: "Em fórum nacional, governador destacou volume de obras viárias entregues pelo estado.",
    paras: [
      "Em fórum nacional, o governador afirmou que, com robustos investimentos, Mato Grosso vai finalizar quase 7 mil km de rodovias asfaltadas até o fim de 2026.",
      "Segundo o Governo do Estado, o volume entregue no período corresponde a um avanço histórico na malha viária pavimentada do estado.",
      "As obras buscam melhorar a logística, reduzir custos de transporte e integrar as regiões de Mato Grosso.",
    ], fonte: { nome: "SECOM-MT", url: "https://www.secom.mt.gov.br/w/-com-robustos-investimentos-vamos-finalizar-quase-7-mil-km-de-rodovias-asfaltadas-afirma-governador-em-f%C3%B3rum-nacional" } },

  { ed: "agro", seed: "regulariza-rural", title: "Programa Regulariza Rural vai beneficiar 1.300 pequenos produtores em MT",
    excerpt: "Iniciativa oferece consultoria técnica gratuita para CAR e recuperação de áreas degradadas.",
    paras: [
      "O Governo de Mato Grosso lançou o programa Regulariza Rural, que vai beneficiar 1.300 pequenos produtores com consultoria técnica gratuita.",
      "O apoio inclui a elaboração do Cadastro Ambiental Rural (CAR) e do Projeto de Recuperação de Áreas Degradadas e Alteradas (Prada).",
      "Segundo produtores ouvidos pelo Estado, a iniciativa traz mais segurança jurídica para produzir e regularizar as propriedades.",
    ], fonte: { nome: "SECOM-MT", url: "https://www.secom.mt.gov.br/w/governo-de-mt-lan%C3%A7a-programa-regulariza-rural-est%C3%A3o-dando-seguran%C3%A7a-para-produzir-afirma-produtor" } },

  { ed: "brasil-mundo", seed: "concessoes-internacional", title: "Contratos de concessão de rodovias de MT viram referência internacional",
    excerpt: "Modelo de concessões do estado é citado como exemplo fora do país.",
    paras: [
      "Os novos contratos de concessão de rodovias de Mato Grosso se tornaram referência internacional, segundo o Governo do Estado.",
      "O modelo busca garantir investimentos privados na infraestrutura viária com tarifas acessíveis aos usuários.",
      "A experiência mato-grossense passou a ser observada como exemplo de parceria entre o poder público e a iniciativa privada.",
    ], fonte: { nome: "SECOM-MT / SINFRA", url: "https://www.secom.mt.gov.br/en/web/sinfra/w/novos-contratos-de-concess%C3%A3o-de-mato-grosso-se-tornam-refer%C3%AAncia-internacional" } },

  { ed: "brasil-mundo", seed: "ferrovia-mt", title: "MT avança em obras estruturantes que melhoram a vida do mato-grossense",
    excerpt: "Estado destaca conjunto de entregas em rodovias, pontes e novos modais de transporte.",
    paras: [
      "O Governo de Mato Grosso destaca um conjunto de obras estruturantes que, segundo o Estado, vêm melhorando a vida da população em todas as regiões.",
      "Entre os avanços estão a recuperação e a pavimentação de rodovias, a substituição de pontes de madeira por estruturas de concreto e o investimento em novos modais de transporte.",
      "As entregas integram a estratégia de desenvolvimento e de integração logística do estado.",
    ], fonte: { nome: "SECOM-MT", url: "https://www.secom.mt.gov.br/w/confira-as-obras-do-governo-de-mt-que-est%C3%A3o-melhorando-a-vida-do-mato-grossense" } },
];

// Marca algumas matérias com vídeo (para o bloco "Vídeos" da barra lateral).
const COM_VIDEO = new Set(["forca-total", "plano-florestal", "educacao-8a", "7mil-km-rodovias", "hospitais-regionais"]);
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
