#!/usr/bin/env node
/* Gera um JWT de curta duração para a Admin API do Ghost.
   Uso: GHOST_ADMIN_API_KEY="id:secret" node ghost-jwt.mjs
   A chave vem de: Ghost Admin → Settings → Integrations → Custom integration → Admin API Key.
   A chave NUNCA é enviada para fora da sua máquina. */
import crypto from "node:crypto";

const key = process.env.GHOST_ADMIN_API_KEY || process.argv[2] || "";
if (!key.includes(":")) {
  console.error("Chave inválida. Formato esperado: id:secret (Admin API Key).");
  process.exit(1);
}
const [id, secret] = key.split(":");
const b64url = (b) => Buffer.from(b).toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT", kid: id }));
const now = Math.floor(Date.now() / 1000);
const payload = b64url(JSON.stringify({ iat: now, exp: now + 300, aud: "/admin/" }));
const data = `${header}.${payload}`;
const sig = crypto.createHmac("sha256", Buffer.from(secret, "hex")).update(data).digest();
process.stdout.write(`${data}.${b64url(sig)}`);
