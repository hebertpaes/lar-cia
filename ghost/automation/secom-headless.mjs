#!/usr/bin/env node
/* COLETOR HEADLESS (Playwright) para portais do mt.gov.br cuja LISTAGEM é montada
   por JavaScript (um fetch simples vê 0 links — caso da SECOM). Abre a página num
   Chromium, deixa o JS renderizar e extrai os links /w/<slug> DIRETO do DOM
   (via $$eval — tolerante à SPA que fica navegando). Cada matéria é buscada por
   fetch (o <head> com og:title/og:image costuma ser SSR) e passada pelo parser
   do secom.mjs.

   Requer o pacote `playwright` e o Chromium (no GitHub Actions: `npm i playwright`
   + `npx playwright install chromium`). Localmente aponte CHROMIUM_PATH.

   Uso (igual ao secom.mjs, com --base/--list/--fonte/--editoria/--id):
     node ghost/automation/secom-headless.mjs --verbose --out=ghost/import/secom-hoje.json */

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { articleLinks, parseArticle } from "./secom.mjs";
import { slugify, makeBuilder } from "./collect.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// fetch simples p/ as páginas de matéria (og: costuma vir no HTML/SSR)
async function get(url, ms = 15000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(url, { redirect: "follow", signal: c.signal, headers: { "User-Agent": "Mozilla/5.0 (compatible; LarCiaBot/1.0)", "Accept": "text/html" } }); return r.ok ? await r.text() : null; }
  catch { return null; } finally { clearTimeout(t); }
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split("=").slice(1).join("=") : d; };
  const has = (k) => args.includes(`--${k}`);
  const base = opt("base", "https://www.secom.mt.gov.br").replace(/\/$/, "");
  const listUrl = opt("list", base + "/noticias");
  const fonte = opt("fonte", "SECOM-MT (Governo de Mato Grosso)");
  const editoria = slugify(opt("editoria", "politica"));
  const id = slugify(opt("id", (base.match(/https?:\/\/(?:www\d*\.)?([^./]+)/) || [])[1] || "fonte"));
  const date = opt("date", new Date().toISOString().slice(0, 10));
  const allDates = has("all-dates"), verbose = has("verbose");
  const max = parseInt(opt("max", "12"), 10);
  const outArg = opt("out", null);
  const outPath = outArg ? resolve(process.cwd(), outArg) : resolve(__dirname, `../import/${id}-${date}.json`);
  const execPath = process.env.CHROMIUM_PATH || undefined;

  console.log(`[headless] abrindo ${listUrl} …`);
  const browser = await chromium.launch({ executablePath: execPath, args: ["--no-sandbox", "--disable-dev-shm-usage"] });

  // ---- 1) links da listagem (extraídos do DOM, tolerante à SPA) ----
  let hrefs = [];
  try {
    const page = await browser.newPage({ userAgent: "Mozilla/5.0 (compatible; LarCiaBot/1.0; +coletor de releases oficiais)" });
    await page.goto(listUrl, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
    await page.waitForSelector('a[href*="/w/"]', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    for (let tentativa = 0; tentativa < 3 && !hrefs.length; tentativa++) {
      try { hrefs = await page.$$eval('a[href*="/w/"]', (els) => Array.from(new Set(els.map((e) => e.getAttribute("href")).filter(Boolean)))); }
      catch { await page.waitForTimeout(1000); }
    }
    await page.close();
  } catch (e) { if (verbose) console.log("  aviso listagem:", e.message); }
  await browser.close();

  // reusa o filtro testado do secom.mjs (host, /w/, sem pdf/paginação/listagem)
  const fakeHtml = hrefs.map((h) => `<a href="${h}"></a>`).join("");
  const links = articleLinks(fakeHtml, base, listUrl).slice(0, max * 2);
  if (verbose) console.log(`  ${links.length} links candidatos (de ${hrefs.length} no DOM)`);
  if (!links.length) { console.error("0 links mesmo com headless — o seletor da lista mudou ou a página não expôs <a href=/w/>."); process.exit(3); }

  // ---- 2) cada matéria por fetch (og: é SSR) ----
  const B = makeBuilder();
  const T_COL = B.tag("#coletado", "hash-coletado", "internal");
  const T_FONTE = B.tag(`#${id}`, `hash-${id}`, "internal");
  const T_ED = B.tag(editoria.charAt(0).toUpperCase() + editoria.slice(1), editoria, "public");

  let posts = 0;
  for (const url of links) {
    if (posts >= max) break;
    const pg = await get(url);
    if (!pg) { if (verbose) console.log("  ✗ (fetch falhou)", url); continue; }
    const a = parseArticle(pg, url, base);
    if (!a.title) { if (verbose) console.log("  · sem título:", url); continue; }
    if (!allDates && a.date && a.date.toISOString().slice(0, 10) !== date) { if (verbose) console.log("  · fora do dia:", a.title); continue; }
    const ok = B.add({
      title: a.title, slug: `${slugify(a.title).slice(0, 70)}-${id}`,
      html: a.html, excerpt: a.excerpt, image: a.image,
      fonteNome: fonte, fonteUrl: a.url, when: a.date || Date.now(),
      tagIds: [T_ED, T_COL, T_FONTE],
    });
    if (ok) { posts++; if (verbose) console.log(`  ✓ ${a.title}${a.image ? " [img]" : ""}`); }
  }
  writeFileSync(outPath, JSON.stringify(B.done(), null, 2) + "\n", "utf8");
  console.log(`\n[headless] matérias: ${posts}${allDates ? "" : ` (do dia ${date})`}`);
  console.log(`Arquivo: ${outPath}`);
}

main().catch((e) => { console.error("Falhou:", e.message); process.exit(1); });
