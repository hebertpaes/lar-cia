#!/usr/bin/env node
/* Gera backend/db/seed.sql a partir de seed/firestore-seed.json.
   Uso:  node backend/db/generate-seed.mjs
   Mantém os dados do preview e do MySQL como uma única fonte de verdade. */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const seedPath = resolve(__dirname, "../../seed/firestore-seed.json");
const outPath = resolve(__dirname, "seed.sql");
const db = JSON.parse(readFileSync(seedPath, "utf8"));

const q = (v) => {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "1" : "0";
  return "'" + String(v).replace(/\\/g, "\\\\").replace(/'/g, "''") + "'";
};
const dt = (ms) =>
  ms === null || ms === undefined ? "NULL" : "'" + new Date(ms).toISOString().slice(0, 19).replace("T", " ") + "'";

const out = [];
out.push("-- Gerado por generate-seed.mjs — NÃO editar à mão.");
out.push("USE lar_cia;");
out.push("SET FOREIGN_KEY_CHECKS = 0;");
out.push(
  ...["financing_documents","financing_applications","schedule_events","property_reviews","favorites",
      "property_proximities","property_images","blog_post_tags","blog_posts","leads",
      "newsletter_subscriptions","properties","categories","users"].map((t) => `TRUNCATE TABLE ${t};`)
);
out.push("SET FOREIGN_KEY_CHECKS = 1;\n");

// categories
for (const [i, c] of (db.categories || []).entries()) {
  out.push(`INSERT INTO categories (id,name,icon,sort_order) VALUES (${q(c.id)},${q(c.name)},${q(c.icon)},${i});`);
}
out.push("");

// users
for (const u of db.users || []) {
  const p = u.permissions || {};
  out.push(
    "INSERT INTO users (id,name,email,avatar_url,is_admin,approved,access_level," +
      "perm_manage_sites,perm_manage_panels,perm_approve_users,perm_manage_ads,perm_manage_financing," +
      "preferred_category,phone_number,whatsapp_opt_in,credit_analysis_consent,data_sharing_consent) VALUES (" +
      [q(u.id),q(u.name),q(u.email),q(u.avatarUrl),u.isAdmin,u.approved,u.accessLevel ?? 0,
       !!p.manageSites,!!p.managePanels,!!p.approveUsers,!!p.manageAds,!!p.manageFinancing,
       q(u.preferredCategory),q(u.phoneNumber),!!u.whatsappOptIn,!!u.creditAnalysisConsent,!!u.dataSharingConsent]
        .map((v) => (typeof v === "boolean" ? (v ? "1" : "0") : v)).join(",") +
      ");"
  );
}
out.push("");

// properties (+ images, proximities)
for (const pr of db.properties || []) {
  out.push(
    "INSERT INTO properties (id,title,location,price,bedrooms,bathrooms,garages,suites,category,description," +
      "area,rental_type,is_active,year_built,condo_fee,latitude,longitude,is_verified,verification_score," +
      "verified_by,created_at,updated_at) VALUES (" +
      [q(pr.id),q(pr.title),q(pr.location),pr.price ?? 0,pr.bedrooms ?? 0,pr.bathrooms ?? 0,
       pr.garages ?? "NULL",pr.suites ?? "NULL",q(pr.category),q(pr.description),pr.area ?? 0,
       q(pr.rentalType || "sale"),pr.isActive ? 1 : 0,pr.yearBuilt ?? "NULL",pr.condoFee ?? "NULL",
       pr.latitude ?? "NULL",pr.longitude ?? "NULL",pr.isVerified ? 1 : 0,pr.verificationScore ?? 0,
       q(pr.verifiedBy || ""),dt(pr.createdAt),dt(pr.updatedAt)].join(",") +
      ");"
  );
  (pr.images || []).forEach((url, i) =>
    out.push(`INSERT INTO property_images (property_id,url,position) VALUES (${q(pr.id)},${q(url)},${i});`)
  );
  (pr.proximities || []).forEach((label) =>
    out.push(`INSERT INTO property_proximities (property_id,label) VALUES (${q(pr.id)},${q(label)});`)
  );
}
out.push("");

// blog_posts (+ tags)
for (const b of db.blog_posts || []) {
  out.push(
    "INSERT INTO blog_posts (id,slug,title,subtitle,excerpt,body,hero_image_url,author_name," +
      "is_featured,priority,published_at,updated_at) VALUES (" +
      [q(b.id),q(b.slug),q(b.title),q(b.subtitle),q(b.excerpt),q(b.body),q(b.heroImageUrl),q(b.authorName),
       b.isFeatured ? 1 : 0,b.priority ?? 0,dt(b.publishedAt),dt(b.updatedAt)].join(",") +
      ");"
  );
  (b.tags || []).forEach((tag) =>
    out.push(`INSERT INTO blog_post_tags (post_id,tag) VALUES (${q(b.id)},${q(tag)});`)
  );
}
out.push("");

// property_reviews
for (const r of db.property_reviews || []) {
  out.push(
    "INSERT INTO property_reviews (id,property_id,author_name,rating,comment,created_at) VALUES (" +
      [q(r.id),q(r.propertyId),q(r.authorName),r.rating ?? 5,q(r.comment),dt(r.createdAt)].join(",") +
      ");"
  );
}

writeFileSync(outPath, out.join("\n") + "\n", "utf8");
console.log(`OK: ${outPath} (${out.length} linhas)`);
