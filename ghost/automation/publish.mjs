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

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const sourcePath = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
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

async function exists(site, slug, key) {
  const r = await fetch(`${site.url}/ghost/api/admin/posts/slug/${encodeURIComponent(slug)}/?fields=id`,
    { headers: { Authorization: `Ghost ${jwt(key)}` } });
  return r.status === 200;
}

async function publish(site, post, key) {
  const body = { posts: [{
    title: post.title, slug: post.slug, html: htmlOf(post),
    custom_excerpt: post.custom_excerpt || null, feature_image: post.feature_image || null,
    status: "published", published_at: post.published_at || undefined,
    tags: tagsOf(post.id).filter((t) => t.visibility === "public").map((t) => ({ name: t.name })),
  }] };
  const r = await fetch(`${site.url}/ghost/api/admin/posts/?source=html`, {
    method: "POST",
    headers: { Authorization: `Ghost ${jwt(key)}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
}

const accepts = (site, ed) => site.editorias === "*" || (Array.isArray(site.editorias) && site.editorias.includes(ed));

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
    const ed = editoriaOf(post);
    if (!accepts(site, ed)) { skip++; continue; }
    if (dryRun) { console.log(`  [dry-run] publicaria [${ed}] ${post.title}`); pub++; continue; }
    try {
      if (await exists(site, post.slug, key)) { console.log(`  ~ já existe: ${post.slug}`); dup++; continue; }
      await publish(site, post, key);
      console.log(`  ✓ [${ed}] ${post.title}`); pub++;
    } catch (e) { console.log(`  ✗ ${post.slug}: ${e.message}`); err++; }
  }
}
console.log(`\nResumo: publicados=${pub} duplicados=${dup} fora-da-editoria=${skip} erros=${err}${dryRun ? " (dry-run)" : ""}`);
