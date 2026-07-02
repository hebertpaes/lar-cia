#!/usr/bin/env node
/* IMPORTAÇÃO automática (bulk) para UM site, via Ghost Admin API (/db/).
   Importa o JSON inteiro (posts + tags) de uma vez — equivale ao
   Settings → Labs → Import content, porém por linha de comando.

   Para publicar roteando por editoria em VÁRIOS portais, use publish.mjs.
   Use import.mjs quando quiser jogar tudo num site só (ex.: teste local).

   Uso:
     SITE_URL='http://localhost:2368' SITE_ADMIN_KEY='id:secret' \
       node ghost/automation/import.mjs ghost/import/secom-hoje.json

   Node 18+ (usa fetch/FormData/Blob globais). */
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const file = process.argv.slice(2).find((a) => !a.startsWith("--"));
const url = (process.env.SITE_URL || "").replace(/\/$/, "");
const key = process.env.SITE_ADMIN_KEY || "";
if (!file) { console.error("Informe o arquivo. Ex.: node import.mjs ghost/import/secom-hoje.json"); process.exit(1); }
if (!url) { console.error("Defina SITE_URL (ex.: https://hojemt.com.br)."); process.exit(1); }
if (!key.includes(":")) { console.error("Defina SITE_ADMIN_KEY no formato id:secret (Settings → Integrations)."); process.exit(1); }

function jwt(k) {
  const [id, secret] = k.split(":");
  const b64 = (b) => Buffer.from(b).toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const head = b64(JSON.stringify({ alg: "HS256", typ: "JWT", kid: id }));
  const now = Math.floor(Date.now() / 1000);
  const pay = b64(JSON.stringify({ iat: now, exp: now + 300, aud: "/admin/" }));
  const sig = crypto.createHmac("sha256", Buffer.from(secret, "hex")).update(`${head}.${pay}`).digest();
  return `${head}.${pay}.${b64(sig)}`;
}

const buf = readFileSync(resolve(file));
const data = JSON.parse(buf.toString("utf8"));
const n = data?.db?.[0]?.data?.posts?.length ?? 0;

const fd = new FormData();
fd.append("importfile", new Blob([buf], { type: "application/json" }), "import.json");

console.log(`Importando ${n} post(s) de ${file} → ${url} …`);
const r = await fetch(`${url}/ghost/api/admin/db/`, {
  method: "POST", headers: { Authorization: `Ghost ${jwt(key)}` }, body: fd,
});
const txt = await r.text();
if (!r.ok) { console.error(`✗ HTTP ${r.status}: ${txt.slice(0, 400)}`); process.exit(1); }
let problems = [];
try { problems = JSON.parse(txt)?.db?.[0]?.problems || JSON.parse(txt)?.problems || []; } catch {}
console.log(`✓ Importado. ${problems.length ? `Avisos: ${problems.length} (revise no Admin).` : "Sem avisos."}`);
