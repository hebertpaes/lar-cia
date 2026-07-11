#!/usr/bin/env node
/* FILTRO DE QUALIDADE editorial — usado pela coleta e pela publicação.
   Descarta o que NÃO é notícia de interesse público:
     1) Atos administrativos / diário oficial (decreto, portaria, edital,
        licitação, nomeação, extrato de contrato, resolução, errata…).
     2) Matérias curtas demais (menos que o mínimo de palavras).
     3) BAIXA RELEVÂNCIA: só passa o que tem cara de notícia forte — fato
        importante e URGENTE, de APURAÇÃO/INVESTIGAÇÃO e com alta chance de
        engajamento. Pontua sinais de apuração (operação, MP, polícia, prisão,
        fraude, CPI, TCE, corrupção…), urgência/impacto (obra, saúde, greve,
        enchente, concurso, reajuste…), autoridade citada e valores em R$; e
        penaliza pauta cerimonial/institucional (solenidade, homenagem, posse,
        visita, palestra, agenda…). Abaixo do score mínimo, descarta.

   Objetivo: portal não vira mural de prefeitura. Só entra o que tem audiência.

   Ajustes por ambiente:
     FILTRO_MIN_PALAVRAS (padrão 100)
     FILTRO_MIN_SCORE     (padrão 2) — corte de relevância
     FILTRO_RELEVANCIA=0  desliga a camada de relevância (mantém 1 e 2)

   API:
     avaliar({ title, corpo, resumo }, { min, minScore }) → { ok, motivo, palavras, score }
     ehAdministrativo(title, corpo) → boolean
     pontuarRelevancia({ title, corpo, resumo }) → number
     contaPalavras(textoOuHtml) → number

   CLI (para conferir um arquivo já coletado):
     node ghost/automation/filtro.mjs ghost/import/coletado-AAAA-MM-DD.json [--min=100] [--score=2]
*/

const MIN_PADRAO = parseInt(process.env.FILTRO_MIN_PALAVRAS || "100", 10);
const MIN_SCORE_PADRAO = parseInt(process.env.FILTRO_MIN_SCORE || "2", 10);
const RELEVANCIA_ON = process.env.FILTRO_RELEVANCIA !== "0";

