#!/usr/bin/env node
/* Disparo em LOTE, aos poucos — respeita o tier da Meta e NÃO repete.
   Cada execução envia o PRÓXIMO lote de quem ainda não recebeu (marca lastSent).
   Rode todo dia (ou agende) e a lista inteira é percorrida sem ban e sem repetir.
   Salva o progresso a cada 50 envios (à prova de queda).

   Modo OFICIAL (Cloud API) — só template APROVADO, só contatos opt-in (sem grupos).
   .env: WA_TOKEN, WA_PHONE_ID, WA_TEMPLATE, WA_LANG (ex.: pt_BR)

   Uso:
     node disparo-lote.mjs --dry-run                    # simula o próximo lote
     node disparo-lote.mjs --por-dia=200 --delay=1500   # envia ~200, 1,5s entre cada
     node disparo-lote.mjs --reenviar-apos=30           # reinclui quem recebeu há +30 dias
*/
import { load, save } from "./crm.mjs";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = resolve(__dirname, ".env");
if (existsSync(envFile)) readFileSync(envFile, "utf8").split(/\r?\n/).forEach((l) => {
  const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
});

const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split("=").slice(1).join("=") : d; };
const dry = args.includes("--dry-run");
const porDia = Math.max(1, parseInt(opt("por-dia", "200"), 10));
const delay = parseInt(opt("delay", "1500"), 10);
const reenviarApos = parseInt(opt("reenviar-apos", "0"), 10);
const template = opt("template", process.env.WA_TEMPLATE);
const lang = opt("lang", process.env.WA_LANG || "pt_BR");
const TOKEN = process.env.WA_TOKEN, PHONE = process.env.WA_PHONE_ID;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function elegivel(c) {
  if (!c.optin || c.optout) return false;   // só opt-in, respeita opt-out (LGPD)
  if (!c.lastSent) return true;              // nunca recebeu → entra na fila
  if (reenviarApos > 0) return (Date.now() - Date.parse(c.lastSent)) / 86400000 >= reenviarApos;
  return false;                              // já recebeu e sem reenvio
}

async function sendTemplate(to) {
  const url = `https://graph.facebook.com/v20.0/${PHONE}/messages`;
  const body = { messaging_product: "whatsapp", to, type: "template", template: { name: template, language: { code: lang } } };
  const r = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${(await r.text()).slice(0, 160)}`);
}

async function main() {
  const list = load();
  const optins = list.filter((c) => c.optin && !c.optout);
  const enviados = optins.filter((c) => c.lastSent).length;
  const fila = list.filter(elegivel);
  if (!fila.length) { console.log(`Fila vazia — os ${optins.length} contatos opt-in já receberam. Use --reenviar-apos=N para recomeçar.`); return; }
  if (!dry && (!TOKEN || !PHONE || !template)) { console.error("Defina WA_TOKEN, WA_PHONE_ID e WA_TEMPLATE (.env)."); process.exit(1); }

  const lote = fila.slice(0, porDia);
  console.log(`${dry ? "[DRY-RUN] " : ""}Template "${template || "(indefinido)"}" · opt-in: ${optins.length} · já enviados: ${enviados} · na fila: ${fila.length}`);
  console.log(`${dry ? "[DRY-RUN] " : ""}Enviando lote de ${lote.length} (por-dia=${porDia}, delay=${delay}ms)…`);
  let ok = 0, err = 0, i = 0;
  for (const c of lote) {
    i++;
    if (dry) { if (i <= 3) console.log("  • enviaria →", c.phone); ok++; continue; }
    try {
      await sendTemplate(c.phone); c.lastSent = new Date().toISOString(); ok++;
      if (ok % 50 === 0) { save(list); console.log("  …", ok, "enviados (progresso salvo)"); }
    } catch (e) { c.lastError = String(e.message).slice(0, 120); err++; console.log("  ✗", c.phone, e.message); }
    await sleep(delay);
  }
  if (!dry) save(list);
  const restam = Math.max(0, fila.length - ok);
  console.log(`\nResumo: enviados=${ok} erros=${err}${dry ? " (dry-run)" : ""}`);
  console.log(`Restam na fila: ${restam} → ~${Math.ceil(restam / porDia)} dia(s) a ${porDia}/dia.`);
}
main();
