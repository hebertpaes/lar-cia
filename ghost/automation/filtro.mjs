#!/usr/bin/env node
/* FILTRO DE QUALIDADE editorial — usado pela coleta e pela publicação.
   Descarta o que NÃO é notícia de interesse público:
     1) Atos administrativos / diário oficial (decreto, portaria, edital,
        licitação, nomeação, extrato de contrato, resolução, errata…).
     2) Matérias curtas demais (menos que o mínimo de palavras).

   Objetivo: portal não vira mural de prefeitura. Só entra o que tem audiência.

   API:
     avaliar({ title, corpo, resumo }, { min = 100 }) → { ok, motivo, palavras }
     ehAdministrativo(title, corpo) → boolean
     contaPalavras(textoOuHtml) → number

   CLI (para conferir um arquivo já coletado):
     node ghost/automation/filtro.mjs ghost/import/coletado-AAAA-MM-DD.json [--min=100]
*/

const MIN_PADRAO = parseInt(process.env.FILTRO_MIN_PALAVRAS || "100", 10);

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
  ].join("|") + ")",
);

// Título que começa por um ato ("Decreto…", "Portaria…", "Edital…").
const TITULO_ATO = /^(decreto|portaria|resolucao|instrucao normativa|edital|edit)\b/;
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

export function avaliar(item, opts = {}) {
  const min = opts.min == null ? MIN_PADRAO : opts.min;
  const title = item.title || "";
  const corpo = item.corpo || item.html || "";
  const resumo = item.resumo || item.summary || "";
  if (ehAdministrativo(title, corpo)) return { ok: false, motivo: "administrativo", palavras: contaPalavras(corpo) };
  const palavras = contaPalavras(corpo) || contaPalavras(resumo);
  if (palavras < min) return { ok: false, motivo: `curta (${palavras}p<${min})`, palavras };
  return { ok: true, motivo: "ok", palavras };
}

export const MIN_PALAVRAS = MIN_PADRAO;

// ---------- CLI: confere um arquivo coletado -------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const { readFileSync } = await import("node:fs");
  const { resolve } = await import("node:path");
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  const minArg = args.find((a) => a.startsWith("--min="));
  const min = minArg ? parseInt(minArg.split("=")[1], 10) : MIN_PADRAO;
  if (!file) { console.error("Uso: node filtro.mjs <arquivo.json> [--min=100]"); process.exit(1); }
  const j = JSON.parse(readFileSync(resolve(process.cwd(), file), "utf8"));
  const posts = j?.db?.[0]?.data?.posts || [];
  const htmlDe = (p) => { if (p.html) return p.html; try { return JSON.parse(p.mobiledoc).cards[0][1].html; } catch { return ""; } };
  let keep = 0, drop = 0;
  for (const p of posts) {
    const v = avaliar({ title: p.title, corpo: htmlDe(p) }, { min });
    if (v.ok) { keep++; console.log(`  ✓ (${v.palavras}p) ${p.title}`); }
    else { drop++; console.log(`  ⊘ ${v.motivo}: ${p.title}`); }
  }
  console.log(`\nManteria ${keep} · descartaria ${drop} (mínimo ${min} palavras).`);
}
