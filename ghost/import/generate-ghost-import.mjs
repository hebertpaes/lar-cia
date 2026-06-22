#!/usr/bin/env node
/* Gera ghost/import/ghost-import.json a partir de seed/seed.json.
   Importe em: Ghost Admin → Settings → Labs → Import content.
   Modela imóveis como POSTS (tag interna #imovel) e o blog como POSTS (#post),
   com categorias e finalidade como TAGS públicas. */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = JSON.parse(readFileSync(resolve(__dirname, "../../seed/seed.json"), "utf8"));
const outPath = resolve(__dirname, "ghost-import.json");

const CAT = {
  casa: "Casas", apartamento: "Apartamentos", praia: "Beira-mar", piscina: "Com piscina",
  luxo: "Alto padrão", condominio: "Condomínio", rural: "Rural", florais_da_mata: "Florais da Mata",
  sitios_chacaras: "Sítios e chácaras", cuiaba: "Cuiabá", fazenda: "Fazendas", exotico: "Exóticos",
};
const FINAL = { sale: "Venda", monthly: "Aluguel", daily: "Temporada", seasonal: "Temporada" };

const brl = (n) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
const area = (a) => (a >= 10000 ? (a / 10000).toLocaleString("pt-BR") + " ha" : a + " m²");
const priceLabel = (p) => brl(p.price) + (p.rentalType === "sale" ? "" : p.rentalType === "daily" ? "/diária" : "/mês");
const iso = (ms) => new Date(ms || Date.now()).toISOString().replace(/\.\d+Z$/, ".000Z");
const slugify = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const mobiledoc = (html) => JSON.stringify({
  version: "0.3.1", atoms: [], markups: [], sections: [[10, 0]], cards: [["html", { html }]],
});

// ---- registro de tags ------------------------------------------------
const tags = [];
const tagId = new Map();
function tag(name, slug, visibility) {
  const key = slug;
  if (tagId.has(key)) return tagId.get(key);
  const id = tags.length + 1;
  tags.push({ id, name, slug, visibility });
  tagId.set(key, id);
  return id;
}
const T_IMOVEL = tag("#imovel", "hash-imovel", "internal");
const T_POST = tag("#post", "hash-post", "internal");
const T_VERIF = tag("#verificado", "hash-verificado", "internal");

const posts = [];
const posts_tags = [];
let pid = 0;
function addPost({ title, slug, type = "post", html, feature_image, custom_excerpt, published_at, tagIds = [] }) {
  const id = ++pid;
  posts.push({
    id, title, slug: slugify(slug), type, status: "published", visibility: "public",
    mobiledoc: mobiledoc(html), feature_image: feature_image || null,
    custom_excerpt: custom_excerpt || null,
    created_at: published_at, updated_at: published_at, published_at,
  });
  tagIds.forEach((tid, i) => posts_tags.push({ tag_id: tid, post_id: id, sort_order: i }));
  return id;
}

// ---- imóveis (posts #imovel) ----------------------------------------
for (const p of db.properties || []) {
  const catName = CAT[p.category] || p.category;
  const catTag = tag(catName, slugify(p.category), "public");
  const finName = FINAL[p.rentalType] || "Venda";
  const finTag = tag(finName, slugify(finName), "public");
  const tagIds = [catTag, finTag, T_IMOVEL];
  if (p.isVerified) tagIds.push(T_VERIF);

  const imgs = p.images || [];
  const gallery = imgs.length
    ? `<div class="prop-gallery"><img src="${esc(imgs[0])}" alt="${esc(p.title)}">` +
      (imgs.length > 1 ? `<div class="g-side"><img src="${esc(imgs[1])}" alt=""><img src="${esc(imgs[2] || imgs[1])}" alt=""></div>` : "") +
      `</div>` : "";
  const specs = `<div class="prop-specs">
    <div class="spec"><b>${p.bedrooms}</b><span>Quartos</span></div>
    <div class="spec"><b>${p.suites || 0}</b><span>Suítes</span></div>
    <div class="spec"><b>${p.bathrooms}</b><span>Banheiros</span></div>
    <div class="spec"><b>${p.garages || 0}</b><span>Vagas</span></div>
    <div class="spec"><b>${area(p.area)}</b><span>Área</span></div>
    ${p.yearBuilt ? `<div class="spec"><b>${p.yearBuilt}</b><span>Ano</span></div>` : ""}
  </div>`;
  const prox = (p.proximities || []).length
    ? `<div class="prop-prox">${p.proximities.map((x) => `<span>📌 ${esc(x)}</span>`).join("")}</div>` : "";
  const html = `${gallery}<div class="prop-price">${priceLabel(p)}</div>${specs}<p>${esc(p.description)}</p>${prox}`;

  const garagesTxt = p.garages ? ` 🚗 ${p.garages}` : "";
  addPost({
    title: p.title, slug: p.id, type: "post", html, feature_image: imgs[0],
    custom_excerpt: `${priceLabel(p)} · 🛏 ${p.bedrooms} 🛁 ${p.bathrooms}${garagesTxt} · ${area(p.area)} · 📍 ${p.location}`,
    published_at: iso(p.createdAt), tagIds,
  });
}

