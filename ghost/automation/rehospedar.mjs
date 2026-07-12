#!/usr/bin/env node
/* CONSERTO RETROATIVO DAS IMAGENS já publicadas. Varre os posts publicados de
   cada portal e RE-HOSPEDA no Ghost as imagens EXTERNAS — a foto de CAPA
   (feature_image) E as imagens do CORPO (<img> no HTML) — que quebram na home
   (hotlink/404/mixed-content). Baixa e sobe pro /content/images e atualiza o post.

   Roda na SUA máquina (o sandbox não alcança os portais nem as fontes).
   Lê portais/chaves do mesmo sites.config.json do publish.mjs
   (cada site: { name, url, keyEnv }). A chave vem da variável de ambiente keyEnv.

   Uso:
     HOJEMT_ADMIN_KEY='id:secret' node ghost/automation/rehospedar.mjs --only=hojemt          # DRY-RUN (padrão): só conta
     HOJEMT_ADMIN_KEY='id:secret' node ghost/automation/rehospedar.mjs --only=hojemt --apply  # aplica de verdade
     HOJEMT_ADMIN_KEY=.. PACUNEWS_ADMIN_KEY=.. node ghost/automation/rehospedar.mjs --apply    # todos os sites do config
   Flags:
     --apply    grava (sem ela é dry-run e nada muda)
     --only=X   só o site com name=X
     --nulls    se a foto de CAPA externa estiver MORTA (não baixa), zera a feature_image
                (o tema passa a mostrar o placeholder da marca)
     --max=N    limita a N posts por site (teste) */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { jwt, ehInterna, reHostUrl, reHostHtml, imagensExternas } from "./imagens.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const NULLS = args.includes("--nulls");
const only = (args.find((a) => a.startsWith("--only=")) || "").split("=")[1] || null;
const max = parseInt((args.find((a) => a.startsWith("--max=")) || "").split("=")[1] || "0", 10) || Infinity;

async function listarPublicados(site, key) {
  const out = [];
  let page = 1, pages = 1;
  do {
    const url = `${site.url}/ghost/api/admin/posts/?limit=50&page=${page}&formats=html` +
      `&filter=${encodeURIComponent("status:published")}`;
    const r = await fetch(url, { headers: { Authorization: `Ghost ${jwt(key)}` } });
    if (!r.ok) throw new Error(`listar HTTP ${r.status} ${(await r.text()).slice(0, 160)}`);
    const j = await r.json();
    out.push(...(j.posts || []));
    pages = j.meta?.pagination?.pages || 1;
    page++;
  } while (page <= pages);
  return out;
}
async function atualizar(site, post, patch, key) {
  const body = { posts: [{ updated_at: post.updated_at, ...patch }] };
  const r = await fetch(`${site.url}/ghost/api/admin/posts/${post.id}/?source=html`, {
    method: "PUT",
    headers: { Authorization: `Ghost ${jwt(key)}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`update HTTP ${r.status} ${(await r.text()).slice(0, 160)}`);
}

async function main() {
  const cfgPath = resolve(__dirname, "sites.config.json");
  let cfg;
  try { cfg = JSON.parse(readFileSync(cfgPath, "utf8")); }
  catch { console.error(`Crie ${cfgPath} a partir de sites.config.example.json.`); process.exit(1); }

  let capas = 0, corpos = 0, nulls = 0, postsOk = 0, skip = 0, err = 0;
  for (const site of cfg.sites) {
    if (only && site.name !== only) continue;
    const key = process.env[site.keyEnv];
    if (!key || !key.includes(":")) { console.log(`• ${site.name}: sem ${site.keyEnv} válida — pulando.`); continue; }
    console.log(`\n== ${site.name} (${site.url}) ${APPLY ? "" : "[DRY-RUN]"} ==`);
    const cache = new Map();
    let posts;
    try { posts = await listarPublicados(site, key); }
    catch (e) { console.log(`  ✗ não listou: ${e.message}`); continue; }
    console.log(`  ${posts.length} publicados`);
    let n = 0;
    for (const p of posts) {
      if (n++ >= max) break;
      const capaExterna = p.feature_image && !ehInterna(site.url, p.feature_image);
      const imgsCorpo = imagensExternas(site.url, p.html || "");
      if (!capaExterna && imgsCorpo.length === 0) continue;   // nada a re-hospedar
      if (!APPLY) {
        console.log(`  [dry] ${p.slug}: capa ${capaExterna ? "EXTERNA" : "ok"} · ${imgsCorpo.length} img(s) externas no corpo`);
        if (capaExterna) capas++;
        corpos += imgsCorpo.length;
        continue;
      }
      try {
        const patch = {};
        if (capaExterna) {
          const nova = await reHostUrl(site.url, p.feature_image, key, cache);
          if (nova) { patch.feature_image = nova; capas++; }
          else if (NULLS) { patch.feature_image = null; nulls++; }
        }
        if (imgsCorpo.length) {
          const r = await reHostHtml(site.url, p.html || "", key, cache);
          if (r.trocadas > 0) { patch.html = r.html; corpos += r.trocadas; }
        }
        if (Object.keys(patch).length === 0) { skip++; continue; }
        await atualizar(site, p, patch, key);
        console.log(`  ✓ ${p.slug}${patch.feature_image !== undefined ? " · capa" : ""}${patch.html ? " · corpo" : ""}`);
        postsOk++;
      } catch (e) { console.log(`  ✗ ${p.slug}: ${e.message}`); err++; }
    }
  }
  console.log(`\nResumo: capas=${capas} imagens-corpo=${corpos} zeradas=${nulls} posts-atualizados=${postsOk} pulados=${skip} erros=${err}${APPLY ? "" : " (dry-run — use --apply)"}`);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch((e) => { console.error("Falhou:", e.message); process.exit(1); });
