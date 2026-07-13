#!/usr/bin/env node
/* REEDITA as matérias JÁ PUBLICADAS para deixar no PADRÃO (limpeza + SEO). Para
   cada post publicado do portal:
     1) LIMPA o corpo — tira "Notícias relacionadas / Leia também", rodapés de
        crédito ("Edição:", "Com informações de…") e links externos; re-hospeda
        as imagens externas;
     2) com IA (IA_API_KEY): REEDITA para corrigir gramática e padronizar o SEO —
        título ≤76, subtítulo, corpo jornalístico e resumo (meta) de 139–149;
        sem IA, faz só a limpeza + garante um resumo (excerpt) decente.

   Roda na SUA máquina. Por padrão só mexe em quem TEM problema (bloco de
   relacionadas, link externo, rodapé, imagem externa, sem resumo ou título
   longo). Use --tudo para uma passada geral (gramática/SEO em tudo — mais caro).

   Uso:
     ODIAPOLITICO_ADMIN_KEY='id:secret' IA_API_KEY=… \
       node ghost/automation/reeditar.mjs --only=odiapolitico            # DRY-RUN
     … node ghost/automation/reeditar.mjs --only=odiapolitico --apply    # aplica
   Flags: --apply · --only=<site> · --max=N (padrão 30) · --tudo · --sem-ia · --slug=<slug único> */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { jwt, ehInterna, reHostHtml, reHostUrl, imagensExternas, semLinksExternosSite } from "./imagens.mjs";
import { semRelacionadas, semRodape } from "./collect.mjs";
import { reescreverUm } from "./reescrever.mjs";

const args = process.argv.slice(2);
const has = (k) => args.includes(`--${k}`);
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split("=").slice(1).join("=") : d; };
const APPLY = has("apply"), TUDO = has("tudo"), SEM_IA = has("sem-ia");
const only = opt("only", null), slugAlvo = opt("slug", null);
const max = parseInt(opt("max", "30"), 10) || 30;
const IA = !SEM_IA && !!process.env.IA_API_KEY;

const stripTags = (s) => String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const clamp = (s, n) => { s = String(s || "").trim(); return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "").trim() : s; };
const mobiledoc = (html) => JSON.stringify({ version: "0.3.1", atoms: [], markups: [], sections: [[10, 0]], cards: [["html", { html }]] });

const cfgPath = resolve(dirname(fileURLToPath(import.meta.url)), "sites.config.json");
let cfg; try { cfg = JSON.parse(readFileSync(cfgPath, "utf8")); }
catch { console.error(`Crie ${cfgPath} a partir de sites.config.example.json.`); process.exit(1); }

async function api(site, key, method, path, body) {
  const r = await fetch(`${site}/ghost/api/admin${path}`, {
    method, headers: { Authorization: `Ghost ${jwt(key)}`, ...(body ? { "content-type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!r.ok) throw new Error(`${method} ${path} HTTP ${r.status} ${(await r.text()).slice(0, 160)}`);
  return r.json();
}
async function listar(site, key) {
  if (slugAlvo) { const j = await api(site, key, "GET", `/posts/slug/${encodeURIComponent(slugAlvo)}/?formats=html`); return j.posts || []; }
  const out = []; let page = 1, pages = 1;
  do {
    const j = await api(site, key, "GET", `/posts/?limit=50&page=${page}&formats=html&filter=${encodeURIComponent("status:published")}`);
    out.push(...(j.posts || [])); pages = j.meta?.pagination?.pages || 1; page++;
  } while (page <= pages);
  return out;
}

// Precisa de conserto? (sem IA, só olha problemas mecânicos + SEO)
function temProblema(site, p) {
  const h = p.html || "";
  return semRelacionadas(h) !== h || semRodape(h) !== h
    || semLinksExternosSite(site, h).removidos > 0 || imagensExternas(site, h).length > 0
    || (p.feature_image && !ehInterna(site, p.feature_image))
    || !p.custom_excerpt || p.custom_excerpt.length < 120 || p.title.length > 76;
}

async function reeditarPost(siteUrl, key, p, cache) {
  let html = p.html || "";
  html = semRelacionadas(html); html = semRodape(html);
  html = semLinksExternosSite(siteUrl, html).html;
  if (imagensExternas(siteUrl, html).length) html = (await reHostHtml(siteUrl, html, key, cache)).html;
  let feature = p.feature_image || null;
  if (feature && !ehInterna(siteUrl, feature)) feature = (await reHostUrl(siteUrl, feature, key, cache)) || feature;

  let title = p.title, excerpt = p.custom_excerpt || "";
  if (IA) {
    try {
      const e = await reescreverUm(p.title, stripTags(html));
      if (e.titulo && e.corpo_html) {
        title = e.titulo;
        excerpt = e.resumo || excerpt;
        const deck = e.subtitulo ? `<p class="post-deck"><strong>${esc(e.subtitulo)}</strong></p>` : "";
        html = semLinksExternosSite(siteUrl, deck + e.corpo_html).html;
      }
    } catch (e) { console.log(`    · IA não reeditou (${e.message}) — mantém limpeza`); }
  }
  if (title.length > 76) title = clamp(title, 76);
  if (!excerpt || excerpt.length < 120) excerpt = clamp(stripTags(html), 149);
  return { title, excerpt: clamp(excerpt, 149), html, feature };
}

async function main() {
  let tot = { proc: 0, ok: 0, skip: 0, err: 0 };
  for (const site of cfg.sites) {
    if (only && site.name !== only) continue;
    const key = process.env[site.keyEnv];
    if (!key || !key.includes(":")) { console.log(`• ${site.name}: sem ${site.keyEnv} válida — pulando.`); continue; }
    console.log(`\n== ${site.name} (${site.url}) ${APPLY ? "" : "[DRY-RUN]"}${IA ? " · IA" : " · sem IA"} ==`);
    const cache = new Map();
    let posts; try { posts = await listar(site.url, key); } catch (e) { console.log(`  ✗ não listou: ${e.message}`); continue; }
    const alvo = posts.filter((p) => TUDO || slugAlvo || temProblema(site.url, p));
    console.log(`  ${posts.length} publicados · ${alvo.length} a reeditar${TUDO ? " (--tudo)" : ""}`);
    let n = 0;
    for (const p of alvo) {
      if (n++ >= max) { console.log(`  (limite --max=${max} atingido; rode de novo p/ continuar)`); break; }
      tot.proc++;
      if (!APPLY) { console.log(`  [dry] ${p.slug}`); continue; }
      try {
        const r = await reeditarPost(site.url, key, p, cache);
        const patch = { updated_at: p.updated_at, title: r.title, custom_excerpt: r.excerpt, mobiledoc: mobiledoc(r.html) };
        if (r.feature !== p.feature_image) patch.feature_image = r.feature;
        await api(site.url, key, "PUT", `/posts/${p.id}/`, { posts: [patch] });
        console.log(`  ✓ ${p.slug} — título ${r.title.length}c · resumo ${r.excerpt.length}c`); tot.ok++;
      } catch (e) { console.log(`  ✗ ${p.slug}: ${e.message}`); tot.err++; }
    }
  }
  console.log(`\nResumo: processados=${tot.proc} reeditados=${tot.ok} erros=${tot.err}${APPLY ? "" : " (dry-run — use --apply)"}`);
}

main().catch((e) => { console.error("Falhou:", e.message); process.exit(1); });
