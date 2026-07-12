/* Re-hospedagem de imagens no Ghost — compartilhado por publish.mjs e
   rehospedar.mjs. Baixa a imagem EXTERNA (da fonte) e sobe pro Ghost
   (/content/images), devolvendo a URL interna que não quebra na home
   (sem hotlink/http/404). Cobre a foto de capa (feature_image) E as imagens
   INLINE do corpo do post. */
import crypto from "node:crypto";

export function jwt(key) {
  const [id, secret] = key.split(":");
  const b64 = (b) => Buffer.from(b).toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const head = b64(JSON.stringify({ alg: "HS256", typ: "JWT", kid: id }));
  const now = Math.floor(Date.now() / 1000);
  const pay = b64(JSON.stringify({ iat: now, exp: now + 300, aud: "/admin/" }));
  const sig = crypto.createHmac("sha256", Buffer.from(secret, "hex")).update(`${head}.${pay}`).digest();
  return `${head}.${pay}.${b64(sig)}`;
}

// Interna (não precisa re-hospedar): null, data:, /content/images/, ou mesmo host do site.
export function ehInterna(siteUrl, url) {
  if (!url) return true;
  if (/^data:/i.test(url)) return true;         // já embutida
  if (/^\/content\/images\//.test(url)) return true;   // caminho relativo interno
  try { return new URL(url).host === new URL(siteUrl).host; } catch { return false; }
}

async function baixar(src) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    let referer = ""; try { referer = new URL(src).origin + "/"; } catch {}
    const r = await fetch(src, {
      redirect: "follow", signal: ctrl.signal,
      headers: { "user-agent": "Mozilla/5.0 (compatible; LarCiaBot/1.0)",
        accept: "image/avif,image/webp,image/*,*/*;q=0.8", ...(referer ? { referer } : {}) },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const ct = (r.headers.get("content-type") || "").split(";")[0].trim();
    if (!/^image\//.test(ct)) throw new Error(`tipo ${ct || "?"}`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 512) throw new Error("muito pequena");
    return { buf, ct };
  } finally { clearTimeout(t); }
}

function nomeArquivo(src, ct) {
  let base = "imagem";
  try { base = (new URL(src).pathname.split("/").filter(Boolean).pop() || "imagem").replace(/[^\w.\-]+/g, "-").slice(-80); } catch {}
  if (!/\.[a-z0-9]{2,5}$/i.test(base)) {
    base += "." + ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" }[ct] || "jpg");
  }
  return base;
}

export async function uploadParaGhost(siteUrl, buf, ct, filename, key) {
  const form = new FormData();
  form.append("file", new Blob([buf], { type: ct }), filename);
  form.append("purpose", "image");
  const r = await fetch(`${siteUrl}/ghost/api/admin/images/upload/`, {
    method: "POST", headers: { Authorization: `Ghost ${jwt(key)}` }, body: form,
  });
  if (!r.ok) throw new Error(`upload HTTP ${r.status}`);
  return (await r.json())?.images?.[0]?.url || null;
}

/* Re-hospeda UMA url. Retorna a url interna, ou null (se falhar ou já for interna).
   `cache` (Map opcional) evita baixar/subir a mesma imagem duas vezes no run. */
export async function reHostUrl(siteUrl, src, key, cache) {
  if (ehInterna(siteUrl, src)) return null;
  const ck = `${siteUrl}\n${src}`;
  if (cache && cache.has(ck)) return cache.get(ck);
  let out = null;
  try { const { buf, ct } = await baixar(src); out = await uploadParaGhost(siteUrl, buf, ct, nomeArquivo(src, ct), key); }
  catch (e) { if (process.env.REHOST_DEBUG) console.log(`      · falhou ${src}: ${e.message}`); }
  if (cache) cache.set(ck, out);
  return out;
}

/* Lista as URLs de <img src> EXTERNAS de um HTML (sem baixar nada). */
export function imagensExternas(siteUrl, html) {
  const out = new Set();
  if (!html) return [];
  const re = /<img\b[^>]*\bsrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let m;
  while ((m = re.exec(html))) {
    const s = (m[2] ?? m[3] ?? m[4] ?? "").trim();
    if (s && !ehInterna(siteUrl, s)) out.add(s);
  }
  return [...out];
}

/* Re-hospeda TODAS as <img src> externas de um HTML. Devolve
   { html, trocadas, falhas }. Substitui a URL exata em todo o HTML. */
export async function reHostHtml(siteUrl, html, key, cache) {
  if (!html) return { html: html || "", trocadas: 0, falhas: 0 };
  let trocadas = 0, falhas = 0, out = html;
  for (const s of imagensExternas(siteUrl, html)) {
    const nova = await reHostUrl(siteUrl, s, key, cache);
    if (nova) { out = out.split(s).join(nova); trocadas++; } else { falhas++; }
  }
  return { html: out, trocadas, falhas };
}