// Texto puro, sem tags, sem acento e minúsculo — simplifica os padrões.
const semTags = (s) => String(s == null ? "" : s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const normal = (s) => semTags(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export const contaPalavras = (s) => {
  const t = semTags(s);
  if (!t) return 0;
  return t.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
};

// Termos de ato administrativo/diário oficial (texto já sem acento).
// Boundary só no INÍCIO + \w* no fim, p/ casar sufixos (licitac→licitacao/oes).
const ADMIN = new RegExp(
  "\\b(" + [
    "decretos?", "portarias?", "instrucao normativa",
    "editais?", "edital", "aviso de licitac\\w*", "licitac\\w*", "pregao",
    "tomada de preco\\w*", "concorrencia publica", "dispensa de licitac\\w*",
    "inexigibilidade", "chamamento publico", "credenciamento",
    "extrato de (?:contrato|convenio|ata|termo|aditivo|acordo)",
    "homologac\\w*", "adjudicac\\w*", "nomeac\\w*", "exonerac\\w*", "designac\\w* de servidor",
    "ata de registro de preco\\w*", "diario oficial", "errata", "retificac\\w*",
    "resolucao n\\w*", "balancete", "prestacao de contas",
    // compras / contratações públicas (diário oficial, não é notícia da SECOM):
    "contratac\\w* direta", "aviso de contratac\\w*", "aviso de dispensa",
    "chamada publica", "cotac\\w* de preco\\w*",
    "termo de referencia", "processo administrativo", "dispensa n\\w*",
    "ratificac\\w*", "extrato de", "aviso de pregao", "aviso de chamada",
  ].join("|") + ")",
);

// Título que começa por um ato ("Decreto…", "Aviso de…", "Extrato de…").
const TITULO_ATO = /^(decreto|portaria|resolucao|instrucao normativa|edital|aviso de|extrato de)\b/;
// Título "Lei" seguido de número logo em seguida (ato), mas não "Lei que protege…".
const TITULO_LEI = /^lei\b[^0-9]{0,15}\d/;
// Título que é só um número + cidade: "1969/2026 - Santa Terezinha", "2023 - Campos de Julio".
const TITULO_NUM_CIDADE = /^\s*n?[o.]?\s*\d{1,5}([/.\-]\d{1,4})?\s*[-–—]\s*[a-z]/;

export function ehAdministrativo(title, corpo = "") {
  const t = normal(title);
  if (!t) return false;
  if (TITULO_ATO.test(t)) return true;
  if (TITULO_LEI.test(t)) return true;
  if (TITULO_NUM_CIDADE.test(t) && contaPalavras(title) <= 7) return true;
  if (ADMIN.test(t)) return true;               // termo de ato no título
  // Corpo muito curto e recheado de termo de ato ⇒ é publicação oficial, não notícia.
  const c = normal(corpo);
  if (c && contaPalavras(corpo) < 120 && ADMIN.test(c)) return true;
  return false;
}

// ---- Relevância / engajamento --------------------------------------------
// Sinais FORTES de apuração/investigação e de fatos urgentes (alta audiência).
const ALTA = new RegExp("\\b(" + [
  "investigac\\w*", "apurac\\w*", "operac\\w* (?:policial|do gaeco|da pf|da pc)", "operacao \\w+",
  "denunci\\w*", "fraude\\w*", "desvi(?:o|os)", "improbidade", "ministerio publico", "gaeco",
  "policia(?: civil| militar| federal| penal| rodoviaria)?", "delegad\\w*", "delegacia",
  "prisao", "pres(?:o|a|os|as)", "detid\\w*", "apreens\\w*", "apreend\\w*", "mandado\\w*",
  "busca e apreensao", "indiciad\\w*", "condenad\\w*", "flagrante", "cpi", "auditoria",
  "tribunal de contas", "tce\\w*", "propina", "corrupcao", "lavagem de dinheiro", "peculato",
  "cassad\\w*", "cassacao", "afastad\\w*", "liminar", "inquerito", "esquema", "escandalo",
  "irregularidade\\w*", "superfaturament\\w*", "sonegac\\w*", "quadrilha", "organizacao criminosa",
  "trafic\\w*", "homicidio\\w*", "assassinat\\w*", "feminicidio", "morre", "mort(?:o|a|os|as|e|es)",
  "acidente", "resgate", "sequestr\\w*", "estupro", "chacina", "exclusiv\\w*", "vazament\\w*",
  "delacao", "foragid\\w*", "emboscada", "atentado",
  // emergências/desastres — fato urgente, alta audiência:
  "temporal", "enchente\\w*", "incendi\\w*", "queimada\\w*", "explos\\w*", "tragedia",
  "desaba\\w*", "desabament\\w*", "epidemia", "surto", "dengue",
].join("|") + ")");
// Sinais MÉDIOS de impacto/urgência de serviço público.
const IMPACTO = new RegExp("\\b(" + [
  "urgente", "concurso\\w*", "reajust\\w*", "greve", "obra\\w*", "hospital\\w*", "posto de saude",
  "saneamento", "seguranca publica", "aprovad\\w*", "sancionad\\w*", "veta(?:d\\w*|)", "imposto\\w*",
  "tarifa\\w*", "energia", "desabastec\\w*", "enchente\\w*", "seca", "incendi\\w*", "queimada\\w*",
  "temporal", "tragedia", "explos\\w*", "desaba\\w*", "interdi\\w*", "epidemia", "surto", "dengue",
  "protesto\\w*", "manifestac\\w*", "desemprego", "safra", "produtor(?:es)? rural",
].join("|") + ")");
// Autoridade citada (peso de relevância política/econômica).
const AUTORIDADE = new RegExp("\\b(" + [
  "prefeit(?:o|a)\\w*", "vice-?prefeit\\w*", "vereador\\w*", "governador\\w*", "vice-?governador",
  "deputad\\w*", "senador\\w*", "secretari(?:o|a)\\w*", "ministr(?:o|a)\\w*",
  "presidente da (?:camara|assembleia|republica)", "juiz\\w*", "desembargador\\w*", "promotor\\w*",
].join("|") + ")");
// Valor em dinheiro (R$, milhões, bilhões) — fato concreto.
const DINHEIRO = /\br\$\s?\d|\b\d[\d.,]*\s?(?:mil|milh|bilh)/;
// Pauta cerimonial/institucional (baixo engajamento).
const CERIMONIAL = new RegExp("\\b(" + [
  "participa\\w*", "prestigi\\w*", "reuni(?:ao|oes)", "palestra\\w*", "capacitac\\w*", "solenidade\\w*",
  "homenage\\w*", "posse d\\w*", "visita\\w*", "recepcion\\w*", "entrega de", "assina\\w* convenio",
  "assinatura de convenio", "seminario\\w*", "workshop", "confraternizac\\w*", "aniversario\\w*",
  "comemorac\\w*", "festival\\w*", "mutirao\\w*", "acao social", "agenda d\\w*", "audiencia publica",
  "sessao (?:ordinaria|solene)", "nota de pesar", "nota de esclarecimento", "cartilha",
  "campanha de (?:vacinac|conscientizac|prevenc)\\w*", "coletiva de imprensa",
].join("|") + ")");

const conta = (re, s) => { const m = s.match(new RegExp(re.source, "g")); return m ? m.length : 0; };

/* Score de relevância/engajamento. >0 = tem sinal de notícia forte; <=0 = fraca.
   Título pesa mais que corpo. Cerimonial derruba. */
export function pontuarRelevancia(item) {
  const titleN = normal(item.title || "");
  const corpoN = normal(item.corpo || item.html || "");
  const resumoN = normal(item.resumo || item.summary || "");
  const tudoN = `${titleN} ${resumoN} ${corpoN}`;
  let score = 0;
  if (ALTA.test(titleN)) score += 3;            // apuração/urgência no título
  else if (ALTA.test(tudoN)) score += 2;        // ou no corpo/resumo
  if (IMPACTO.test(tudoN)) score += 1;
  if (AUTORIDADE.test(tudoN)) score += 1;
  if (DINHEIRO.test(tudoN)) score += 1;
  if (CERIMONIAL.test(titleN)) score -= 2;      // pauta de agenda no título
  score -= Math.min(conta(CERIMONIAL, corpoN), 2);
  return score;
}

export function avaliar(item, opts = {}) {
  const min = opts.min == null ? MIN_PADRAO : opts.min;
  const minScore = opts.minScore == null ? MIN_SCORE_PADRAO : opts.minScore;
  const title = item.title || "";
  const corpo = item.corpo || item.html || "";
  const resumo = item.resumo || item.summary || "";
  // Sinal de APURAÇÃO: notícia SOBRE fraude/operação numa licitação NÃO é o
  // ato administrativo em si — não pode cair no filtro de diário oficial.
  const investigativo = ALTA.test(normal(title)) || ALTA.test(normal(corpo));
  if (!investigativo && ehAdministrativo(title, corpo)) {
    return { ok: false, motivo: "administrativo", palavras: contaPalavras(corpo), score: 0 };
  }
  const palavras = contaPalavras(corpo) || contaPalavras(resumo);
  if (palavras < min) return { ok: false, motivo: `curta (${palavras}p<${min})`, palavras, score: 0 };
  const score = pontuarRelevancia({ title, corpo, resumo });
  const relev = opts.relevancia == null ? RELEVANCIA_ON : opts.relevancia;
  if (relev && score < minScore) return { ok: false, motivo: `baixa relevancia (score ${score}<${minScore})`, palavras, score };
  return { ok: true, motivo: "ok", palavras, score };
}

export const MIN_PALAVRAS = MIN_PADRAO;
export const MIN_SCORE = MIN_SCORE_PADRAO;

// ---------- CLI: confere um arquivo coletado -------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const { readFileSync } = await import("node:fs");
  const { resolve } = await import("node:path");
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  const minArg = args.find((a) => a.startsWith("--min="));
  const scoreArg = args.find((a) => a.startsWith("--score="));
  const min = minArg ? parseInt(minArg.split("=")[1], 10) : MIN_PADRAO;
  const minScore = scoreArg ? parseInt(scoreArg.split("=")[1], 10) : MIN_SCORE_PADRAO;
  if (!file) { console.error("Uso: node filtro.mjs <arquivo.json> [--min=100] [--score=2]"); process.exit(1); }
  const j = JSON.parse(readFileSync(resolve(process.cwd(), file), "utf8"));
  const posts = j?.db?.[0]?.data?.posts || [];
  const htmlDe = (p) => { if (p.html) return p.html; try { return JSON.parse(p.mobiledoc).cards[0][1].html; } catch { return ""; } };
  let keep = 0, drop = 0;
  for (const p of posts) {
    const v = avaliar({ title: p.title, corpo: htmlDe(p) }, { min, minScore });
    if (v.ok) { keep++; console.log(`  ✓ (${v.palavras}p · score ${v.score}) ${p.title}`); }
    else { drop++; console.log(`  ⊘ ${v.motivo}: ${p.title}`); }
  }
  console.log(`\nManteria ${keep} · descartaria ${drop} (mínimo ${min} palavras, score ≥ ${minScore}).`);
}
