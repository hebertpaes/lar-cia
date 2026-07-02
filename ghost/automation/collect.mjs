#!/usr/bin/env node
/* COLETOR multi-fonte das assessorias oficiais de MT.
   Lê sources.mt.json (SECOM, ALMT, prefeituras e câmaras), busca as notícias do
   DIA de cada fonte (via RSS/Atom) e gera um JSON no formato de import do Ghost,
   com a FONTE na legenda da imagem (logo ABAIXO da foto, via feature_image_caption).

   ⚠️ Rode na SUA máquina/servidor (que alcança .gov.br/.leg.br). Este ambiente de
   desenvolvimento NÃO acessa esses domínios.

   Uso:
     node ghost/automation/collect.mjs [--date=YYYY-MM-DD] [--out=arq.json]
            [--only=<id|municipio>] [--max=4] [--conc=6] [--all-dates] [--verbose]
   Depois publique nos portais:
     node ghost/automation/publish.mjs <arq.json>

   Sem dependências externas (Node 18+: usa fetch global).
   O parser de RSS fica exportado para teste offline (test-collect.mjs). */

import { writeFileSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------- utilidades ----------------------------------------------------
export const slugify = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const decode = (s) => String(s == null ? "" : s)
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
  .replace(/&#0?39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/&amp;/g, "&");
const stripTags = (s) => decode(String(s == null ? "" : s)).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const pick = (xml, tag) => { const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i")); return m ? m[1] : ""; };
const attr = (frag, tag, at) => { const m = frag.match(new RegExp(`<${tag}\\b[^>]*\\b${at}\\s*=\\s*["']([^"']+)["'][^>]*>`, "i")); return m ? m[1] : ""; };

// ---------- parser RSS/Atom (exportado p/ teste) --------------------------
export function parseFeed(xml) {
  const items = [];
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) || [];
  for (const b of blocks) {
    const isAtom = /^<entry/i.test(b);
    const title = stripTags(pick(b, "title"));
    if (!title) continue;
    let link = "";
    if (isAtom) {
      link = attr(b, "link", "href") || "";
    } else {
      link = stripTags(pick(b, "link")) || attr(b, "link", "href") || pick(b, "guid").replace(/<[^>]+>/g, "").trim();
    }
    const dateRaw = pick(b, "pubDate") || pick(b, "published") || pick(b, "updated") || pick(b, "dc:date") || pick(b, "date");
    const descRaw = pick(b, "content:encoded") || pick(b, "description") || pick(b, "summary") || pick(b, "content");
    // imagem: enclosure, media:content, media:thumbnail, ou 1ª <img> da descrição
    let image = attr(b, "enclosure", "url") || attr(b, "media:content", "url") || attr(b, "media:thumbnail", "url") || "";
    if (!image) { const im = decode(descRaw).match(/<img[^>]+src=["']([^"']+)["']/i); if (im) image = im[1]; }
    const date = dateRaw ? new Date(decode(dateRaw.trim())) : null;
    items.push({
      title, link: decode(link).trim(),
      date: date && !isNaN(date) ? date : null,
      summary: stripTags(descRaw).slice(0, 400),
      html: decode(descRaw).trim(),
      image: image ? decode(image).trim() : null,
    });
  }
  return items;
}

// ---------- rede ----------------------------------------------------------
const FEED_PATHS = ["/feed", "/rss", "/feed.xml", "/rss.xml",
  "/noticias/feed", "/?format=feed&type=rss"];

// Retorna: o texto; null (host respondeu, mas esse caminho não serve — 404 etc.);
// undefined (erro de rede/timeout: host provavelmente fora do ar).
async function fetchText(url, ms = 7000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { redirect: "follow", signal: ctl.signal, headers: { "User-Agent": "LarCiaBot/1.0 (+coletor de releases oficiais)" } });
    if (!r.ok) return null;
    return await r.text();
  } catch { return undefined; } finally { clearTimeout(t); }
}

async function feedFor(src) {
  const tries = src.feed ? [src.feed] : FEED_PATHS.map((p) => src.url.replace(/\/$/, "") + p);
  for (const u of tries) {
    const xml = await fetchText(u);
    if (xml === undefined) break;   // host fora do ar/timeout: não adianta tentar outros caminhos
    if (xml && /<(item|entry)\b/i.test(xml)) return { url: u, items: parseFeed(xml) };
  }
  return null;
}

