#!/usr/bin/env node
/* COBERTURA AO VIVO (live-blog) da sessão legislativa, em 3 momentos:
     --iniciar   cria o post "Cobertura ao vivo" com a TRANSMISSÃO embutida
                 (stream do canal) e o feed de atualizações vazio, no ar;
     --nota      INSERE uma atualização em TEMPO REAL no topo do feed (com a
                 hora); pode marcar o momento do vídeo (--sec=SEGUNDOS);
     --encerrar  fecha a cobertura: troca o stream pela GRAVAÇÃO (--video=ID),
                 tira o "AO VIVO" e sugere gerar os CORTES (aovivo-resumo.mjs).

   O tema recarrega sozinho a página enquanto está AO VIVO (data-live="1"), então
   o leitor vê as notas aparecerem. Roda na SUA máquina/nuvem, com a chave do
   portal. Reaproveita o mesmo post do dia (slug determinístico por casa+data).

   Uso:
     ODIAPOLITICO_ADMIN_KEY='id:secret' node ghost/automation/aovivo-cobertura.mjs --iniciar --casa=almt
     ODIAPOLITICO_ADMIN_KEY='id:secret' node ghost/automation/aovivo-cobertura.mjs --nota --casa=almt --texto="Plenário aprova o PL 123 por 18 a 3." [--sec=750 --video=ID]
     ODIAPOLITICO_ADMIN_KEY='id:secret' node ghost/automation/aovivo-cobertura.mjs --encerrar --casa=almt --video=ID
   Flags: --site-key=NOME_DA_VAR (padrão ODIAPOLITICO_ADMIN_KEY) · --site-url=... · --slug=... */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { jwt } from "./imagens.mjs";
import { CASAS, embed, hms } from "./aovivo-resumo.mjs";

const args = process.argv.slice(2);
const has = (k) => args.includes(`--${k}`);
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split("=").slice(1).join("=") : d; };
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const embedLiveCanal = (canal) =>
  `<figure class="kg-card kg-embed-card"><iframe width="560" height="315" ` +
  `src="https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(canal)}&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3" ` +
  `title="Transmissão ao vivo" frameborder="0" loading="lazy" ` +
  `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></figure>`;

// Uma atualização do feed (hora + texto, opcionalmente com marca do vídeo).
export function entryLi(hora, texto, video, sec) {
  const ts = (video && sec != null && sec !== "")
    ? ` <a class="live-update-ts" href="https://www.youtube.com/watch?v=${encodeURIComponent(video)}&t=${Math.floor(sec)}s" target="_blank" rel="noopener">▶ ${hms(sec)}</a>` : "";
  return `<li class="live-update"><time>${esc(hora)}</time> <span>${esc(texto)}</span>${ts}</li>`;
}
// Insere a nova nota no TOPO da lista .live-updates (mais recente primeiro).
export function prependUpdate(html, li) {
  return /<ul[^>]*class="live-updates"[^>]*>/.test(html)
    ? html.replace(/(<ul[^>]*class="live-updates"[^>]*>)/, `$1${li}`) : html;
}
// Corpo inicial da cobertura (transmissão + feed vazio, AO VIVO).
export function coberturaBody({ canal, casaNome, entries = [] }) {
  return `<p class="post-deck"><strong>Cobertura ao vivo — sessão de ${esc(casaNome)}, atualizando em tempo real.</strong></p>` +
    embedLiveCanal(canal) +
    `<div class="live-cobertura" data-live="1"><p class="live-cobertura-flag"><span class="live-dot"></span> AO VIVO — acompanhe as atualizações</p>` +
    `<ul class="live-updates">${entries.join("")}</ul></div>`;
}
// Fecha a cobertura: data-live=0, tira o rótulo AO VIVO, e (se houver gravação)
// troca o stream do canal pela gravação embutida.
export function encerrarBody(html, video, canal) {
  let out = html.replace('data-live="1"', 'data-live="0"')
    .replace(/<p class="live-cobertura-flag">[\s\S]*?<\/p>/, '<p class="live-cobertura-flag encerrada">Cobertura encerrada — veja abaixo os melhores momentos.</p>');
  if (video) out = out.replace(embedLiveCanal(canal), embed(video));
  return out;
}

const mobiledoc = (html) => JSON.stringify({ version: "0.3.1", atoms: [], markups: [], sections: [[10, 0]], cards: [["html", { html }]] });
const htmlDe = (md) => { try { return (JSON.parse(md).cards || []).find((c) => c[0] === "html")?.[1]?.html || ""; } catch { return ""; } };
const agora = () => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

