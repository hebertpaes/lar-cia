#!/usr/bin/env node
/* ENRIQUECE ghost/automation/sources.mt.json com os SITES OFICIAIS das
   prefeituras a partir do diretório da AMM (Associação Mato-grossense dos
   Municípios) — a "Lista de Prefeituras". O gen-sources.mjs cria as 142
   prefeituras/câmaras por PADRÃO de domínio (<slug>.mt.gov.br), todas com
   "verificar": true. Este script visita a AMM, pega o LINK REAL de cada
   prefeitura e grava por cima (com "verificar": false), corrigindo os
   municípios cujo site foge do padrão. Os que a AMM não trouxer continuam
   como estão (derivados).

   IMPORTANTE: o sandbox do Claude NÃO alcança amm.org.br — rode na SUA máquina.

   Uso:
     node ghost/automation/gen-sources-amm.mjs              # aplica em sources.mt.json
     node ghost/automation/gen-sources-amm.mjs --dry-run    # só mostra o que mudaria
     node ghost/automation/gen-sources-amm.mjs --print      # imprime o que a AMM listou (não grava)
     AMM_LISTA_URL="https://www.amm.org.br/Informacoes-Gerais/Lista-Prefeituras/" \
       node ghost/automation/gen-sources-amm.mjs            # sobrescreve a URL base
     AMM_PAGINAS=20 node ...                                # nº máx. de páginas a varrer

   Sem rede/deu erro? Nada é gravado — o sources.mt.json fica intacto. */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcPath = resolve(__dirname, "sources.mt.json");

const args = process.argv.slice(2);
const has = (k) => args.includes(`--${k}`);
const DRY = has("dry-run");
const PRINT = has("print");
const BASE = process.env.AMM_LISTA_URL || "https://www.amm.org.br/Informacoes-Gerais/Lista-Prefeituras/";
const MAX_PAG = Math.max(1, parseInt(process.env.AMM_PAGINAS || "25", 10));
const AMM_HOST = "amm.org.br";

// slug idêntico ao gen-sources.mjs (mesma normalização de acentos/pontuação)
const slug = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "");
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/\s+/g, " ").trim();
const stripTags = (s) => String(s || "").replace(/<(?:[^>"']|"[^"]*"|'[^']*')*>/g, " ").replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();
const hostOf = (u) => { try { return new URL(u).host.replace(/^www\./, ""); } catch { return ""; } };

/* Extrai [{ texto, href }] de todas as âncoras de um HTML, resolvendo hrefs
   relativos contra a página. Parser genérico (só <a href>+texto), então
   independe do layout exato da AMM. */
export function anchors(html, pageUrl) {
  const out = [];
  const re = /<a\b[^>]*\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const raw = m[2] ?? m[3] ?? m[4] ?? "";
    const texto = stripTags(m[5]);
    if (!raw || /^(#|mailto:|tel:|javascript:)/i.test(raw)) continue;
    let href;
    try { href = new URL(raw, pageUrl).toString(); } catch { continue; }
    if (!/^https?:/i.test(href)) continue;
    out.push({ texto, href });
  }
  return out;
}

async function getHtml(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(url, {
      redirect: "follow", signal: ctrl.signal,
      headers: { "user-agent": "Mozilla/5.0 (LarCiaBot; +coleta de fontes MT)", "accept": "text/html" },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } finally { clearTimeout(t); }
}

/* Dado o HTML de uma página, devolve um mapa slug->{municipio,url} das
   prefeituras (âncoras EXTERNAS, fora do domínio da AMM). Função pura/testável:
   o nome do município é o texto da âncora sem o prefixo "Prefeitura (Municipal) de". */
export function parsePrefeituras(html, pageUrl) {
  const map = new Map();
  for (const a of anchors(html, pageUrl)) {
    const h = hostOf(a.href);
    if (!h || h === AMM_HOST || h.endsWith(`.${AMM_HOST}`)) continue;  // ignora links internos da AMM
    if (!/\.gov\.br$/.test(h)) continue;  // site oficial de prefeitura é .gov.br (descarta redes sociais etc.)
    const nome = a.texto.replace(/^\s*prefeitura\s+(municipal\s+)?(de|do|da|dos|das)?\s*/i, "").trim();
    const key = slug(nome);
    if (!key || key.length < 3) continue;
    if (!map.has(key)) map.set(key, { municipio: nome, url: a.href.replace(/\/$/, "") });
  }
  return map;
}

/* Percorre a Lista de Prefeituras (paginada: BASE, BASE/2/, BASE/3/…) e devolve
   um mapa slug->url do SITE OFICIAL (âncora externa, fora do domínio da AMM). */
async function coletarAMM() {
  const found = new Map();   // slug -> { municipio, url }
  let vazias = 0;
  for (let p = 1; p <= MAX_PAG; p++) {
    const url = p === 1 ? BASE : `${BASE.replace(/\/$/, "")}/${p}/`;
    let html;
    try { html = await getHtml(url); }
    catch (e) { if (p === 1) throw e; break; }   // 1ª página é obrigatória
    let novos = 0;
    for (const [key, v] of parsePrefeituras(html, url)) {
      if (!found.has(key)) { found.set(key, v); novos++; }
    }
    if (novos === 0) { if (++vazias >= 2) break; } else vazias = 0;
  }
  return found;
}

async function main() {
  const db = JSON.parse(readFileSync(srcPath, "utf8"));
  const sources = db.sources || [];
  // índice slug->entrada da prefeitura (só executivo municipal)
  const prefIndex = new Map();
  for (const s of sources) {
    if (s.nivel === "municipal" && s.poder === "executivo") prefIndex.set(slug(s.municipio), s);
  }

  let amm;
  try { amm = await coletarAMM(); }
  catch (e) {
    console.error(`Falhou ao ler a AMM (${BASE}): ${e.message}`);
    console.error("Rode na sua máquina (o sandbox não alcança amm.org.br). Nada foi gravado.");
    process.exit(1);
  }
  console.log(`AMM: ${amm.size} prefeituras com link oficial encontradas.`);

  if (PRINT) {
    for (const [k, v] of [...amm].sort()) console.log(`  ${v.municipio.padEnd(34)} ${v.url}`);
    return;
  }

  let casados = 0, novos = 0, iguais = 0;
  const semMatch = [];
  for (const [key, v] of amm) {
    const pref = prefIndex.get(key);
    if (!pref) { semMatch.push(v.municipio); continue; }
    if (pref.url === v.url && pref.verificar === false) { iguais++; continue; }
    if (!DRY) { pref.url = v.url; pref.verificar = false; pref.fonte_url = "amm.org.br"; }
    if (pref.verificar === false) novos++; else casados++;
  }

  console.log(`Prefeituras atualizadas (url oficial da AMM, verificar:false): ${casados + novos}`);
  if (iguais) console.log(`Já estavam iguais: ${iguais}`);
  if (semMatch.length) console.log(`Na AMM mas fora da lista local (confira grafia): ${semMatch.join(", ")}`);

  if (DRY) { console.log("--dry-run: nada gravado."); return; }
  db.gerado_em = new Date().toISOString();
  db.total = sources.length;
  writeFileSync(srcPath, JSON.stringify(db, null, 2) + "\n", "utf8");
  console.log(`OK: ${srcPath} atualizado (${sources.length} fontes).`);
}

// Só executa quando chamado direto (permite importar as funções puras em testes).
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch((e) => { console.error("Falhou:", e.message); process.exit(1); });
