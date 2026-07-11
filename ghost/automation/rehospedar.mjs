#!/usr/bin/env node
/* CONSERTO RETROATIVO DAS FOTOS já publicadas. Varre os posts publicados de cada
   portal e RE-HOSPEDA no Ghost a `feature_image` que está EXTERNA (picsum, gov,
   http, qualquer domínio que não seja o do próprio site) — que é o que quebra na
   home (hotlink/404/mixed-content). Baixa a imagem e sobe pro /content/images,
   depois atualiza o post com a URL interna.

   Roda na SUA máquina (o sandbox não alcança os portais nem picsum/gov).
   Lê os portais e as chaves do mesmo sites.config.json do publish.mjs
   (cada site: { name, url, keyEnv }). A chave vem da variável de ambiente keyEnv.

   Uso:
     HOJEMT_ADMIN_KEY='id:secret' node ghost/automation/rehospedar.mjs --only=hojemt          # DRY-RUN (padrão): só lista
     HOJEMT_ADMIN_KEY='id:secret' node ghost/automation/rehospedar.mjs --only=hojemt --apply  # aplica de verdade
     HOJEMT_ADMIN_KEY=.. PACUNEWS_ADMIN_KEY=.. node ghost/automation/rehospedar.mjs --apply    # todos os sites do config
   Flags:
     --apply    grava (sem ela, é dry-run e nada muda)
     --only=X   só o site com name=X
     --nulls    se a imagem externa estiver MORTA (não baixa), zera a feature_image
                (o tema passa a mostrar o placeholder da marca em vez de quebrada)
     --max=N    limita a N posts por site (teste) */

import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const NULLS = args.includes("--nulls");
const only = (args.find((a) => a.startsWith("--only=")) || "").split("=")[1] || null;
const max = parseInt((args.find((a) => a.startsWith("--max=")) || "").split("=")[1] || "0", 10) || Infinity;

function jwt(key) {
  const [id, secret] = key.split(":");
  const b64 = (b) => Buffer.from(b).toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const head = b64(JSON.stringify({ alg: "HS256", typ: "JWT", kid: id }));
  const now = Math.floor(Date.now() / 1000);
  const pay = b64(JSON.stringify({ iat: now, exp: now + 300, aud: "/admin/" }));
  const sig = crypto.createHmac("sha256", Buffer.from(secret, "hex")).update(`${head}.${pay}`).digest();
  return `${head}.${pay}.${b64(sig)}`;
}

export function ehInterna(siteUrl, url) {
  if (!url) return true;                                  // null: nada a re-hospedar
  if (/^\/content\/images\//.test(url)) return true;
  try { return new URL(url).host === new URL(siteUrl).host; } catch { return false; }
}
async function baixarImagem(src) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    let referer = ""; try { referer = new URL(src).origin + "/"; } catch {}
    const r = await fetch(src, {
      redirect: "follow", signal: ctrl.signal,
      headers: { "user-agent": "Mozilla/5.0 (compatible; LarCiaBot/1.0)",
        accept: "image/avif,image/webp,image/*,*/*;q=0.8", ...(referer ? { referer } : {}) },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const ct = (r.headers.get("content-type") || "").split(";")[0].trim();
    if (!/^image\//.test(ct)) throw new Error(`tipo ${ct || "?"}`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 512) throw new Error("muito pequena");
    return { buf, ct };
  } finally { clearTimeout(t); }
}
export function nomeArquivo(src, ct) {
  let base = "imagem";
  try { base = (new URL(src).pathname.split("/").filter(Boolean).pop() || "imagem").replace(/[^\w.\-]+/g, "-").slice(-80); } catch {}
  if (!/\.[a-z0-9]{2,5}$/i.test(base)) {
    base += "." + ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" }[ct] || "jpg");
  }
  return base;
}
async function subir(siteUrl, buf, ct, filename, key) {
  const form = new FormData();
  form.append("file", new Blob([buf], { type: ct }), filename);
  form.append("purpose", "image");
  const r = await fetch(`${siteUrl}/ghost/api/admin/images/upload/`, {
    method: "POST", headers: { Authorization: `Ghost ${jwt(key)}` }, body: form,
  });
  if (!r.ok) throw new Error(`upload HTTP ${r.status}`);
  return (await r.json())?.images?.[0]?.url || null;
}

async function listarPublicados(site, key) {
  const out = [];
  let page = 1, pages = 1;
  do {
    const url = `${site.url}/ghost/api/admin/posts/?limit=100&page=${page}` +
      `&fields=id,slug,title,feature_image,updated_at&filter=${encodeURIComponent("status:published")}`;
    const r = await fetch(url, { headers: { Authorization: `Ghost ${jwt(key)}` } });
    if (!r.ok) throw new Error(`listar HTTP ${r.status} ${(await r.text()).slice(0, 160)}`);
    const j = await r.json();
    out.push(...(j.posts || []));
    pages = j.meta?.pagination?.pages || 1;
    page++;
  } while (page <= pages);
  return out;
}
async function atualizar(site, post, feature_image, key) {
  const body = { posts: [{ updated_at: post.updated_at, feature_image }] };
  const r = await fetch(`${site.url}/ghost/api/admin/posts/${post.id}/`, {
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

let totOk = 0, totNull = 0, totSkip = 0, totFail = 0;
for (const site of cfg.sites) {
  if (only && site.name !== only) continue;
  const key = process.env[site.keyEnv];
  if (!key || !key.includes(":")) { console.log(`• ${site.name}: sem ${site.keyEnv} válida — pulando.`); continue; }
  console.log(`\n== ${site.name} (${site.url}) ${APPLY ? "" : "[DRY-RUN]"} ==`);
  let posts;
  try { posts = await listarPublicados(site, key); }
  catch (e) { console.log(`  ✗ não listou: ${e.message}`); continue; }
  const externos = posts.filter((p) => p.feature_image && !ehInterna(site.url, p.feature_image));
  console.log(`  ${posts.length} publicados · ${externos.length} com foto externa`);
  let n = 0;
  for (const p of externos) {
    if (n++ >= max) break;
    try {
      const { buf, ct } = await baixarImagem(p.feature_image);
      if (!APPLY) { console.log(`  [dry] re-hospedaria: ${p.slug}`); totOk++; continue; }
      const nova = await subir(site.url, buf, ct, nomeArquivo(p.feature_image, ct), key);
      if (!nova) throw new Error("upload sem url");
      await atualizar(site, p, nova, key);
      console.log(`  ✓ ${p.slug} → ${nova}`); totOk++;
    } catch (e) {
      if (NULLS) {
        if (!APPLY) { console.log(`  [dry] zeraria (morta): ${p.slug} — ${e.message}`); totNull++; continue; }
        try { await atualizar(site, p, null, key); console.log(`  ⊘ ${p.slug}: foto morta zerada (placeholder) — ${e.message}`); totNull++; }
        catch (e2) { console.log(`  ✗ ${p.slug}: ${e2.message}`); totFail++; }
      } else { console.log(`  · ${p.slug}: foto não baixou (${e.message}) — mantida (use --nulls p/ zerar)`); totSkip++; }
    }
  }
}
console.log(`\nResumo: re-hospedadas=${totOk} zeradas=${totNull} mantidas=${totSkip} erros=${totFail}${APPLY ? "" : " (dry-run — use --apply)"}`);
}

// Só executa quando chamado direto (permite importar as funções puras em testes).
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch((e) => { console.error("Falhou:", e.message); process.exit(1); });
