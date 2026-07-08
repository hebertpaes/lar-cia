// Aplica a edição (feita por mim, Claude) às 8 matérias reais da SECOM, no modelo
// do usuário. Preserva foto, crédito da fonte, tags/editoria, datas e slug.
import { readFileSync, writeFileSync } from "node:fs";

const src = process.argv[2];
const out = process.argv[3];
const j = JSON.parse(readFileSync(src, "utf8"));

// conteúdo editado por id
const E = {
  1: {
    titulo: "MT acelera obras e leva entregas do governo a todas as regiões",
    subtitulo: "Estado diz manter ritmo recorde de investimento",
    corpo:
      "<p>O Governo de Mato Grosso afirma estar à frente dos investimentos públicos no estado e destaca um conjunto de entregas que, segundo o Executivo, alcança todas as regiões mato-grossenses.</p>" +
      "<p>Na avaliação da gestão estadual, os aportes em obras e serviços cresceram de forma acentuada nos últimos anos, e a meta para 2026 é preservar esse volume, apoiada na organização das contas públicas.</p>" +
      "<p>As ações abrangem infraestrutura, saúde, educação e segurança, com a proposta de aproximar os serviços dos moradores de municípios de todo o território.</p>",
    resumo: "Governo de Mato Grosso afirma liderar investimentos e ampliar entregas em infraestrutura, saúde e educação em todas as regiões do estado em 2026.",
  },
  2: {
    titulo: "Investimento do Estado sobe 637% e sustenta novas obras em 2026",
    subtitulo: "Aportes saltam de R$ 773 mi para R$ 5,7 bi ao ano",
    corpo:
      "<p>Os investimentos do Governo de Mato Grosso avançaram 637,2% entre 2019 e 2025, subindo de R$ 773,5 milhões para R$ 5,7 bilhões por ano, de acordo com o Executivo estadual.</p>" +
      "<p>O Estado atribui o crescimento ao reequilíbrio das contas e à disciplina fiscal do período, que teria aberto espaço para ampliar obras sem atrasar salários de servidores nem pagamentos a fornecedores.</p>" +
      "<p>Para 2026, a gestão projeta manter o patamar elevado e sustentar um novo ciclo de obras em infraestrutura, saúde e educação em diferentes regiões.</p>",
    resumo: "Investimentos de Mato Grosso cresceram 637% entre 2019 e 2025, de R$ 773,5 milhões para R$ 5,7 bilhões, sustentando um novo ciclo de obras em 2026.",
  },
  3: {
    titulo: "Governo envia à Assembleia projeto para mais 60 mil casas populares",
    subtitulo: "Meta é ampliar moradia a famílias de baixa renda",
    corpo:
      "<p>O Governo de Mato Grosso, sob o comando do governador Otaviano Pivetta, enviou à Assembleia Legislativa um projeto que pretende viabilizar a construção de mais 60 mil casas populares no estado.</p>" +
      "<p>A proposta faz parte da política habitacional estadual e tem como foco ampliar o acesso à moradia, priorizando famílias de baixa renda.</p>" +
      "<p>Se for aprovada pelos deputados, a medida deve impulsionar a habitação popular em municípios de diferentes regiões mato-grossenses.</p>",
    resumo: "Executivo encaminhou à Assembleia Legislativa proposta para viabilizar mais 60 mil casas populares e ampliar o acesso à moradia em Mato Grosso.",
  },
  4: {
    titulo: "Barra do Garças terá Hospital Regional, anuncia governo de MT",
    subtitulo: "Município tem 60 dias para entregar o terreno",
    corpo:
      "<p>O Governo de Mato Grosso anunciou a construção de um Hospital Regional em Barra do Garças, durante encontro com o prefeito e vereadores do município.</p>" +
      "<p>Pelo cronograma apresentado, a cidade terá 60 dias para indicar o terreno e reunir a documentação da área. Concluída essa etapa, o Estado inicia os projetos técnicos e segue para a licitação.</p>" +
      "<p>A futura unidade deve reforçar o atendimento de média e alta complexidade para os moradores da região do Araguaia.</p>",
    resumo: "Governo de MT confirma Hospital Regional em Barra do Garças; município terá 60 dias para apresentar o terreno antes do início dos projetos técnicos.",
  },
  5: {
    titulo: "MT projeta entregar mais de 7 mil km de asfalto até o fim de 2026",
    subtitulo: "Volume seria o dobro feito em 271 anos",
    corpo:
      "<p>O Governo de Mato Grosso projeta entregar mais de 7 mil quilômetros de novo asfalto até o fim de 2026, segundo balanço do Executivo estadual.</p>" +
      "<p>De acordo com o Estado, o total previsto para o período equivale ao dobro de tudo o que foi pavimentado ao longo dos 271 anos de história de Mato Grosso.</p>" +
      "<p>As frentes viárias buscam melhorar a logística, baixar o custo do transporte e integrar as regiões produtoras do estado.</p>",
    resumo: "Governo de Mato Grosso projeta entregar mais de 7 mil km de asfalto até o fim de 2026, o dobro do pavimentado em 271 anos de história do estado.",
  },
  6: {
    titulo: "'Meninas que Transformam' encerra inscrições nesta segunda (30)",
    subtitulo: "Programa da Seplag oferece vagas a alunas do EM",
    corpo:
      "<p>Terminam nesta segunda-feira (30) as inscrições do programa 'Meninas que Transformam', do Governo de Mato Grosso, voltado a estudantes do Ensino Médio da rede pública.</p>" +
      "<p>As candidatas podem se inscrever até as 18h pelo sistema SiesMT. A ação é conduzida pela Secretaria de Estado de Planejamento e Gestão (Seplag), em parceria com o Gabinete de Enfrentamento à Violência de Gênero contra a Mulher.</p>" +
      "<p>A proposta é aproximar as alunas do mundo do trabalho e incentivar a presença feminina em diferentes áreas profissionais.</p>",
    resumo: "Inscrições do programa 'Meninas que Transformam', da Seplag, terminam nesta segunda (30) às 18h pelo SiesMT; vagas são para alunas do Ensino Médio.",
  },
  7: {
    titulo: "Governo de MT lista 10 obras que mudam a mobilidade em Cuiabá",
    subtitulo: "Intervenções viárias e de drenagem na capital",
    corpo:
      "<p>O Governo de Mato Grosso reuniu dez obras de infraestrutura executadas em Cuiabá, com ênfase na mobilidade urbana e na qualidade de vida da capital.</p>" +
      "<p>Entre as intervenções estão frentes viárias, sistemas de drenagem e a requalificação de avenidas e corredores que concentram grande fluxo de veículos.</p>" +
      "<p>Segundo a Sinfra, as entregas integram o plano estadual de modernizar a infraestrutura da capital e da região metropolitana do Vale do Rio Cuiabá.</p>",
    resumo: "Governo de Mato Grosso apresenta dez obras viárias e de drenagem em Cuiabá que, segundo a Sinfra, transformam a mobilidade urbana na capital.",
  },
  8: {
    titulo: "MT é referência em regularização ambiental, diz secretária",
    subtitulo: "Avanço no CAR une produção e preservação",
    corpo:
      "<p>Mato Grosso mantém a estratégia mais consistente de regularização ambiental do país, afirmou a secretária da área em balanço divulgado pelo Governo do Estado.</p>" +
      "<p>O avanço se apoia no Cadastro Ambiental Rural (CAR) e no apoio à recuperação de áreas, conciliando a produção agropecuária com a preservação dos recursos naturais.</p>" +
      "<p>Para o Estado, a regularização amplia a segurança jurídica do produtor e fortalece a imagem do agro mato-grossense nos mercados interno e externo.</p>",
    resumo: "Secretária afirma que Mato Grosso tem a estratégia mais consistente de regularização ambiental do país, com avanço no CAR e recuperação de áreas.",
  },
};

const esc = (s) => String(s).replace(/&/g, "&amp;");
const posts = j.db[0].data.posts;
let problemas = 0;
for (const p of posts) {
  const e = E[p.id]; if (!e) continue;
  const rep = (n, v, lo, hi) => { const L = v.length; const ok = L <= hi && L >= (lo || 0); if (!ok) problemas++; return `${ok ? "ok" : "XX"} ${n}=${L}`; };
  console.log(`#${p.id} [${rep("tit", e.titulo, 1, 76)}] [${rep("sub", e.subtitulo, 1, 55)}] [${rep("resumo", e.resumo, 139, 149)}]  ${e.titulo}`);
  p.title = e.titulo;
  p.custom_excerpt = e.resumo;
  const html = `<p class="post-deck"><strong>${esc(e.subtitulo)}</strong></p>` + e.corpo;
  p.mobiledoc = JSON.stringify({ version: "0.3.1", atoms: [], markups: [], sections: [[10, 0]], cards: [["html", { html }]] });
}
writeFileSync(out, JSON.stringify(j, null, 2) + "\n");
console.log(problemas ? `\n⚠️ ${problemas} campo(s) fora do limite — ajustar.` : "\n✅ Todos os campos dentro dos limites. Arquivo: " + out);
