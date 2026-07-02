#!/usr/bin/env node
/* COLETOR dedicado da SECOM-MT (https://www.secom.mt.gov.br/noticias).
   O portal é Liferay e não tem RSS confiável, então lemos o HTML: pegamos os
   links de matéria na página de notícias e, em cada matéria, extraímos título,
   FOTO real (og:image), data e texto — via Open Graph / JSON-LD (padrão que o
   site expõe). Gera um JSON no formato de import do Ghost, com a FONTE logo
   ABAIXO da imagem (feature_image_caption) — igual ao collect.mjs.

   ⚠️ Rode onde a internet é ABERTA: no runner do GitHub Actions (nuvem) ou na
   sua máquina. Este ambiente de desenvolvimento NÃO acessa .gov.br.

   Uso:
     node ghost/automation/secom.mjs [--out=arq.json] [--max=12] [--all-dates]
                                     [--date=YYYY-MM-DD] [--verbose]
     node ghost/automation/publish.mjs <arq.json>

   Sem dependências externas (Node 18+). As funções de extração são exportadas
   para teste offline. */

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { slugify, makeBuilder } from "./collect.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const BASE = "https://www.secom.mt.gov.br";
const LIST = BASE + "/noticias";
const FONTE_NOME = "SECOM-MT (Governo de Mato Grosso)";

// ---------- extração (exportada p/ teste) ---------------------------------
const decodeEntities = (s) => String(s == null ? "" : s)
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
  .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&");
