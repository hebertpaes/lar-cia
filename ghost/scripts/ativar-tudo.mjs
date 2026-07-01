#!/usr/bin/env node
/* ATIVA TUDO num portal Ghost, de uma vez, pela Admin API.
   Roda na SUA máquina (que alcança o site). A chave nunca sai daqui.

   Faz (o que você pedir): sobe+ativa o tema, liga Membros/Portal (os popups de
   Assinar/Entrar), liga comentários, configura o menu (editorias), cria as
   páginas institucionais do rodapé (Sobre, Anuncie, Fontes oficiais, Contato —
   assim os links param de dar 404) e importa o conteúdo. Cada passo é opcional.

   Contatos das páginas (opcional): EMAIL_CONTATO e WHATSAPP preenchem os
   endereços nas páginas Sobre/Anuncie/Contato.

   Uso mínimo (liga Membros/Portal + menu + comentários):
     SITE_URL=https://hojemt.com.br SITE_ADMIN_KEY='id:secret' \
       node ghost/scripts/ativar-tudo.mjs

   Completo (sobe o tema e importa o conteúdo também):
     SITE_URL=https://hojemt.com.br SITE_ADMIN_KEY='id:secret' \
     THEME_ZIP=ghost/theme/hojemt.zip CONTENT_JSON=ghost/import/noticias-300.json \
       node ghost/scripts/ativar-tudo.mjs

   Flags: --dry-run (só mostra), --no-portal, --no-nav, --no-comments, --no-pages */
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

// Páginas institucionais que o rodapé aponta (senão dá 404). Idempotente:
// só cria a que ainda não existir. EMAIL/WHATS preenchem os contatos.
const EMAIL = process.env.EMAIL_CONTATO || "";
const WHATS = (process.env.WHATSAPP || "").replace(/\D/g, "");
const contato = () =>
  (EMAIL ? `<p>E-mail: <a href="mailto:${EMAIL}">${EMAIL}</a></p>` : "") +
  (WHATS ? `<p>WhatsApp da redação: <a href="https://wa.me/${WHATS}">+${WHATS}</a></p>` : "");
const PAGES = [
  { slug: "sobre", title: "Sobre o portal",
    html: `<p>Somos um portal de notícias com foco em Mato Grosso e no Brasil. Publicamos apuração própria e reproduzimos releases oficiais das assessorias públicas com a devida atribuição à fonte.</p><p>Nosso compromisso é com a informação de interesse público, apurada e creditada.</p>${contato()}` },
  { slug: "anuncie", title: "Anuncie conosco",
    html: `<p>Leve sua marca a milhares de leitores em Mato Grosso. Oferecemos banners (topo, meio e barra lateral), publieditoriais e conteúdo patrocinado.</p><p>Fale com o comercial que enviamos a tabela de preços e os formatos disponíveis.</p>${contato()}` },
  { slug: "fontes-oficiais", title: "Fontes oficiais",
    html: `<p>Reproduzimos, com atribuição, releases das assessorias oficiais de Mato Grosso — Governo do Estado (SECOM-MT), Assembleia Legislativa (ALMT), prefeituras e câmaras municipais — além de agências públicas nacionais (Agência Brasil, Agência Câmara, Agência Senado).</p><p>Todo release oficial é publicado com o crédito da respectiva fonte. Conteúdo de veículos privados é creditado ao veículo de origem.</p>` },
  { slug: "contato", title: "Contato / Redação",
    html: `<p>Tem uma pauta, denúncia ou sugestão? Fale com a redação.</p>${contato() || "<p>Use os canais oficiais do portal para entrar em contato com a redação.</p>"}<p>Cuiabá / Várzea Grande · MT</p>` },
];

async function ensurePages() {
  console.log("• Páginas institucionais (rodapé): sobre, anuncie, fontes-oficiais, contato");
  for (const p of PAGES) {
    let exists = false;
    try { await api(`/pages/slug/${p.slug}/?fields=id`); exists = true; } catch { exists = false; }
    if (exists) { console.log(`  · ${p.slug} — já existe (mantido)`); continue; }
    if (dry) { console.log(`  · ${p.slug} — criaria`); continue; }
    await api("/pages/?source=html", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pages: [{ title: p.title, slug: p.slug, html: p.html, status: "published" }] }),
    });
    console.log(`  ✓ ${p.slug} — criada`);
  }
}

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

  if (!has("--no-pages")) await ensurePages();

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
