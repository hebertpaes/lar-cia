#!/usr/bin/env node
/* ATIVA TUDO num portal Ghost, de uma vez, pela Admin API.
   Roda na SUA máquina (que alcança o site). A chave nunca sai daqui.

   Faz (o que você pedir): sobe+ativa o tema, liga Membros/Portal (os popups de
   Assinar/Entrar), liga comentários, configura o menu (editorias) e importa o
   conteúdo. Cada passo é opcional por variável de ambiente.

   Uso mínimo (liga Membros/Portal + menu + comentários):
     SITE_URL=https://hojemt.com.br SITE_ADMIN_KEY='id:secret' \
       node ghost/scripts/ativar-tudo.mjs

   Completo (sobe o tema e importa o conteúdo também):
     SITE_URL=https://hojemt.com.br SITE_ADMIN_KEY='id:secret' \
     THEME_ZIP=ghost/theme/hojemt.zip CONTENT_JSON=ghost/import/noticias-300.json \
       node ghost/scripts/ativar-tudo.mjs

   Flags: --dry-run (só mostra), --no-portal, --no-nav, --no-comments */
import crypto from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { basename } from "node:path";

const URL_ = (process.env.SITE_URL || "").replace(/\/$/, "");
const KEY = process.env.SITE_ADMIN_KEY || "";
const THEME_ZIP = process.env.THEME_ZIP || "";
const CONTENT_JSON = process.env.CONTENT_JSON || "";
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const dry = has("--dry-run");
if (!URL_ || !KEY.includes(":")) { console.error("Defina SITE_URL e SITE_ADMIN_KEY='id:secret'."); process.exit(1); }

function jwt() {
  const [id, secret] = KEY.split(":");
  const b = (x) => Buffer.from(x).toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const h = b(JSON.stringify({ alg: "HS256", typ: "JWT", kid: id }));
  const now = Math.floor(Date.now() / 1000);
  const p = b(JSON.stringify({ iat: now, exp: now + 300, aud: "/admin/" }));
  const s = crypto.createHmac("sha256", Buffer.from(secret, "hex")).update(`${h}.${p}`).digest();
  return `${h}.${p}.${b(s)}`;
}
const H = () => ({ Authorization: `Ghost ${jwt()}`, "Accept-Version": "v5.0" });
async function api(path, opt = {}) {
  const r = await fetch(`${URL_}/ghost/api/admin${path}`, { ...opt, headers: { ...H(), ...(opt.headers || {}) } });
  const t = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status} ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : {};
}

const NAV = [
  { label: "Política", url: "/tag/politica/" }, { label: "Cidades", url: "/tag/cidades/" },
  { label: "Polícia", url: "/tag/policia/" }, { label: "Economia", url: "/tag/economia/" },
  { label: "Agro", url: "/tag/agro/" }, { label: "Brasil & Mundo", url: "/tag/brasil-mundo/" },
  { label: "Esportes", url: "/tag/esportes/" }, { label: "Internacional", url: "/tag/internacional/" },
];
const NAV2 = [
  { label: "SECOM-MT", url: "https://www.secom.mt.gov.br" }, { label: "ALMT", url: "https://www.al.mt.gov.br" },
  { label: "Agência Brasil", url: "https://agenciabrasil.ebc.com.br" },
];

async function main() {
  console.log(`${dry ? "[DRY-RUN] " : ""}Ativando tudo em ${URL_} …`);

  if (THEME_ZIP) {
    if (!existsSync(THEME_ZIP)) throw new Error(`Tema não encontrado: ${THEME_ZIP}`);
    console.log("• Tema: subir + ativar", THEME_ZIP);
    if (!dry) {
      const fd = new FormData();
      fd.append("file", new Blob([readFileSync(THEME_ZIP)], { type: "application/zip" }), basename(THEME_ZIP));
      const up = await api("/themes/upload/", { method: "POST", body: fd });
      const name = up?.themes?.[0]?.name;
      if (name) { await api(`/themes/${name}/activate/`, { method: "PUT" }); console.log("  ✓ ativo:", name); }
    }
  }

  const settings = [];
  if (!has("--no-portal")) settings.push({ key: "members_signup_access", value: "all" }, { key: "portal_button", value: false }, { key: "portal_name", value: true });
  if (!has("--no-comments")) settings.push({ key: "comments_enabled", value: "all" });
  if (!has("--no-nav")) settings.push({ key: "navigation", value: JSON.stringify(NAV) }, { key: "secondary_navigation", value: JSON.stringify(NAV2) });
  if (settings.length) {
    console.log("• Configurações:", settings.map((s) => s.key).join(", "));
    if (!dry) { await api("/settings/", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settings }) }); console.log("  ✓ salvo (Membros/Portal, comentários e menu)"); }
  }

  if (CONTENT_JSON) {
    if (!existsSync(CONTENT_JSON)) throw new Error(`Conteúdo não encontrado: ${CONTENT_JSON}`);
    const n = JSON.parse(readFileSync(CONTENT_JSON, "utf8"))?.db?.[0]?.data?.posts?.length ?? 0;
    console.log(`• Conteúdo: importar ${n} post(s)`);
    if (!dry) {
      const fd = new FormData();
      fd.append("importfile", new Blob([readFileSync(CONTENT_JSON)], { type: "application/json" }), "import.json");
      await api("/db/", { method: "POST", body: fd }); console.log("  ✓ importado");
    }
  }

  console.log(`\n${dry ? "(dry-run — nada foi alterado)" : "Pronto! Recarregue o site."}`);
}
main().catch((e) => { console.error("Falhou:", e.message); process.exit(1); });
