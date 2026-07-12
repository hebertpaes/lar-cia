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
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { avaliar } from "./filtro.mjs";
import { jwt, reHostUrl, reHostHtml } from "./imagens.mjs";

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

// --- Re-hospedagem de imagens (foto de capa + imagens do corpo) -------------
// Baixa a imagem externa da fonte e sobe pro Ghost (/content/images), evitando
// quebra por hotlink/http/404 na home. Vale pra feature_image E pras <img> do
// corpo. Desliga com REHOST_IMAGES=0. (jwt/reHost moram em imagens.mjs)
const REHOST = process.env.REHOST_IMAGES !== "0";
const imgCache = new Map();

async function exists(site, slug, key) {
  const r = await fetch(`${site.url}/ghost/api/admin/posts/slug/${encodeURIComponent(slug)}/?fields=id`,
    { headers: { Authorization: `Ghost ${jwt(key)}` } });
  return r.status === 200;
}

async function publish(site, post, key) {
  // Ghost limita custom_excerpt a 300 caracteres → trunca com segurança (sem a
  // IA, o resumo cru da coleta pode passar disso e derrubar o post com HTTP 422).
  const excerpt = post.custom_excerpt ? String(post.custom_excerpt).trim().slice(0, 296) : null;
  // Re-hospeda a foto de capa E as imagens do corpo; se falhar, mantém o original.
  let html = htmlOf(post), feature = post.feature_image || null;
  if (REHOST) {
    if (feature) feature = (await reHostUrl(site.url, feature, key, imgCache)) || feature;
    html = (await reHostHtml(site.url, html, key, imgCache)).html;
  }
  const body = { posts: [{
    title: post.title, slug: post.slug, html,
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
