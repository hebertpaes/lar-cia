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

// ---- Opt-out / opt-in automático (LGPD) ---------------------------------
// Quem responder SAIR (e variações) vira optout sozinho; VOLTAR reativa.
const OPTOUT_RE = /^(sair|parar|para|cancelar|cancela|descadastrar|remover|stop|n[ãa]o quero)\b/i;
const OPTIN_RE = /^(voltar|reativar|quero receber|receber de novo|voltei)\b/i;
const WA_TOKEN = process.env.WA_TOKEN, WA_PHONE = process.env.WA_PHONE_ID;
function textoMsg(m) {
  return (m.text && m.text.body)
    || (m.button && m.button.text)
    || (m.interactive && ((m.interactive.button_reply && m.interactive.button_reply.title) || (m.interactive.list_reply && m.interactive.list_reply.title)))
    || "";
}
function sendText(to, texto) {   // free-text só vale na janela de 24h; fire-and-forget
  if (!WA_TOKEN || !WA_PHONE) return;
  fetch(`https://graph.facebook.com/v20.0/${WA_PHONE}/messages`, {
    method: "POST", headers: { Authorization: `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: texto } }),
  }).catch(() => {});
}
function processarRecebida(m) {
  if (!m.from) return;
  const txt = textoMsg(m).trim();
  if (OPTOUT_RE.test(txt)) {
    upsert(m.from, { optout: true, lastSeen: new Date().toISOString() });
    console.log("↩︎ opt-out:", m.from);
    sendText(m.from, "Pronto! Você não receberá mais nossas mensagens. Para voltar, responda VOLTAR.");
    return;
  }
  if (OPTIN_RE.test(txt)) {
    upsert(m.from, { optin: true, optout: false, lastSeen: new Date().toISOString() });
    console.log("✅ opt-in:", m.from);
    sendText(m.from, "Que bom te ter de volta! Você voltará a receber nossas notícias. ☀️");
    return;
  }
  upsert(m.from, { lastSeen: new Date().toISOString() });
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
    try { var d = JSON.parse(await body(req)); var msgs = d?.entry?.[0]?.changes?.[0]?.value?.messages || []; msgs.forEach(processarRecebida); } catch {}
    return json(res, 200, { ok: true });
  }
  if (req.method === "POST" && u.pathname === "/chat") {
    let msg = ""; try { msg = JSON.parse(await body(req)).message; } catch {}
    return json(res, 200, { reply: responder(msg) });
  }
  json(res, 404, { error: "not found" });
}).listen(PORT, () => console.log(`WhatsApp-CRM server em http://localhost:${PORT}  (/chat, /webhook)`));