// ---------- montagem do import do Ghost -----------------------------------
export function makeBuilder() {
  const tags = []; const tagId = new Map();
  const tag = (name, slug, visibility) => {
    if (tagId.has(slug)) return tagId.get(slug);
    const id = tags.length + 1; tags.push({ id, name, slug, visibility, description: null }); tagId.set(slug, id); return id;
  };
  const posts = []; const posts_tags = []; let pid = 0; const seen = new Set();
  function add({ title, slug, html, excerpt, image, fonteNome, fonteUrl, when, tagIds }) {
    if (seen.has(slug)) return false; seen.add(slug);
    const id = ++pid; const at = new Date(when || Date.now()).toISOString().replace(/\.\d+Z$/, ".000Z");
    posts.push({
      id, title, slug, type: "post", status: "published", visibility: "public",
      mobiledoc: JSON.stringify({ version: "0.3.1", atoms: [], markups: [], sections: [[10, 0]], cards: [["html", { html }]] }),
      feature_image: image || null,
      feature_image_caption: `Fonte: <a href="${esc(fonteUrl)}" target="_blank" rel="noopener">${esc(fonteNome)}</a>`,
      custom_excerpt: excerpt || null, created_at: at, updated_at: at, published_at: at,
    });
    tagIds.forEach((tid, i) => posts_tags.push({ tag_id: tid, post_id: id, sort_order: i }));
    return true;
  }
  return { tag, add, done: () => ({ db: [{ meta: { exported_on: Date.now(), version: "5.0.0" }, data: { posts, tags, posts_tags } }] }), count: () => posts.length };
}

// ---------- CLI -----------------------------------------------------------
function main() {
  const args = process.argv.slice(2);
  const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split("=").slice(1).join("=") : d; };
  const has = (k) => args.includes(`--${k}`);
  const date = opt("date", new Date().toISOString().slice(0, 10));
  const only = opt("only", null);
  const maxPer = parseInt(opt("max", "4"), 10);
  const conc = parseInt(opt("conc", "6"), 10);
  const allDates = has("all-dates");
  const verbose = has("verbose");
  const outPath = resolve(__dirname, opt("out", `../import/coletado-${date}.json`));

  const reg = JSON.parse(readFileSync(resolve(__dirname, "sources.mt.json"), "utf8"));
  let sources = reg.sources;
  if (only) sources = sources.filter((s) => s.id === only || slugify(s.municipio) === slugify(only));

  const B = makeBuilder();
  const T_COL = B.tag("#coletado", "hash-coletado", "internal");
  const cap = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);
  let ok = 0, vazio = 0, falhou = 0, materias = 0;

  async function worker(queue) {
    for (let s; (s = queue.shift()); ) {
      const res = await feedFor(s).catch(() => null);
      if (!res) { falhou++; if (verbose) console.log(`  ✗ ${s.id} (sem RSS) ${s.url}`); continue; }
      const doDay = res.items.filter((it) => allDates || (it.date && it.date.toISOString().slice(0, 10) === date));
      if (!doDay.length) { vazio++; if (verbose) console.log(`  · ${s.id}: 0 do dia (${res.items.length} no feed)`); continue; }
      ok++;
      const tEd = B.tag(cap(s.editoria), s.editoria, "public");
      const tMun = B.tag(s.municipio, slugify(s.municipio), "public");
      const tFonte = B.tag(`#${s.id}`, `hash-${s.id}`, "internal");
      for (const it of doDay.slice(0, maxPer)) {
        const body = it.html && /<\w+/.test(it.html) ? it.html : `<p>${esc(it.summary || it.title)}</p>`;
        const added = B.add({
          title: it.title, slug: `${slugify(it.title).slice(0, 70)}-${slugify(s.municipio)}`,
          html: body, excerpt: it.summary || null, image: it.image,
          fonteNome: s.nome, fonteUrl: it.link || s.url, when: it.date || Date.now(),
          tagIds: [tEd, tMun, T_COL, tFonte],
        });
        if (added) materias++;
      }
    }
  }

  const queue = sources.slice();
  console.log(`Coletando ${sources.length} fontes — dia ${allDates ? "(todas as datas)" : date} …`);
  Promise.all(Array.from({ length: Math.min(conc, queue.length) }, () => worker(queue))).then(() => {
    writeFileSync(outPath, JSON.stringify(B.done(), null, 2) + "\n", "utf8");
    console.log(`\nResumo: fontes com matéria=${ok} vazias=${vazio} sem-feed=${falhou} | matérias=${materias}`);
    console.log(`Arquivo: ${outPath}`);
    if (!materias) console.log("Nenhuma matéria. Confirme as URLs/feeds das fontes (verificar:true) ou rode com --all-dates --verbose.");
  });
}

if (import.meta.url === `file://${process.argv[1]}`) main();
