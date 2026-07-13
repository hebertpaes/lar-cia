#!/usr/bin/env node
/* COLUNA SEMANAL de análise política — O Dia Político. Puxa o gancho das
   MANCHETES DE POLÍTICA da semana (do próprio portal via Admin API, ou de
   --fonte=coletado.json) e escreve UMA coluna de ANÁLISE (IA_API_KEY),
   conectando política a economia/negócios, na voz do portal. Sai como RASCUNHO
   (status: draft) para você revisar antes de publicar.

   É análise/opinião ancorada nas manchetes reais da semana — a IA interpreta e
   contextualiza, não inventa fato novo. REVISE antes de tornar público.

   Roda na SUA máquina/nuvem. Uso:
     ODIAPOLITICO_ADMIN_KEY='id:secret' IA_API_KEY=… \
       node ghost/automation/coluna.mjs                    # DRY-RUN (mostra a coluna)
     … node ghost/automation/coluna.mjs --apply            # cria o RASCUNHO no portal
     … node ghost/automation/coluna.mjs --fonte=ghost/import/coletado-hoje.json --apply
   Flags: --apply · --site-key=VAR (padrão ODIAPOLITICO_ADMIN_KEY) · --site-url=…
          --n=12 (nº de manchetes) · --forcar (recria mesmo se já existe a da semana) */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { jwt } from "./imagens.mjs";
import { semLinksExternos } from "./collect.mjs";

