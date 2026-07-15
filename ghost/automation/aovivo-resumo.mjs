#!/usr/bin/env node
/* DEPOIS DE CADA TRANSMISSÃO AO VIVO — gera um import do Ghost com:
     1) 1 RESUMO da sessão (editoria política → O Dia Político), com o VÍDEO
        gravado embutido; e
     2) os CORTES (trechos) para a ABA DE VÍDEOS — 1 post por capítulo, com a tag
        "video", embutindo o vídeo NO TIMESTAMP do trecho (…/embed/ID?start=SEG).
   Os capítulos/timestamps saem da DESCRIÇÃO do vídeo (formato de "capítulos" do
   YouTube: linhas "HH:MM:SS Título"). O resumo vem da descrição (e é lapidado
   pela IA se IA_API_KEY estiver definido).

   Roda na SUA máquina (o sandbox não alcança YouTube/IA/portais).

   Uso (automático, com a API do YouTube):
     YOUTUBE_API_KEY=... [IA_API_KEY=...] \
       node ghost/automation/aovivo-resumo.mjs --casa=almt            # pega a última live encerrada do canal
     YOUTUBE_API_KEY=... node ghost/automation/aovivo-resumo.mjs --video=VIDEOID --casa=almt
   Uso (manual, sem a API do YouTube):
     node ghost/automation/aovivo-resumo.mjs --video=VIDEOID --casa=almt \
       --titulo="Sessão ordinária 12/07" --descricao-file=desc.txt
   Depois PUBLIQUE (roteia por editoria; cortes vão pra aba de vídeos):
     ODIAPOLITICO_ADMIN_KEY='id:secret' \
       node ghost/automation/publish.mjs ghost/import/aovivo-<casa>-<data>.json --only=odiapolitico
   Flags: --editoria=politica (padrão) · --max-cortes=8 · --out=arquivo.json */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split("=").slice(1).join("=") : d; };

// Casas legislativas (rótulo + canal oficial no YouTube).
export const CASAS = {
  almt:   { nome: "Assembleia Legislativa de MT (ALMT)", canal: "UCIxlLEYzjWPLb_CXpc-e74w" },
  camara: { nome: "Câmara dos Deputados",               canal: "UC-ZkSRh-7UEuwXJQ9UMCFJA" },
  senado: { nome: "Senado Federal",                     canal: "UCLgti7NuK0RuW9wty-fxPjQ" },
  cuiaba: { nome: "Câmara Municipal de Cuiabá",         canal: "UCNCoIaMma_H-aFP6rRNb56w" },
};

const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const slug = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

// "HH:MM:SS" | "MM:SS" -> segundos
export const secOf = (h) => String(h).split(":").reverse().reduce((a, v, i) => a + (Number(v) || 0) * 60 ** i, 0);
export const hms = (sec) => {
  sec = Math.max(0, Math.floor(sec)); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return (h ? `${h}:${String(m).padStart(2, "0")}` : `${m}`) + `:${String(s).padStart(2, "0")}`;
};

/* Extrai os "capítulos" (cortes) da descrição do YouTube: linhas que começam com
   um timestamp (HH:MM:SS ou MM:SS) seguido do título do trecho. */
export function parseCapitulos(desc) {
  const out = [];
  for (const line of String(desc || "").split(/\r?\n/)) {
    const m = line.match(/^\s*(?:▶|-|–|—|•|\*|\d+[.)])?\s*((?:\d{1,2}:)?\d{1,2}:\d{2})\s+[-–—:]?\s*(.{2,120}?)\s*$/);
    if (!m) continue;
    const sec = secOf(m[1]); const titulo = m[2].replace(/\s+/g, " ").trim();
    if (titulo) out.push({ sec, titulo });
  }
  const seen = new Set();
  return out.filter((c) => (seen.has(c.sec) ? false : seen.add(c.sec))).sort((a, b) => a.sec - b.sec);
}

