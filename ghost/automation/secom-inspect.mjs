#!/usr/bin/env node
/* INSPETOR da SECOM (roda na SUA máquina — IP do Brasil, que o site não bloqueia).
   Abre a listagem num navegador de verdade e captura SOZINHO:
     • as requisições JSON/API que a página faz (a "API" das notícias);
     • os links /w/<slug> já renderizados;
     • o HTML renderizado (salvo em secom-render.html).
   Assim a gente descobre de onde vêm as notícias sem você mexer no DevTools.

   Pré-requisito (uma vez):  npm i playwright && npx playwright install chromium
   Uso:
     node ghost/automation/secom-inspect.mjs                       # SECOM
     node ghost/automation/secom-inspect.mjs https://www.pjc.mt.gov.br/noticias
     HEADFUL=1 node ghost/automation/secom-inspect.mjs             # abre o navegador visível
   Depois: me cole a saída (e, se puder, envie o secom-render.html). */

import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const LIST = process.argv[2] || "https://www.secom.mt.gov.br/noticias";
const HEADFUL = process.env.HEADFUL === "1";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const browser = await chromium.launch({ headless: !HEADFUL, args: ["--no-sandbox"] });
const page = await browser.newPage({ userAgent: UA, ignoreHTTPSErrors: true });

const jsons = [];
page.on("response", async (resp) => {
  try {
    const url = resp.url();
    const ct = resp.headers()["content-type"] || "";
    const interesting = /json/i.test(ct) ||
      /\/(o\/headless-delivery|o\/c\/|api|jsonws|search|structured-content|journal|content|noticia)/i.test(url);
    if (!interesting) return;
    if (/\.(js|css|png|jpe?g|gif|svg|woff2?)(\?|$)/i.test(url)) return;
    let body = ""; try { body = (await resp.text()).slice(0, 400).replace(/\s+/g, " "); } catch {}
    jsons.push({ url, status: resp.status(), ct, body });
  } catch {}
});

console.log("Abrindo", LIST, "…  (pode levar alguns segundos)");
await page.goto(LIST, { waitUntil: "networkidle", timeout: 60000 }).catch((e) => console.log("goto:", e.message));
await page.waitForTimeout(3500);

let wlinks = [];
try { wlinks = await page.$$eval('a[href*="/w/"]', (els) => Array.from(new Set(els.map((e) => e.getAttribute("href")))).slice(0, 25)); } catch {}

let anchors = 0, title = "", finalUrl = "";
try { const d = await page.evaluate(() => ({ a: document.querySelectorAll("a").length, t: document.title, u: location.href })); anchors = d.a; title = d.t; finalUrl = d.u; } catch {}

let html = ""; try { html = await page.content(); } catch (e) { html = "(page.content falhou: " + e.message + ")"; }
try { writeFileSync("secom-render.html", html); } catch {}

await browser.close();

console.log("\n================= RESULTADO =================");
console.log("URL final :", finalUrl || "(não carregou)");
console.log("Título    :", title, "| total de <a>:", anchors);
console.log("\n----- LINKS /w/ RENDERIZADOS (" + wlinks.length + ") -----");
if (wlinks.length) wlinks.forEach((u) => console.log("  " + u)); else console.log("  (nenhum)");
console.log("\n----- REQUISIÇÕES JSON/API CAPTURADAS (" + jsons.length + ") -----");
if (jsons.length) jsons.forEach((j) => console.log(`\n[${j.status}] ${j.url}\n   content-type: ${j.ct}\n   body: ${j.body}`));
else console.log("  (nenhuma requisição JSON capturada)");
console.log("\nHTML renderizado salvo em: secom-render.html");
console.log("\n>>> Me cole TODO o resultado acima. Se possível, envie também o secom-render.html.");
