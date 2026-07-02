#!/usr/bin/env node
/* Disparo OFICIAL via WhatsApp Business Cloud API (Meta).
   Envia um TEMPLATE aprovado para todos os contatos com opt-in (e sem opt-out),
   com limite de taxa e --dry-run. NÃO envia texto livre em massa (fora da janela
   de 24h a Meta só permite templates aprovados).

   .env necessário: WA_TOKEN, WA_PHONE_ID, WA_TEMPLATE, WA_LANG (ex.: pt_BR)
   Uso:
     node broadcast.mjs --dry-run
     node broadcast.mjs --template=promo_semana --limit=50 --delay=1200 */
import { load, upsert } from "./crm.mjs";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// carrega .env simples (KEY=VALUE por linha), sem dependência
const envFile = resolve(__dirname, ".env");
if (existsSync(envFile)) readFileSync(envFile, "utf8").split(/\r?\n/).forEach((l) => {
  const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
});

const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split("=").slice(1).join("=") : d; };
const dry = args.includes("--dry-run");
const template = opt("template", process.env.WA_TEMPLATE);
const lang = opt("lang", process.env.WA_LANG || "pt_BR");
const limit = parseInt(opt("limit", "0"), 10);
const delay = parseInt(opt("delay", "1000"), 10);
const TOKEN = process.env.WA_TOKEN, PHONE = process.env.WA_PHONE_ID;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function sendTemplate(to) {
  const url = `https://graph.facebook.com/v20.0/${PHONE}/messages`;
  const body = { messaging_product: "whatsapp", to, type: "template", template: { name: template, language: { code: lang } } };
  const r = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

async function main() {
  let alvos = load().filter((c) => c.optin && !c.optout);
  if (limit > 0) alvos = alvos.slice(0, limit);
  if (!alvos.length) { console.log("Nenhum contato com opt-in. Use crm.mjs add / optin."); return; }
  if (!dry && (!TOKEN || !PHONE || !template)) { console.error("Defina WA_TOKEN, WA_PHONE_ID e WA_TEMPLATE (.env)."); process.exit(1); }
  console.log(`${dry ? "[DRY-RUN] " : ""}Disparo do template "${template || "(indefinido)"}" para ${alvos.length} contato(s)…`);
  let ok = 0, err = 0;
  for (const c of alvos) {
    if (dry) { console.log("  • enviaria →", c.phone, c.name || ""); ok++; continue; }
    try { await sendTemplate(c.phone); upsert(c.phone, { lastSent: new Date().toISOString() }); console.log("  ✓", c.phone); ok++; }
    catch (e) { console.log("  ✗", c.phone, e.message); err++; }
    await sleep(delay);   // respeita limite de taxa da API
  }
  console.log(`\nResumo: enviados=${ok} erros=${err}${dry ? " (dry-run)" : ""}`);
}
main();