// ---------- Ghost Admin API ------------------------------------------------
async function api(site, key, method, path, body) {
  const r = await fetch(`${site}/ghost/api/admin${path}`, {
    method, headers: { Authorization: `Ghost ${jwt(key)}`, ...(body ? { "content-type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!r.ok) throw new Error(`${method} ${path} HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
}
async function getBySlug(site, key, slug) {
  try { const j = await api(site, key, "GET", `/posts/slug/${encodeURIComponent(slug)}/?formats=mobiledoc`); return j.posts?.[0] || null; }
  catch (e) { if (/HTTP 404/.test(e.message)) return null; throw e; }
}

function siteFrom() {
  const keyVar = opt("site-key", "ODIAPOLITICO_ADMIN_KEY");
  const key = process.env[keyVar];
  if (!key || !key.includes(":")) { console.error(`Defina ${keyVar}='id:secret' (ou --site-key=OUTRA_VAR).`); process.exit(1); }
  let url = opt("site-url", "");
  if (!url) {
    const cfgPath = resolve(dirname(fileURLToPath(import.meta.url)), "sites.config.json");
    try { const cfg = JSON.parse(readFileSync(cfgPath, "utf8")); url = (cfg.sites.find((s) => s.keyEnv === keyVar) || {}).url || ""; } catch {}
  }
  if (!url) { console.error("Informe --site-url=https://… (ou configure o sites.config.json)."); process.exit(1); }
  return { url: url.replace(/\/$/, ""), key };
}

async function main() {
  const casaKey = opt("casa", ""); const casa = CASAS[casaKey];
  if (!casa) { console.error(`Informe --casa=${Object.keys(CASAS).join("|")}`); process.exit(1); }
  const { url, key } = siteFrom();
  const slug = (opt("slug", "") || `cobertura-${casaKey}-${new Date().toISOString().slice(0, 10)}`).toLowerCase();

  if (has("iniciar")) {
    if (await getBySlug(url, key, slug)) { console.log(`Já existe cobertura hoje (${slug}). Use --nota para atualizar.`); return; }
    const title = opt("titulo", `AO VIVO: ${casa.nome} — cobertura da sessão`);
    const body = coberturaBody({ canal: casa.canal, casaNome: casa.nome });
    await api(url, key, "POST", "/posts/", { posts: [{
      title: title.slice(0, 120), slug, status: "published", featured: true,
      mobiledoc: mobiledoc(body), tags: [{ name: "Política" }, { name: "Vídeo" }],
      custom_excerpt: `Cobertura ao vivo da sessão de ${casa.nome} — atualizações em tempo real.`.slice(0, 290),
    }] });
    console.log(`✓ Cobertura no ar: ${url}/${slug}/`);
    return;
  }

  const post = await getBySlug(url, key, slug);
  if (!post) { console.error(`Não achei a cobertura de hoje (${slug}). Rode --iniciar primeiro.`); process.exit(1); }
  let html = htmlDe(post.mobiledoc);

  if (has("nota")) {
    let texto = opt("texto", "");
    const tf = opt("texto-file", ""); if (tf) texto = readFileSync(resolve(process.cwd(), tf), "utf8").trim();
    if (!texto) { console.error("Informe --texto=\"…\" (ou --texto-file=nota.txt)."); process.exit(1); }
    html = prependUpdate(html, entryLi(agora(), texto, opt("video", ""), opt("sec", "")));
    await api(url, key, "PUT", `/posts/${post.id}/`, { posts: [{ mobiledoc: mobiledoc(html), updated_at: post.updated_at }] });
    console.log(`✓ Nota inserida (${agora()}): ${texto.slice(0, 60)}`);
    return;
  }

  if (has("encerrar")) {
    html = encerrarBody(html, opt("video", ""), casa.canal);
    await api(url, key, "PUT", `/posts/${post.id}/`, { posts: [{ mobiledoc: mobiledoc(html), updated_at: post.updated_at }] });
    console.log(`✓ Cobertura encerrada: ${url}/${slug}/`);
    const v = opt("video", "");
    console.log(v
      ? `Agora gere os CORTES:\n  YOUTUBE_API_KEY=… node ghost/automation/aovivo-resumo.mjs --casa=${casaKey} --video=${v}\n  (depois publique com o publish.mjs)`
      : `Para os CORTES, rode o aovivo-resumo.mjs com --video=ID da gravação.`);
    return;
  }

  console.error("Use um modo: --iniciar | --nota | --encerrar");
  process.exit(1);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch((e) => { console.error("Falhou:", e.message); process.exit(1); });
