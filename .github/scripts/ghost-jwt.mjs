#!/usr/bin/env node
// Gera um JWT de curta duração para a Ghost Admin API a partir de uma
// Admin API Key no formato "id:secret" (env ADMIN_KEY ou argv[2]).
// Uso: ADMIN_KEY=xxage node .github/scripts/ghost-jwt.mjs
import crypto from "node:crypto";

const key = process.env.ADMIN_KEY || process.argv[2] || "";
const [id, secret] = key.split(":");
if (!id || !secret) {
  console.error("ADMIN_KEY inválida (esperado formato id:secret)");
  process.exit(1);
}
const b64 = (o) =>
  Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const header = b64({ alg: "HS256", typ: "JWT", kid: id });
const payload = b64({ iat: now, exp: now + 300, aud: "/admin/" });
const data = `${header}.${payload}`;
const sig = crypto.createHmac("sha256", Buffer.from(secret, "hex")).update(data).digest("base64url");
process.stdout.write(`${data}.${sig}`);
