#!/usr/bin/env node
/* LIMPEZA de matérias já publicadas que NÃO deveriam estar no ar.
   Varre os posts publicados de cada portal (Ghost Admin API), aplica o MESMO
   filtro de qualidade da automação (filtro.mjs) e remove — ou despublica — o
   que for ATO ADMINISTRATIVO (decreto, portaria, edital, licitação, "Lei nº…",
   "1969/2026 - Cidade" etc.).

   SEGURANÇA:
     • Padrão = --dry-run: só LISTA o que removeria (não altera nada).
     • Alvo padrão = administrativo. Matéria CURTA (<min palavras) só entra com
       --curtas — porque "curtinhas" editoriais são curtas de propósito.
     • --draft despublica (vira rascunho) em vez de apagar de vez.

   As chaves vêm de variáveis de ambiente (como no publish.mjs), NUNCA do repo.

   Uso:
     # Simular nos 3 portais (não altera nada):
     HOJEMT_ADMIN_KEY='id:secret' PACUNEWS_ADMIN_KEY='..' ODIAPOLITICO_ADMIN_KEY='..' \
       node ghost/automation/limpar.mjs

     # Remover de verdade (administrativo) num portal:
     HOJEMT_ADMIN_KEY='id:secret' node ghost/automation/limpar.mjs --only=hojemt --apply

     # Despublicar em vez de apagar, e incluir também as curtas (<100 palavras):
     HOJEMT_ADMIN_KEY='..' node ghost/automation/limpar.mjs --apply --draft --curtas
*/
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ehAdministrativo, avaliar } from "./filtro.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const has = (k) => args.includes(`--${k}`);
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split("=").slice(1).join("=") : d; };

const apply = has("apply");             // sem isso, é dry-run
const toDraft = has("draft");           // despublica em vez de apagar
const incluirCurtas = has("curtas");    // também remove < min palavras
const only = opt("only", null);
const min = parseInt(opt("min", process.env.FILTRO_MIN_PALAVRAS || "100"), 10);
const maxPer = parseInt(opt("max", "0"), 10); // 0 = sem limite

const cfgPath = resolve(__dirname, "sites.config.json");
let cfg;
try { cfg = JSON.parse(readFileSync(cfgPath, "utf8")); }
catch { console.error(`Crie ${cfgPath} a partir de sites.config.example.json.`); process.exit(1); }

function jwt(key) {
  const [id, secret] = key.split(":");
  const b64 = (b) => Buffer.from(b).toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const head = b64(JSON.stringify({ alg: "HS256", typ: "JWT", kid: id }));
  const now = Math.floor(Date.now() / 1000);
  const pay = b64(JSON.stringify({ iat: now, exp: now + 300, aud: "/admin/" }));
  const sig = crypto.createHmac("sha256", Buffer.from(secret, "hex")).update(`${head}.${pay}`).digest();
  return `${head}.${pay}.${b64(sig)}`;
}

// Decide se um post publicado deve sair. Retorna motivo ou null.
function motivoRemover(post) {
  const html = post.html || "";
  if (ehAdministrativo(post.title, html)) return "administrativo";
  if (incluirCurtas) {
    const v = avaliar({ title: post.title, corpo: html }, { min });
    if (!v.ok && v.motivo.startsWith("curta")) return v.motivo;
  }
  return null;
}

async function listarPublicados(site, key) {
  const out = [];
  let page = 1, pages = 1;
  do {
    const url = `${site.url}/ghost/api/admin/posts/?formats=html&limit=100&page=${page}` +
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

async function remover(site, post, key) {
  if (toDraft) {
    const r = await fetch(`${site.url}/ghost/api/admin/posts/${post.id}/`, {
      method: "PUT",
      headers: { Authorization: `Ghost ${jwt(key)}`, "Content-Type": "application/json" },
      body: JSON.stringify({ posts: [{ status: "draft", updated_at: post.updated_at }] }),
    });
    if (!r.ok) throw new Error(`despublicar HTTP ${r.status} ${(await r.text()).slice(0, 160)}`);
  } else {
    const r = await fetch(`${site.url}/ghost/api/admin/posts/${post.id}/`, {
      method: "DELETE", headers: { Authorization: `Ghost ${jwt(key)}` },
    });
    if (!r.ok && r.status !== 204) throw new Error(`apagar HTTP ${r.status} ${(await r.text()).slice(0, 160)}`);
  }
}

const acao = toDraft ? "despublicar" : "apagar";
console.log(`Limpeza — ${apply ? `MODO REAL (${acao})` : "DRY-RUN (só lista)"} · alvo: administrativo${incluirCurtas ? ` + curtas <${min}p` : ""}`);

let totalAch = 0, totalFeito = 0, totalErr = 0;
for (const site of cfg.sites) {
  if (only && site.name !== only) continue;
  if (site.name === "local" && !only) continue; // não mexe no local sem pedir
  const key = process.env[site.keyEnv];
  if (!key || !key.includes(":")) { console.log(`• ${site.name}: sem ${site.keyEnv} válida — pulando.`); continue; }

  console.log(`\n== ${site.name} (${site.url}) ==`);
  let posts;
  try { posts = await listarPublicados(site, key); }
  catch (e) { console.log(`  ✗ não listei: ${e.message}`); totalErr++; continue; }

  const alvos = [];
  for (const p of posts) { const m = motivoRemover(p); if (m) alvos.push({ p, m }); }
  const lote = maxPer > 0 ? alvos.slice(0, maxPer) : alvos;
  console.log(`  ${posts.length} publicados · ${alvos.length} para ${acao}${maxPer ? ` (limitado a ${lote.length})` : ""}`);

  for (const { p, m } of lote) {
    totalAch++;
    if (!apply) { console.log(`  [dry] ${acao} (${m}): ${p.title}`); continue; }
    try { await remover(site, p, key); console.log(`  ✓ ${acao} (${m}): ${p.title}`); totalFeito++; }
    catch (e) { console.log(`  ✗ ${p.title}: ${e.message}`); totalErr++; }
  }
}

console.log(`\nResumo: encontrados=${totalAch} ${apply ? `${acao}=${totalFeito}` : "(dry-run)"} erros=${totalErr}`);
if (!apply && totalAch) console.log(`Para executar de verdade, repita com --apply${toDraft ? " --draft" : ""}.`);
