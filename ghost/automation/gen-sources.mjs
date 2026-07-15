#!/usr/bin/env node
/* Gera ghost/automation/sources.mt.json — registro das ASSESSORIAS oficiais de
   Mato Grosso que o coletor (collect.mjs) vai varrer:
     - Federais: Agência Brasil, Agência Câmara, Agência Senado e gov.br/SECOM
     - Estaduais: SECOM-MT (Executivo), ALMT (Assembleia) e AMM (Associação dos Municípios)
     - 141 PREFEITURAS  (padrão de domínio: <municipio>.mt.gov.br)
     - 141 CÂMARAS       (padrão de domínio: <municipio>.mt.leg.br)

   IMPORTANTE: os domínios das prefeituras/câmaras seguem um PADRÃO, mas há
   exceções. Por isso cada entrada gerada vem com "verificar": true. Rode o
   coletor: as fontes que responderem com RSS válido entram; as que falharem são
   apenas reportadas (ajuste a url/feed dessas no JSON e rode de novo).

   Uso: node ghost/automation/gen-sources.mjs */

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, "sources.mt.json");

const slug = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "");

// 142 municípios de Mato Grosso (IBGE). Revise grafias antes de produção.
const MUNICIPIOS = [
  "Acorizal","Água Boa","Alta Floresta","Alto Araguaia","Alto Boa Vista","Alto Garças",
  "Alto Paraguai","Alto Taquari","Apiacás","Araguaiana","Araguainha","Araputanga",
  "Arenápolis","Aripuanã","Barão de Melgaço","Barra do Bugres","Barra do Garças",
  "Bom Jesus do Araguaia","Brasnorte","Cáceres","Campinápolis","Campo Novo do Parecis",
  "Campo Verde","Campos de Júlio","Canabrava do Norte","Canarana","Carlinda","Castanheira",
  "Chapada dos Guimarães","Cláudia","Cocalinho","Colíder","Colniza","Comodoro","Confresa",
  "Conquista d'Oeste","Cotriguaçu","Curvelândia","Cuiabá","Denise","Diamantino","Dom Aquino",
  "Feliz Natal","Figueirópolis d'Oeste","Gaúcha do Norte","General Carneiro","Glória d'Oeste",
  "Guarantã do Norte","Guiratinga","Indiavaí","Ipiranga do Norte","Itanhangá","Itaúba",
  "Itiquira","Jaciara","Jangada","Jauru","Juara","Juína","Juruena","Juscimeira",
  "Lambari d'Oeste","Lucas do Rio Verde","Luciára","Marcelândia","Matupá","Mirassol d'Oeste",
  "Nobres","Nortelândia","Nossa Senhora do Livramento","Nova Bandeirantes","Nova Brasilândia",
  "Nova Canaã do Norte","Nova Guarita","Nova Lacerda","Nova Marilândia","Nova Maringá",
  "Nova Monte Verde","Nova Mutum","Nova Nazaré","Nova Olímpia","Nova Santa Helena",
  "Nova Ubiratã","Nova Xavantina","Novo Horizonte do Norte","Novo Mundo","Novo Santo Antônio",
  "Novo São Joaquim","Paranaíta","Paranatinga","Pedra Preta","Peixoto de Azevedo",
  "Planalto da Serra","Poconé","Pontal do Araguaia","Ponte Branca","Pontes e Lacerda",
  "Porto Alegre do Norte","Porto dos Gaúchos","Porto Esperidião","Porto Estrela","Poxoréu",
  "Primavera do Leste","Querência","Reserva do Cabaçal","Ribeirão Cascalheira","Ribeirãozinho",
  "Rio Branco","Rondolândia","Rondonópolis","Rosário Oeste","Salto do Céu","Santa Carmem",
  "Santa Cruz do Xingu","Santa Rita do Trivelato","Santa Terezinha","Santo Afonso",
  "Santo Antônio do Leste","Santo Antônio do Leverger","São Félix do Araguaia","São José do Povo",
  "São José do Rio Claro","São José do Xingu","São José dos Quatro Marcos","São Pedro da Cipa",
  "Sapezal","Serra Nova Dourada","Sinop","Sorriso","Tabaporã","Tangará da Serra","Tapurah",
  "Terra Nova do Norte","Tesouro","Torixoréu","União do Sul","Vale de São Domingos",
  "Várzea Grande","Vera","Vila Bela da Santíssima Trindade","Vila Rica",
];