const stripTags = (s) => decodeEntities(String(s == null ? "" : s).replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

// pega <meta property|name="X" content="Y"> (em qualquer ordem dos atributos)
export function meta(html, key) {
  const re = new RegExp(`<meta[^>]+(?:property|name)\\s*=\\s*["']${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`, "i");
  const tag = (html.match(re) || [])[0];
  if (!tag) return "";
  const m = tag.match(/content\s*=\s*["']([\s\S]*?)["']/i);
  return m ? decodeEntities(m[1]).trim() : "";
}

// tenta achar um Article no JSON-LD
export function jsonLd(html) {
  const blocks = html.match(/<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const b of blocks) {
    const raw = b.replace(/^[\s\S]*?>/, "").replace(/<\/script>$/i, "").trim();
    let data; try { data = JSON.parse(raw); } catch { continue; }
    const arr = Array.isArray(data) ? data : (data["@graph"] ? data["@graph"] : [data]);
    for (const o of arr) {
      const t = o && o["@type"];
      const isArt = t && (t === "NewsArticle" || t === "Article" || (Array.isArray(t) && t.some((x) => /Article/.test(x))));
      if (isArt) return o;
    }
  }
  return null;
}

// extrai os campos de uma página de matéria
export function parseArticle(html, url) {
  const ld = jsonLd(html) || {};
  const title = meta(html, "og:title") || stripTags((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "") || stripTags((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
  let image = meta(html, "og:image") || (typeof ld.image === "string" ? ld.image : (ld.image && (ld.image.url || (Array.isArray(ld.image) && ld.image[0]))) || "");
  if (image && image.startsWith("/")) image = BASE + image;
  const dateRaw = meta(html, "article:published_time") || ld.datePublished || meta(html, "og:updated_time") || ld.dateModified || "";
  const date = dateRaw ? new Date(dateRaw) : null;
  // corpo (na ordem): JSON-LD articleBody → parágrafos do HTML → og:description
  const escP = (p) => p.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  let bodyText = (typeof ld.articleBody === "string" && ld.articleBody) || "";
  let html_body = "";
  if (bodyText) {
    html_body = bodyText.split(/\n{2,}|\r\n\r\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${escP(p)}</p>`).join("\n");
  } else {
    // extrai <p> do corpo (fora de nav/rodapé), textos com algum tamanho
    const paras = (html.match(/<p\b[^>]*>([\s\S]*?)<\/p>/gi) || [])
      .map((p) => stripTags(p))
      .filter((t) => t.length >= 40 && !/^(início|home|compartilhe|voltar|leia (também|mais)|publicado em|foto:)/i.test(t))
      .slice(0, 15);
    if (paras.length >= 2) html_body = paras.map((p) => `<p>${escP(p)}</p>`).join("\n");
    else {
      const desc = meta(html, "og:description") || meta(html, "description") || "";
      html_body = desc ? `<p>${escP(desc)}</p>` : "";
    }
  }
  const excerpt = (meta(html, "og:description") || meta(html, "description") || bodyText).slice(0, 300) || null;
  return {
    title: title || null,
    image: image || null,
    date: date && !isNaN(date) ? date : null,
    html: html_body || `<p>${(title || "").replace(/</g, "&lt;")}</p>`,
    excerpt, url,
  };
}

// acha os links de matéria na página de listagem
export function articleLinks(html, base = BASE) {
  const out = new Set();
  const hrefs = html.match(/href\s*=\s*["']([^"']+)["']/gi) || [];
  for (const h of hrefs) {
    let u = (h.match(/["']([^"']+)["']/) || [])[1] || "";
    if (!u) continue;
    if (u.startsWith("//")) u = "https:" + u;
    else if (u.startsWith("/")) u = base + u;
    if (!u.startsWith(base)) continue;                    // só o próprio domínio
    if (!/\/noticias\/|\/-\//.test(u)) continue;          // padrão de conteúdo/matéria
    if (/\.(css|js|png|jpe?g|gif|svg|ico|pdf)(\?|$)/i.test(u)) continue;
    if (/[?&]p_p_|paginador|pagination|#/.test(u)) continue; // paginação/âncoras
    if (u.replace(/\/$/, "") === LIST) continue;          // a própria listagem
    out.add(u.split("#")[0]);
  }
  return [...out];
}

// ---------- rede ----------------------------------------------------------
async function fetchText(url, ms = 15000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { redirect: "follow", signal: ctl.signal, headers: { "User-Agent": "LarCiaBot/1.0 (+coletor de releases oficiais)", "Accept": "text/html" } });
    if (!r.ok) return null;
    return await r.text();
  } catch { return null; } finally { clearTimeout(t); }
}

// ---------- CLI -----------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split("=").slice(1).join("=") : d; };
  const has = (k) => args.includes(`--${k}`);
  const date = opt("date", new Date().toISOString().slice(0, 10));
  const max = parseInt(opt("max", "12"), 10);
  const allDates = has("all-dates");
  const verbose = has("verbose");
  const outPath = resolve(__dirname, opt("out", `../import/secom-${date}.json`));

  console.log(`SECOM-MT: lendo ${LIST} …`);
  const list = await fetchText(LIST);
  if (!list) { console.error("Não consegui abrir a página de notícias (rede/bloqueio?). Rode onde a internet é aberta."); process.exit(2); }

  const links = articleLinks(list).slice(0, max * 2);
  if (verbose) console.log(`  ${links.length} links candidatos`);
  if (!links.length) { console.error("Nenhum link de matéria encontrado — o HTML da listagem mudou. Me mande um trecho para ajustar."); process.exit(3); }

  const B = makeBuilder();
  const T_COL = B.tag("#coletado", "hash-coletado", "internal");
  const T_SEC = B.tag("#secom-mt", "hash-secom-mt", "internal");
  const T_POL = B.tag("Política", "politica", "public");
  const T_GOV = B.tag("Governo de MT", "governo-mt", "public");

  let n = 0;
  for (const url of links) {
    if (n >= max) break;
    const page = await fetchText(url);
    if (!page) { if (verbose) console.log(`  ✗ ${url}`); continue; }
    const a = parseArticle(page, url);
    if (!a.title) { if (verbose) console.log(`  · sem título: ${url}`); continue; }
    if (!allDates && a.date && a.date.toISOString().slice(0, 10) !== date) { if (verbose) console.log(`  · fora do dia: ${a.title}`); continue; }
    const added = B.add({
      title: a.title, slug: `${slugify(a.title).slice(0, 70)}-secom`,
      html: a.html, excerpt: a.excerpt, image: a.image,
      fonteNome: FONTE_NOME, fonteUrl: a.url, when: a.date || Date.now(),
      tagIds: [T_POL, T_GOV, T_COL, T_SEC],
    });
    if (added) { n++; if (verbose) console.log(`  ✓ ${a.title}${a.image ? " [img]" : ""}`); }
  }

  writeFileSync(outPath, JSON.stringify(B.done(), null, 2) + "\n", "utf8");
  console.log(`\nMatérias: ${n}${allDates ? "" : ` (do dia ${date})`}`);
  console.log(`Arquivo: ${outPath}`);
  if (!n) console.log("0 matérias — rode com --all-dates --verbose para ver o que veio, ou me mande o HTML da listagem.");
}

if (import.meta.url === `file://${process.argv[1]}`) main();