export const thumb = (video) => `https://img.youtube.com/vi/${video}/maxresdefault.jpg`;
export const embed = (video, start = 0) =>
  `<figure class="kg-card kg-embed-card"><iframe width="560" height="315" ` +
  `src="https://www.youtube.com/embed/${encodeURIComponent(video)}?rel=0&modestbranding=1&playsinline=1&iv_load_policy=3${start ? `&start=${Math.floor(start)}` : ""}" ` +
  `title="Vídeo" frameborder="0" loading="lazy" ` +
  `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></figure>`;

const mobiledoc = (html) => JSON.stringify({ version: "0.3.1", atoms: [], markups: [], sections: [[10, 0]], cards: [["html", { html }]] });
const paras = (txt) => String(txt || "").split(/\n{2,}|\r?\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join("");

/* Monta o import do Ghost: 1 resumo (editoria) + N cortes (editoria + video). */
export function buildImport({ casaKey, casaNome, editoria, video, tituloSessao, resumoHtml, cortes, when }) {
  const at = new Date(when || Date.now()).toISOString().replace(/\.\d+Z$/, ".000Z");
  const tEd = { id: 1, name: editoria[0].toUpperCase() + editoria.slice(1), slug: editoria, visibility: "public", description: null };
  const tVid = { id: 2, name: "Vídeo", slug: "video", visibility: "public", description: null };
  const tags = [tEd, tVid];
  const posts = []; const posts_tags = []; let pid = 0;
  const cap = `Sessão na íntegra: ${esc(casaNome)} — transmissão oficial no YouTube.`;

  // 1) RESUMO (só editoria → é artigo, não vai pra aba de vídeos)
  const rid = ++pid;
  posts.push({
    id: rid, title: `${casaNome}: ${tituloSessao}`.slice(0, 120),
    slug: `resumo-${casaKey}-${video}`.toLowerCase(), type: "post", status: "published", visibility: "public",
    mobiledoc: mobiledoc(`<p class="post-deck"><strong>Resumo da sessão e os principais momentos em vídeo.</strong></p>${resumoHtml}${embed(video)}`),
    feature_image: thumb(video), feature_image_caption: cap,
    custom_excerpt: `Resumo da sessão de ${casaNome}: ${tituloSessao}`.slice(0, 290),
    created_at: at, updated_at: at, published_at: at,
  });
  posts_tags.push({ tag_id: tEd.id, post_id: rid, sort_order: 0 });

  // 2) CORTES (editoria + video → aparecem na aba de vídeos)
  for (const c of cortes) {
    const id = ++pid;
    posts.push({
      id, title: `${c.titulo} — ${casaNome}`.slice(0, 120),
      slug: `corte-${casaKey}-${video}-${c.sec}`.toLowerCase(), type: "post", status: "published", visibility: "public",
      mobiledoc: mobiledoc(`${embed(video, c.sec)}<p>Trecho da sessão de ${esc(casaNome)} a partir de ${hms(c.sec)}.</p>`),
      feature_image: thumb(video), feature_image_caption: cap,
      custom_excerpt: `${c.titulo} — corte da sessão de ${casaNome} (${hms(c.sec)}).`.slice(0, 290),
      created_at: at, updated_at: at, published_at: at,
    });
    posts_tags.push({ tag_id: tEd.id, post_id: id, sort_order: 0 });   // editoria = 1ª tag (roteia)
    posts_tags.push({ tag_id: tVid.id, post_id: id, sort_order: 1 });  // video = aba de vídeos
  }
  return { db: [{ meta: { exported_on: Date.now(), version: "5.0.0" }, data: { posts, tags, posts_tags } }] };
}

// ---------- YouTube Data API (opcional) -----------------------------------
async function ytJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`YouTube API HTTP ${r.status} ${(await r.text()).slice(0, 140)}`);
  return r.json();
}
async function ytVideo(id, key) {
  const j = await ytJson(`https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${encodeURIComponent(id)}&key=${key}`);
  const v = j.items?.[0]; if (!v) throw new Error("vídeo não encontrado");
  return { title: v.snippet.title, description: v.snippet.description, when: v.snippet.publishedAt, live: v.liveStreamingDetails || null };
}
async function ytUltimaEncerrada(channelId, key) {
  const j = await ytJson(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${encodeURIComponent(channelId)}&eventType=completed&type=video&order=date&maxResults=1&key=${key}`);
  return j.items?.[0]?.id?.videoId || null;
}

// ---------- IA (opcional): lapida o resumo a partir da descrição ------------
async function resumirIA(titulo, texto) {
  const KEY = process.env.IA_API_KEY; if (!KEY || !String(texto).trim()) return null;
  const provider = (process.env.IA_PROVIDER || (KEY.startsWith("sk-ant") ? "anthropic" : "openai")).toLowerCase();
  const url = process.env.IA_API_URL || (provider === "anthropic" ? "https://api.anthropic.com/v1/messages" : "https://api.openai.com/v1/chat/completions");
  const model = process.env.IA_MODEL || (provider === "anthropic" ? "claude-3-5-haiku-latest" : "gpt-4o-mini");
  const sys = "Você é editor de política. Escreva um RESUMO jornalístico e neutro da sessão legislativa, em 2 a 4 parágrafos, a partir das notas/descrição. Não invente fatos. Responda só com os parágrafos (sem markdown).";
  const user = `TÍTULO: ${titulo}\nNOTAS/DESCRIÇÃO DA SESSÃO:\n${String(texto).slice(0, 6000)}`;
  try {
    let out = "";
    if (provider === "anthropic") {
      const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model, max_tokens: 900, system: sys, messages: [{ role: "user", content: user }] }) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`); out = (await r.json())?.content?.[0]?.text || "";
    } else {
      const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json", Authorization: `Bearer ${KEY}` }, body: JSON.stringify({ model, temperature: 0.5, messages: [{ role: "system", content: sys }, { role: "user", content: user }] }) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`); out = (await r.json())?.choices?.[0]?.message?.content || "";
    }
    return out.trim() || null;
  } catch (e) { console.log(`  · IA não resumiu (${e.message}) — usando a descrição`); return null; }
}

