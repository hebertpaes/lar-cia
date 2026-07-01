#!/usr/bin/env node
/* Conexão via QR (whatsapp-web.js) — NÃO oficial. Bom para atendimento/envio
   pontual. ⚠️ Disparo em massa por aqui viola os Termos do WhatsApp e pode
   banir o número. Use com moderação e só com opt-in.

   Requisitos (instale à parte): npm i whatsapp-web.js qrcode-terminal
   Uso: node qr-session.mjs
        node qr-session.mjs send 5565999990000 "Olá! Mensagem de teste." */
import { upsert } from "./crm.mjs";

let Client, LocalAuth, qrcode;
try {
  ({ Client, LocalAuth } = await import("whatsapp-web.js"));
  qrcode = (await import("qrcode-terminal")).default;
} catch {
  console.error("Faltam dependências. Rode:  npm i whatsapp-web.js qrcode-terminal");
  process.exit(1);
}

const client = new Client({ authStrategy: new LocalAuth({ dataPath: "./.wwebjs_auth" }), puppeteer: { args: ["--no-sandbox"] } });

client.on("qr", (qr) => { console.log("Escaneie o QR no WhatsApp (Aparelhos conectados):\n"); qrcode.generate(qr, { small: true }); });
client.on("ready", async () => {
  console.log("✓ Conectado.");
  const send = process.argv[2] === "send" ? process.argv.slice(3) : null;
  if (send && send[0]) {
    const to = send[0].replace(/\D/g, "") + "@c.us";
    await client.sendMessage(to, send.slice(1).join(" ") || "Olá!");
    console.log("Mensagem enviada para", send[0]); process.exit(0);
  }
});
// registra quem manda mensagem no CRM (lead inbound)
client.on("message", (msg) => {
  const phone = String(msg.from).replace(/@c\.us$/, "").replace(/\D/g, "");
  if (phone) upsert(phone, { lastSeen: new Date().toISOString() });
});
client.initialize();