const sources = [];

// ---- Federais (feeds RSS conhecidos) -------------------------------------
sources.push({
  id: "agencia-brasil", nome: "Agência Brasil (EBC)", nivel: "federal", poder: "executivo",
  municipio: "Brasil", url: "https://agenciabrasil.ebc.com.br",
  feed: "https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml",
  editoria: "brasil-mundo", verificar: false,
});
sources.push({
  id: "agencia-camara", nome: "Agência Câmara de Notícias", nivel: "federal", poder: "legislativo",
  municipio: "Brasil", url: "https://www.camara.leg.br",
  feed: "https://www.camara.leg.br/noticias/rss/todas", editoria: "politica", verificar: false,
});
sources.push({
  id: "agencia-senado", nome: "Agência Senado", nivel: "federal", poder: "legislativo",
  municipio: "Brasil", url: "https://www12.senado.leg.br/noticias",
  feed: "https://www12.senado.leg.br/noticias/feed", editoria: "politica", verificar: false,
});
sources.push({
  id: "gov-br-secom", nome: "gov.br — Notícias (Secretaria de Comunicação/PR)", nivel: "federal",
  poder: "executivo", municipio: "Brasil",
  url: "https://www.gov.br/secom/pt-br/assuntos/noticias", editoria: "brasil-mundo", verificar: true,
});

// ---- Estaduais (grafia/domínio conhecidos) -------------------------------
sources.push({
  id: "secom-mt", nome: "SECOM-MT (Governo de Mato Grosso)", nivel: "estadual",
  poder: "executivo", municipio: "Mato Grosso", url: "https://www.secom.mt.gov.br",
  editoria: "politica", verificar: false,
});
sources.push({
  id: "almt", nome: "Assembleia Legislativa de MT (ALMT)", nivel: "estadual",
  poder: "legislativo", municipio: "Mato Grosso", url: "https://www.al.mt.gov.br",
  editoria: "politica", verificar: false,
});
sources.push({
  id: "amm", nome: "AMM (Associação Mato-grossense dos Municípios)", nivel: "estadual",
  poder: "associativo", municipio: "Mato Grosso", url: "https://www.amm.org.br/Noticias",
  editoria: "cidades", verificar: true,
});

// ---- Prefeituras e Câmaras (padrão de domínio — VERIFICAR) ----------------
for (const m of MUNICIPIOS) {
  const s = slug(m);
  sources.push({
    id: `pref-${s}`, nome: `Prefeitura de ${m}`, nivel: "municipal", poder: "executivo",
    municipio: m, url: `https://www.${s}.mt.gov.br`, editoria: "cidades", verificar: true,
  });
  sources.push({
    id: `cam-${s}`, nome: `Câmara de ${m}`, nivel: "municipal", poder: "legislativo",
    municipio: m, url: `https://www.${s}.mt.leg.br`, editoria: "politica", verificar: true,
  });
}

const out = {
  _comment: "Assessorias oficiais de MT. 'editoria' roteia a publicação (politica=O Dia Político). 'feed' (opcional) força a URL do RSS. 'verificar':true = domínio derivado por padrão, confirme antes de produção. Edite à vontade.",
  gerado_em: new Date().toISOString(),
  total: sources.length,
  sources,
};
writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`OK: ${outPath} — fontes=${sources.length} (federais=4, estaduais/AMM=3, prefeituras=${MUNICIPIOS.length}, câmaras=${MUNICIPIOS.length})`);
