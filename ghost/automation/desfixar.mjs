#!/usr/bin/env node
/* DESFIXAR matérias antigas da CAPA (slider de destaques).
   O slider mostra as FIXADAS (Featured) no topo. Se o seed demo antigo ficou
   fixado, ele "prende" a capa. Este script tira o Featured das matérias fixadas
   mais velhas que N dias (padrão 2) — deixando a capa voltar a mostrar a notícia
   real mais recente (com a foto real da fonte).

   SEGURANÇA:
     • Padrão = --dry-run: só LISTA o que desfixaria (não altera nada).
     • Só mexe em FIXADAS antigas (> --dias). Um destaque recente é preservado.
     • Não apaga nada — apenas troca featured:true → featured:false.

   As chaves vêm de variáveis de ambiente (como no publish.mjs), NUNCA do repo.

   Uso:
     # Simular nos 3 portais:
     HOJEMT_ADMIN_KEY='id:secret' PACUNEWS_ADMIN_KEY='..' ODIAPOLITICO_ADMIN_KEY='..' \
       node ghost/automation/desfixar.mjs
     # Desfixar de verdade só num portal, fixadas com mais de 2 dias:
     HOJEMT_ADMIN_KEY='id:secret' node ghost/automation/desfixar.mjs --only=hojemt --apply
     # Desfixar TODAS as fixadas (ignora a idade):
     HOJEMT_ADMIN_KEY='id:secret' node ghost/automation/desfixar.mjs --apply --todos
*/
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const has = (k) => args.includes(`--${k}`);
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split("=").slice(1).join("=") : d; };

const apply = has("apply");        // sem isso, é dry-run
const todos = has("todos");        // ignora a idade (desfixa todas)
const only = opt("only", null);
const diasParsed = parseInt(opt("dias", "2"), 10);
const dias = Number.isNaN(diasParsed) ? 2 : diasParsed;

const cfgPath = resolve(__dirname, "sites.config.json");
let cfg;
try { cfg = JSON.parse(readFileSync(cfgPath, "utf8")); }
catch (e) { console.error(`Erro ao carregar ${cfgPath}: ${e.message}\nCrie-o a partir de sites.config.example.json e confira se o JSON é válido.`); process.exit(1); }

function jwt(key) {
  const [id, secret] = key.split(":");
  const b64 = (b) => Buffer.from(b).toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const head = b64(JSON.stringify({ alg: "HS256", typ: "JWT", kid: id }));
  const now = Math.floor(Date.now() / 1000) - 10;   // -10s: tolera clock drift (evita 401)
  const pay = b64(JSON.stringify({ iat: now, exp: now + 300, aud: "/admin/" }));
  const sig = crypto.createHmac("sha256", Buffer.from(secret, "hex")).update(`${head}.${pay}`).digest();
  return `${head}.${pay}.${b64(sig)}`;
}

const limite = Date.now() - dias * 24 * 60 * 60 * 1000;

async function listarFixados(site, token) {
  const out = [];
  let page = 1, pages = 1;
  do {
    const url = `${site.url}/ghost/api/admin/posts/?limit=100&page=${page}` +
      `&filter=${encodeURIComponent("featured:true")}`;
    const r = await fetch(url, { headers: { Authorization: `Ghost ${token}` } });
    if (!r.ok) throw new Error(`listar HTTP ${r.status} ${(await r.text()).slice(0, 160)}`);
    const j = await r.json();
    out.push(...(j.posts || []));
    pages = j.meta?.pagination?.pages || 1;
    page++;
  } while (page <= pages);
  return out;
}

async function desfixar(site, post, token) {
  const r = await fetch(`${site.url}/ghost/api/admin/posts/${post.id}/`, {
    method: "PUT",
    headers: { Authorization: `Ghost ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ posts: [{ featured: false, updated_at: post.updated_at }] }),
  });
  if (!r.ok) throw new Error(`desfixar HTTP ${r.status} ${(await r.text()).slice(0, 160)}`);
}

console.log(`Desfixar — ${apply ? "MODO REAL" : "DRY-RUN (só lista)"} · alvo: fixadas ${todos ? "(todas)" : `com mais de ${dias} dia(s)`}`);

let ach = 0, feito = 0, err = 0;
for (const site of cfg.sites) {
  if (only && site.name !== only) continue;
  if (site.name === "local" && !only) continue; // não mexe no local sem pedir
  site.url = String(site.url).replace(/\/$/, ""); // normaliza: sem barra final (evita //ghost/api)
  const key = process.env[site.keyEnv];
  if (!key || !key.includes(":")) { console.log(`• ${site.name}: sem ${site.keyEnv} válida — pulando.`); continue; }
  const token = jwt(key);   // 1 token por site (vale 5 min) — evita recomputar HMAC por requisição

  console.log(`\n== ${site.name} (${site.url}) ==`);
  let fixados;
  try { fixados = await listarFixados(site, token); }
  catch (e) { console.log(`  ✗ não listei: ${e.message}`); err++; continue; }

  const alvos = fixados.filter((p) => todos || (Date.parse(p.published_at || p.updated_at) < limite));
  console.log(`  ${fixados.length} fixada(s) · ${alvos.length} para desfixar`);
  for (const p of alvos) {
    ach++;
    if (!apply) { console.log(`  [dry] desfixar: ${p.title}`); continue; }
    try { await desfixar(site, p, token); console.log(`  ✓ desfixada: ${p.title}`); feito++; }
    catch (e) { console.log(`  ✗ ${p.title}: ${e.message}`); err++; }
  }
}

console.log(`\nResumo: encontradas=${ach} ${apply ? `desfixadas=${feito}` : "(dry-run)"} erros=${err}`);
if (!apply && ach) console.log(`Para executar de verdade, repita com --apply.`);