async function main() {
  const casaKey = opt("casa", "");
  const casa = CASAS[casaKey];
  if (!casa) { console.error(`Informe --casa=${Object.keys(CASAS).join("|")}`); process.exit(1); }
  const editoria = opt("editoria", "politica");
  const maxCortes = parseInt(opt("max-cortes", "8"), 10);
  const YT = process.env.YOUTUBE_API_KEY || "";
  let video = opt("video", "");
  let titulo = opt("titulo", "");
  let descricao = "";
  const descFile = opt("descricao-file", "");
  if (descFile) descricao = readFileSync(resolve(process.cwd(), descFile), "utf8");

  if (!video && YT) { video = await ytUltimaEncerrada(casa.canal, YT); if (!video) { console.error("Nenhuma live encerrada encontrada nesse canal."); process.exit(1); } }
  if (!video) { console.error("Informe --video=ID (ou YOUTUBE_API_KEY para pegar a última encerrada)."); process.exit(1); }
  if ((!titulo || !descricao) && YT) { const v = await ytVideo(video, YT); titulo = titulo || v.title; descricao = descricao || v.description; }
  if (!titulo) titulo = `Sessão — ${new Date().toLocaleDateString("pt-BR")}`;

  const cortes = parseCapitulos(descricao).slice(0, maxCortes);
  const resumoTxt = await resumirIA(titulo, descricao);
  const resumoHtml = paras(resumoTxt) || paras(descricao) || `<p>Confira abaixo a íntegra e os principais momentos da sessão de ${esc(casa.nome)}.</p>`;

  const outObj = buildImport({ casaKey, casaNome: casa.nome, editoria, video, tituloSessao: titulo, resumoHtml, cortes, when: Date.now() });
  const outPath = resolve(process.cwd(), opt("out", `ghost/import/aovivo-${casaKey}-${new Date().toISOString().slice(0, 10)}.json`));
  writeFileSync(outPath, JSON.stringify(outObj, null, 2) + "\n", "utf8");
  console.log(`OK: ${outPath}\n  vídeo=${video} · resumo=1 · cortes=${cortes.length}${resumoTxt ? " · resumo pela IA" : ""}`);
  console.log(`Publique: ODIAPOLITICO_ADMIN_KEY='id:secret' node ghost/automation/publish.mjs ${outPath} --only=odiapolitico`);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch((e) => { console.error("Falhou:", e.message); process.exit(1); });
