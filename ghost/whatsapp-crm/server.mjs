#!/usr/bin/env node
/* Webhook + endpoint do assistente do site.
   - POST /chat        → o chat do site (chat_ia_url) chama aqui: {message, history}
                          e recebe {reply}. Troque `responder()` pela sua IA.
   - GET  /webhook     → verificação do webhook da Cloud API (hub.challenge).
   - POST /webhook     → mensagens recebidas da Cloud API → registra no CRM.
   Uso: PORT=8787 node server.mjs   (exponha por HTTPS e use a URL + /chat) */
import http from "node:http";
import { upsert } from "./crm.mjs";

const PORT = process.env.PORT || 8787;
const VERIFY = process.env.WA_VERIFY_TOKEN || "larcia";

function responder(message) {
  // ↓ Troque por uma chamada à sua IA. Fallback simples abaixo:
  var m = String(message || "").toLowerCase();
  if (/anunci|public/.test(m)) return "Para anunciar, me passa seu WhatsApp que o comercial te chama. 👍";
  if (/assinar|assinatura/.test(m)) return "Você pode assinar grátis no botão Assinar do site. 📩";
  return "Recebi sua mensagem! Um atendente já vai te responder. Se preferir, deixe seu WhatsApp.";
}

function json(res, code, obj) { res.writeHead(code, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" }); res.end(JSON.stringify(obj)); }
function body(req) { return new Promise((r) => { let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => r(d)); }); }

http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  if (req.method === "OPTIONS") return json(res, 200, {});
  if (req.method === "GET" && u.pathname === "/webhook") {
    if (u.searchParams.get("hub.verify_token") === VERIFY) { res.writeHead(200); return res.end(u.searchParams.get("hub.challenge") || ""); }
    res.writeHead(403); return res.end("no");
  }
  if (req.method === "POST" && u.pathname === "/webhook") {
    try { var d = JSON.parse(await body(req)); var msgs = d?.entry?.[0]?.changes?.[0]?.value?.messages || []; msgs.forEach((m) => m.from && upsert(m.from, { lastSeen: new Date().toISOString() })); } catch {}
    return json(res, 200, { ok: true });
  }
  if (req.method === "POST" && u.pathname === "/chat") {
    let msg = ""; try { msg = JSON.parse(await body(req)).message; } catch {}
    return json(res, 200, { reply: responder(msg) });
  }
  json(res, 404, { error: "not found" });
}).listen(PORT, () => console.log(`WhatsApp-CRM server em http://localhost:${PORT}  (/chat, /webhook)`));