const args = process.argv.slice(2);
const has = (k) => args.includes(`--${k}`);
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split("=").slice(1).join("=") : d; };
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const clamp = (s, n) => { s = String(s || "").trim(); return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "").trim() : s; };
const stripTags = (s) => String(s || "").replace(/<(?:[^>"']|"[^"]*"|'[^']*')*>/g, " ").replace(/\s+/g, " ").trim();
const mobiledoc = (html) => JSON.stringify({ version: "0.3.1", atoms: [], markups: [], sections: [[10, 0]], cards: [["html", { html }]] });
// segunda-feira da semana corrente (slug estável por semana)
export function segunda(d = new Date()) { const x = new Date(d); const wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); return x.toISOString().slice(0, 10); }

// Monta o post-rascunho a partir do JSON da IA {titulo,subtitulo,corpo_html,resumo}.
export function montarColuna(e, dataSeg) {
  const deck = e.subtitulo ? `<p class="post-deck"><strong>${esc(clamp(e.subtitulo, 60))}</strong></p>` : "";
  const html = semLinksExternos(deck + String(e.corpo_html || ""));
  return {
    title: clamp(e.titulo, 76), slug: `coluna-semana-${dataSeg}`,
    status: "draft", visibility: "public",
    mobiledoc: mobiledoc(html), feature_image: null, feature_image_caption: "Análise — O Dia Político",
    custom_excerpt: clamp(e.resumo, 149),
    tags: [{ name: "Política" }, { name: "Colunas" }],
  };
}

// ---------- Admin API ------------------------------------------------------
async function api(site, key, method, path, body) {
  const r = await fetch(`${site}/ghost/api/admin${path}`, {
    method, headers: { Authorization: `Ghost ${jwt(key)}`, ...(body ? { "content-type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!r.ok) throw new Error(`${method} ${path} HTTP ${r.status} ${(await r.text()).slice(0, 160)}`);
  return r.json();
}
async function getBySlug(site, key, slug) {
  try { const j = await api(site, key, "GET", `/posts/slug/${encodeURIComponent(slug)}/?fields=id,status`); return j.posts?.[0] || null; }
  catch (e) { if (/HTTP 404/.test(e.message)) return null; throw e; }
}
async function pautaDoPortal(site, key, n) {
  const j = await api(site, key, "GET", `/posts/?filter=${encodeURIComponent("tag:politica+status:published")}&limit=${n}&order=${encodeURIComponent("published_at desc")}&fields=title,custom_excerpt`);
  return (j.posts || []).map((p) => ({ titulo: p.title, resumo: p.custom_excerpt || "" }));
}
function pautaDeArquivo(file, n) {
  const d = JSON.parse(readFileSync(resolve(process.cwd(), file), "utf8")).db[0].data;
  const politicaTag = (d.tags.find((t) => t.slug === "politica") || {}).id;
  const ehPolitica = (p) => d.posts_tags.some((pt) => pt.post_id === p.id && pt.tag_id === politicaTag);
  const htmlDe = (p) => { if (p.html) return p.html; try { return JSON.parse(p.mobiledoc).cards[0][1].html; } catch { return ""; } };
  return d.posts.filter((p) => p.type === "post" && (!politicaTag || ehPolitica(p))).slice(0, n)
    .map((p) => ({ titulo: p.title, resumo: p.custom_excerpt || clamp(stripTags(htmlDe(p)), 160) }));
}

// ---------- IA: escreve a coluna a partir da pauta -------------------------
async function escreverColuna(pauta) {
  const KEY = process.env.IA_API_KEY;
  if (!KEY) throw new Error("defina IA_API_KEY (a coluna é escrita pela IA)");
  const provider = (process.env.IA_PROVIDER || (KEY.startsWith("sk-ant") ? "anthropic" : "openai")).toLowerCase();
  const url = process.env.IA_API_URL || (provider === "anthropic" ? "https://api.anthropic.com/v1/messages" : "https://api.openai.com/v1/chat/completions");
  const model = process.env.IA_MODEL || (provider === "anthropic" ? "claude-3-5-haiku-latest" : "gpt-4o-mini");
  const sys = "Você é o colunista de política do O Dia Político, portal de Mato Grosso para público qualificado — gestores, agentes públicos e leitores de economia, finanças e negócios. Escreva UMA coluna de ANÁLISE conectando política a economia e negócios, a partir das manchetes da SEMANA. Interprete e contextualize; NÃO invente fato, número, declaração ou resultado além do que está nas manchetes. Tom analítico, plural e sem favorecer candidato. É opinião/análise, não notícia.";
  const instr = 'Responda SOMENTE com JSON válido, sem markdown: {"titulo":"≤76","subtitulo":"≤55","corpo_html":"<p>…</p><p>…</p> (pode usar um <h3> de subtítulo interno)","resumo":"139 a 149 caracteres, com SEO"}.';
  const user = `${instr}\n\nMANCHETES DA SEMANA (política de MT):\n${pauta.map((p) => `- ${p.titulo}${p.resumo ? " — " + p.resumo : ""}`).join("\n")}`;
  let out = "";
  if (provider === "anthropic") {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model, max_tokens: 1600, system: sys, messages: [{ role: "user", content: user }] }) });
    if (!r.ok) throw new Error(`IA HTTP ${r.status} ${(await r.text()).slice(0, 140)}`); out = (await r.json())?.content?.[0]?.text || "";
  } else {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json", Authorization: `Bearer ${KEY}` }, body: JSON.stringify({ model, temperature: 0.6, response_format: { type: "json_object" }, messages: [{ role: "system", content: sys }, { role: "user", content: user }] }) });
    if (!r.ok) throw new Error(`IA HTTP ${r.status} ${(await r.text()).slice(0, 140)}`); out = (await r.json())?.choices?.[0]?.message?.content || "";
  }
  const j = JSON.parse(out.replace(/^```json\s*|\s*```$/g, "").trim());
  if (!j.titulo || !j.corpo_html) throw new Error("resposta da IA incompleta");
  return j;
}

async function main() {
  const keyVar = opt("site-key", "ODIAPOLITICO_ADMIN_KEY");
  const key = process.env[keyVar];
  if (!key || !key.includes(":")) { console.error(`Defina ${keyVar}='id:secret'.`); process.exit(1); }
  let siteUrl = opt("site-url", "");
  if (!siteUrl) {
    try { const cfg = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "sites.config.json"), "utf8")); siteUrl = (cfg.sites.find((s) => s.keyEnv === keyVar) || {}).url || ""; } catch {}
  }
  if (!siteUrl) { console.error("Informe --site-url=https://… (ou configure o sites.config.json)."); process.exit(1); }
  siteUrl = siteUrl.replace(/\/$/, "");
  const n = parseInt(opt("n", "12"), 10) || 12;
  const dataSeg = segunda();
  const slug = `coluna-semana-${dataSeg}`;

  const fonte = opt("fonte", "");
  const pauta = fonte ? pautaDeArquivo(fonte, n) : await pautaDoPortal(siteUrl, key, n);
  if (pauta.length < 3) { console.error(`Pauta fraca (${pauta.length} manchetes de política). Colete/publique mais política antes.`); process.exit(1); }
  console.log(`Pauta da semana (${pauta.length} manchetes):`);
  pauta.forEach((p) => console.log(`  • ${p.titulo}`));

  const e = await escreverColuna(pauta);
  const post = montarColuna(e, dataSeg);
  console.log(`\n— COLUNA —\nTítulo (${post.title.length}c): ${post.title}\nResumo (${post.custom_excerpt.length}c): ${post.custom_excerpt}\n`);

  if (!has("apply")) { console.log("[dry-run] use --apply para criar o RASCUNHO no portal."); return; }
  const existe = await getBySlug(siteUrl, key, slug);
  if (existe && !has("forcar")) { console.log(`Já existe a coluna desta semana (${slug}). Use --forcar para recriar.`); return; }
  if (existe) await api(siteUrl, key, "PUT", `/posts/${existe.id}/`, { posts: [{ ...post, updated_at: new Date().toISOString() }] });
  else await api(siteUrl, key, "POST", "/posts/", { posts: [post] });
  console.log(`✓ Rascunho ${existe ? "atualizado" : "criado"}: ${siteUrl}/ghost/#/editor/post/  (slug ${slug}) — revise e publique.`);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch((e) => { console.error("Falhou:", e.message); process.exit(1); });
