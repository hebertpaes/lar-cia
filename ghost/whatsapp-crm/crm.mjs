#!/usr/bin/env node
/* CRM simples baseado em arquivo (contacts.json). Cada contato:
   { phone, name, tags[], optin, optout, createdAt, lastSent, lastSeen }
   Uso:
     node crm.mjs add 5565999990000 "Nome" tag1 tag2
     node crm.mjs optin  5565999990000
     node crm.mjs optout 5565999990000
     node crm.mjs list [tag]
     node crm.mjs stats */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = resolve(__dirname, "contacts.json");

export function load() { try { return JSON.parse(readFileSync(FILE, "utf8")); } catch { return []; } }
export function save(list) { writeFileSync(FILE, JSON.stringify(list, null, 2) + "\n", "utf8"); }
const onlyDigits = (p) => String(p).replace(/\D/g, "");

export function upsert(phone, patch) {
  const list = load(); const ph = onlyDigits(phone);
  let c = list.find((x) => x.phone === ph);
  if (!c) { c = { phone: ph, name: "", tags: [], optin: true, optout: false, createdAt: new Date().toISOString() }; list.push(c); }
  Object.assign(c, patch); save(list); return c;
}

function main() {
  const [cmd, ...a] = process.argv.slice(2);
  if (cmd === "add") {
    const [phone, name, ...tags] = a;
    if (!phone) return console.error("Uso: crm.mjs add <telefone> [nome] [tags...]");
    const c = upsert(phone, { name: name || "", tags });
    console.log("OK:", c.phone, c.name, c.tags.join(","));
  } else if (cmd === "optin" || cmd === "optout") {
    if (!a[0]) return console.error("Informe o telefone.");
    const c = upsert(a[0], cmd === "optin" ? { optin: true, optout: false } : { optout: true });
    console.log(cmd, "OK:", c.phone);
  } else if (cmd === "list") {
    const tag = a[0];
    load().filter((c) => !tag || (c.tags || []).includes(tag))
      .forEach((c) => console.log([c.phone, c.name, (c.tags || []).join("|"), c.optout ? "OPTOUT" : (c.optin ? "optin" : "-")].join("  ")));
  } else if (cmd === "stats") {
    const l = load();
    console.log(`total=${l.length} optin=${l.filter((c) => c.optin && !c.optout).length} optout=${l.filter((c) => c.optout).length}`);
  } else {
    console.log("Comandos: add | optin | optout | list [tag] | stats");
  }
}
if (import.meta.url === `file://${process.argv[1]}`) { if (!existsSync(FILE)) save([]); main(); }
