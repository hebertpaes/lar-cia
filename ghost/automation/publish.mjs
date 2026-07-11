#!/usr/bin/env node
/* Publicação automática multi-portal via Ghost Admin API.
   Lê um arquivo de conteúdo (formato de import do Ghost: db[0].data) e publica
   cada matéria nos portais configurados, roteando POR EDITORIA.

   Roteamento (sites.config.json):
     - editorias: "*"            → recebe todas as matérias
     - editorias: ["politica"]   → recebe só as dessas editorias (por slug)

   Cada portal usa sua própria Admin API Key, lida de uma variável de ambiente
   (keyEnv). As chaves NUNCA ficam no repositório.

   Uso:
     LOCAL_ADMIN_KEY='id:secret' node ghost/automation/publish.mjs <fonte.json> [--only=local] [--dry-run]

   Exemplos:
     # Testar no localhost (não publica de verdade):
     LOCAL_ADMIN_KEY='id:secret' node ghost/automation/publish.mjs ghost/import/secom-import.json --only=local --dry-run
     # Publicar pra valer no localhost:
     LOCAL_ADMIN_KEY='id:secret' node ghost/automation/publish.mjs ghost/import/secom-import.json --only=local
     # Publicar nos portais de produção:
     HOJEMT_ADMIN_KEY='..' ODIAPOLITICO_ADMIN_KEY='..' node ghost/automation/publish.mjs ghost/import/secom-import.json
*/
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { avaliar } from "./filtro.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const sourcePath = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
const draftMode = args.includes("--draft");
const onlyArg = args.find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.split("=")[1] : null;

if (!sourcePath) { console.error("Informe o arquivo de conteúdo. Ex.: node publish.mjs ghost/import/secom-import.json"); process.exit(1); }

const cfgPath = resolve(__dirname, "sites.config.json");
let cfg;
try { cfg = JSON.parse(readFileSync(cfgPath, "utf8")); }
catch { console.error(`Crie ${cfgPath} a partir de sites.config.example.json.`); process.exit(1); }

const data = JSON.parse(readFileSync(resolve(sourcePath), "utf8")).db[0].data;
const tagById = new Map(data.tags.map((t) => [t.id, t]));
const tagsOf = (postId) => data.posts_tags.filter((pt) => pt.post_id === postId)
  .sort((a, b) => a.sort_order - b.sort_order).map((pt) => tagById.get(pt.tag_id)).filter(Boolean);

// Editoria = primeira tag pública (não interna) do post.
const editoriaOf = (post) => (tagsOf(post.id).find((t) => t.visibility === "public") || {}).slug || null;
const htmlOf = (post) => {
  if (post.html) return post.html;
  try { return JSON.parse(post.mobiledoc).cards[0][1].html; } catch { return ""; }
};

function jwt(key) {
  const [id, secret] = key.split(":");
  const b64 = (b) => Buffer.from(b).toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const head = b64(JSON.stringify({ alg: "HS256", typ: "JWT", kid: id }));
  const now = Math.floor(Date.now() / 1000);
  const pay = b64(JSON.stringify({ iat: now, exp: now + 300, aud: "/admin/" }));
  const sig = crypto.createHmac("sha256", Buffer.from(secret, "hex")).update(`${head}.${pay}`).digest();
  return `${head}.${pay}.${b64(sig)}`;
}

// --- Re-hospedagem de imagens ----------------------------------------------
// A foto da matéria (feature_image) vem como URL EXTERNA da fonte (gov, portais).
// Na home isso quebra muito (hotlink/Referer, http em site https, 404). Aqui a
// gente BAIXA a imagem e SOBE pro Ghost (endpoint de imagens), trocando por uma
// URL interna /content/images/… — que carrega sempre. Falhou? mantém a original
// (o tema tem placeholder). Desliga com REHOST_IMAGES=0.
const REHOST = process.env.REHOST_IMAGES !== "0";
const imgCache = new Map();   // `${site.url}\n${src}` -> url interna | null

