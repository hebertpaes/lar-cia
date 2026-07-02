#!/usr/bin/env node
/* COLETOR HEADLESS (Playwright) para portais do mt.gov.br cuja LISTAGEM é montada
   por JavaScript (um fetch simples vê 0 links — caso da SECOM). Abre a página num
   Chromium, deixa o JS renderizar, extrai os links /w/<slug> e, em cada matéria,
   pega título/foto(og:image)/data/texto — reaproveitando o parser do secom.mjs.

   Requer o pacote `playwright` e o Chromium (no GitHub Actions: `npm i playwright`
   + `npx playwright install chromium`). Localmente, aponte CHROMIUM_PATH para um
   binário existente. Gera o mesmo formato de import do Ghost (fonte na legenda).

   Uso (igual ao secom.mjs, com --base/--list/--fonte/--editoria/--id):
     node ghost/automation/secom-headless.mjs --verbose --out=ghost/import/secom-hoje.json
     node ghost/automation/secom-headless.mjs --base=https://www.pjc.mt.gov.br \
       --fonte="Polícia Judiciária Civil de MT" --editoria=policia --verbose */

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { articleLinks, parseArticle } from "./secom.mjs";
import { slugify, makeBuilder } from "./collect.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

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
  const page = await browser.newPage({ userAgent: "Mozilla/5.0 (compatible; LarCiaBot/1.0; +coletor de releases oficiais)" });

  async function render(url, sel) {
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
    if (sel) await page.waitForSelector(sel, { timeout: 12000 }).catch(() => {});
    return page.content();
  }

  let posts = 0;
  try {
    const listHtml = await render(listUrl, 'a[href*="/w/"]');
    const links = articleLinks(listHtml, base, listUrl).slice(0, max * 2);
    if (verbose) console.log(`  ${links.length} links candidatos`);
    if (!links.length) { console.error("0 links mesmo com headless — o layout da lista mudou. Me mande o HTML renderizado."); await browser.close(); process.exit(3); }

    const B = makeBuilder();
    const T_COL = B.tag("#coletado", "hash-coletado", "internal");
    const T_FONTE = B.tag(`#${id}`, `hash-${id}`, "internal");
    const T_ED = B.tag(editoria.charAt(0).toUpperCase() + editoria.slice(1), editoria, "public");

    for (const url of links) {
      if (posts >= max) break;
      const pg = await render(url).catch(() => "");
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
  } finally {
    await browser.close();
  }

  console.log(`\n[headless] matérias: ${posts}${allDates ? "" : ` (do dia ${date})`}`);
  console.log(`Arquivo: ${outPath}`);
}

main().catch((e) => { console.error("Falhou:", e.message); process.exit(1); });