// ---- blog (posts #post) ---------------------------------------------
for (const b of db.blog_posts || []) {
  const tagIds = (b.tags || []).map((t) => tag("#" + t, slugify(t), "public"));
  tagIds.push(T_POST);
  const html = `<p>${esc(b.body || b.excerpt)}</p>`;
  addPost({
    title: b.title, slug: b.slug, type: "post", html, feature_image: b.heroImageUrl,
    custom_excerpt: b.excerpt, published_at: iso(b.publishedAt), tagIds,
  });
}

// ---- páginas: financiamento + contato -------------------------------
const financiamentoHtml = `
<p>Estimativa rápida pela Tabela Price. Depois, fale com o Hebert para uma análise personalizada com os melhores bancos.</p>
<form id="financingForm" class="financing-card" onsubmit="return false">
  <div class="field"><label for="finPrice">Valor do imóvel (R$)</label><input type="number" id="finPrice" value="500000" min="50000" step="1000"></div>
  <div class="field"><label for="finDown">Entrada (R$)</label><input type="number" id="finDown" value="100000" min="0" step="1000"></div>
  <div class="field-row">
    <div class="field"><label for="finMonths">Prazo (meses)</label><input type="number" id="finMonths" value="360" min="12" max="420" step="12"></div>
    <div class="field"><label for="finRate">Juros (% a.a.)</label><input type="number" id="finRate" value="10.5" min="1" max="20" step="0.1"></div>
  </div>
  <div class="financing-result"><span>Parcela estimada</span><strong id="finResult">—</strong></div>
  <a class="btn-primary financing-cta" id="finWhats" href="#" target="_blank" rel="noopener">Falar no WhatsApp</a>
</form>
<p class="bank-chips"><span>Caixa</span> <span>Banco do Brasil</span> <span>Itaú</span> <span>Bradesco</span> <span>Santander</span></p>`;
addPost({ title: "Financiamento", slug: "financiamento", type: "page", html: financiamentoHtml, published_at: iso(Date.now()) });

const contatoHtml = `
<p>Quer comprar, vender, alugar ou anunciar? Fale com o Hebert Paes.</p>
<ul>
  <li>📞 <a href="tel:+5565999887766">(65) 99988-7766</a></li>
  <li>💬 <a href="https://wa.me/5565999887766" target="_blank" rel="noopener">WhatsApp direto</a></li>
  <li>✉️ <a href="mailto:ciencia@msn.com">ciencia@msn.com</a></li>
  <li>📍 Cuiabá / Várzea Grande - MT</li>
</ul>
<p>Assine a newsletter no rodapé para receber novos imóveis e oportunidades. (Membros/assinaturas são nativos do Ghost — configure tiers com Stripe no Admin.)</p>`;
addPost({ title: "Contato", slug: "contato", type: "page", html: contatoHtml, published_at: iso(Date.now()) });

// ---- arquivo final ---------------------------------------------------
const out = {
  db: [{
    meta: { exported_on: Date.now(), version: "5.0.0" },
    data: { posts, tags, posts_tags },
  }],
};
writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`OK: ${outPath} — posts=${posts.length} tags=${tags.length} posts_tags=${posts_tags.length}`);