function ehInterna(site, url) {
  if (!url) return false;
  if (/^\/content\/images\//.test(url)) return true;
  try { return new URL(url).host === new URL(site.url).host; } catch { return false; }
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
function nomeArquivo(src, ct) {
  let base = "imagem";
  try { base = (new URL(src).pathname.split("/").pop() || "imagem").replace(/[^\w.\-]+/g, "-").slice(-80); } catch {}
  if (!/\.[a-z0-9]{2,5}$/i.test(base)) {
    base += "." + ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" }[ct] || "jpg");
  }
  return base;
}
async function reHost(site, src, key) {
  if (!REHOST || !src || ehInterna(site, src)) return src || null;
  const ck = `${site.url}\n${src}`;
  if (imgCache.has(ck)) return imgCache.get(ck);
  let out = null;
  try {
    const { buf, ct } = await baixarImagem(src);
    const form = new FormData();
    form.append("file", new Blob([buf], { type: ct }), nomeArquivo(src, ct));
    form.append("purpose", "image");
    const r = await fetch(`${site.url}/ghost/api/admin/images/upload/`, {
      method: "POST", headers: { Authorization: `Ghost ${jwt(key)}` }, body: form,
    });
    if (!r.ok) throw new Error(`upload HTTP ${r.status}`);
    out = (await r.json())?.images?.[0]?.url || null;
  } catch (e) { console.log(`    · imagem não re-hospedada (${e.message}) — usa a original`); }
  imgCache.set(ck, out);
  return out;
}

async function exists(site, slug, key) {
  const r = await fetch(`${site.url}/ghost/api/admin/posts/slug/${encodeURIComponent(slug)}/?fields=id`,
    { headers: { Authorization: `Ghost ${jwt(key)}` } });
  return r.status === 200;
}

async function publish(site, post, key) {
  // Ghost limita custom_excerpt a 300 caracteres → trunca com segurança (sem a
  // IA, o resumo cru da coleta pode passar disso e derrubar o post com HTTP 422).
  const excerpt = post.custom_excerpt ? String(post.custom_excerpt).trim().slice(0, 296) : null;
  // Re-hospeda a foto no Ghost; se falhar, mantém a URL original.
  const feature = post.feature_image ? (await reHost(site, post.feature_image, key)) || post.feature_image : null;
  const body = { posts: [{
    title: post.title, slug: post.slug, html: htmlOf(post),
    custom_excerpt: excerpt, feature_image: feature,
    feature_image_caption: post.feature_image_caption || null,
    status: draftMode ? "draft" : "published", published_at: draftMode ? undefined : (post.published_at || undefined),
    tags: tagsOf(post.id).filter((t) => t.visibility === "public").map((t) => ({ name: t.name })),
  }] };
  const r = await fetch(`${site.url}/ghost/api/admin/posts/?source=html`, {
    method: "POST",
    headers: { Authorization: `Ghost ${jwt(key)}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
}

// --- Notificação opcional pro WhatsApp (webhook GENÉRICO) -------------------
// Depois de publicar uma matéria NOVA, faz POST do JSON (titulo,url,resumo,imagem,
// editoria,portal) para uma URL de gatilho — que dispara a campanha no WhatsApp.
// Serve LeTalk, WaSpeed, Zapier→qualquer um, n8n… (é só apontar a URL do gatilho da
// plataforma que você escolher). Configure WHATSAPP_WEBHOOK_URL (e WHATSAPP_TOKEN se
// o gatilho exigir). Sem a URL, é ignorado. NÃO-FATAL: falha aqui não derruba a
// publicação, e só notifica o que foi publicado de novo (dedup evita repetir).
const WA_URL = process.env.WHATSAPP_WEBHOOK_URL || process.env.LETALK_WEBHOOK_URL || "";
const WA_TOKEN = process.env.WHATSAPP_TOKEN || process.env.LETALK_TOKEN || "";
async function notifyWhatsApp(site, post, ed) {
  if (!WA_URL) return;
  const headers = { "Content-Type": "application/json" };
  if (WA_TOKEN) headers.Authorization = "Bearer " + WA_TOKEN;
  const r = await fetch(WA_URL, {
    method: "POST", headers,
    body: JSON.stringify({
      portal: site.name, site: site.url, editoria: ed || "",
      titulo: post.title, url: site.url.replace(/\/$/, "") + "/" + post.slug + "/",
      resumo: post.custom_excerpt || "", imagem: post.feature_image || "",
    }),
  });
  if (!r.ok) throw new Error("HTTP " + r.status);
}

const accepts = (site, ed) => site.editorias === "*" || (Array.isArray(site.editorias) && site.editorias.includes(ed));

// --- Filtro de qualidade (portão final) -------------------------------------
// Fora atos administrativos (decreto/portaria/edital…) e matérias com menos de
// FILTRO_MIN_PALAVRAS palavras (padrão 100) — mesmo depois da reescrita por IA.
const MIN_PUB = parseInt(process.env.FILTRO_MIN_PALAVRAS || "100", 10);
const bloqueados = new Map();
for (const p of data.posts.filter((p) => p.type === "post")) {
  const v = avaliar({ title: p.title, corpo: htmlOf(p) }, { min: MIN_PUB });
  if (!v.ok) bloqueados.set(p.id, v.motivo);
}
if (bloqueados.size) {
  console.log(`\nFiltro de qualidade: ${bloqueados.size} matéria(s) NÃO serão publicadas (administrativa ou < ${MIN_PUB} palavras):`);
  for (const p of data.posts) if (bloqueados.has(p.id)) console.log(`  ⊘ ${bloqueados.get(p.id)}: ${p.title}`);
}

let pub = 0, skip = 0, dup = 0, err = 0;
for (const site of cfg.sites) {
  if (only && site.name !== only) continue;
  const key = process.env[site.keyEnv];
  // O dry-run é offline: não exige chave nem acessa a API.
  if (!dryRun) {
    if (!key) { console.log(`• ${site.name}: sem ${site.keyEnv} no ambiente — pulando.`); continue; }
    if (!key.includes(":")) { console.log(`• ${site.name}: ${site.keyEnv} inválida (use id:secret) — pulando.`); continue; }
  }
  console.log(`\n== ${site.name} (${site.url}) — editorias: ${JSON.stringify(site.editorias)} ==`);
  for (const post of data.posts.filter((p) => p.type === "post")) {
    if (bloqueados.has(post.id)) continue;   // já listada no filtro de qualidade
    const ed = editoriaOf(post);
    if (!accepts(site, ed)) { skip++; continue; }
    if (dryRun) { console.log(`  [dry-run] publicaria [${ed}] ${post.title}`); pub++; continue; }
    try {
      if (await exists(site, post.slug, key)) { console.log(`  ~ já existe: ${post.slug}`); dup++; continue; }
      await publish(site, post, key);
      console.log(`  ✓ [${ed}] ${post.title}`); pub++;
      try { await notifyWhatsApp(site, post, ed); } catch (e) { console.log(`    · WhatsApp não notificado: ${e.message}`); }
    } catch (e) { console.log(`  ✗ ${post.slug}: ${e.message}`); err++; }
  }
}
console.log(`\nResumo: publicados=${pub} duplicados=${dup} fora-da-editoria=${skip} filtradas=${bloqueados.size} erros=${err}${dryRun ? " (dry-run)" : ""}`);
