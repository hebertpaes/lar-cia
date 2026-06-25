// Popular o Postgres com os imóveis do seed (../../seed/seed.json).
//   npm run db:seed      (ou: npx prisma db seed)
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const prisma = new PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));

const TYPE = {
  casa: "CASA", apartamento: "APARTAMENTO", condominio: "CONDOMINIO", luxo: "LUXO",
  fazenda: "FAZENDA", sitios_chacaras: "SITIO", comercial: "COMERCIAL", terreno: "TERRENO",
  piscina: "CASA", florais_da_mata: "CASA", praia: "CASA", rural: "SITIO",
  cuiaba: "APARTAMENTO", exotico: "CASA",
};
const PURPOSE = { sale: "SALE", monthly: "RENT", daily: "SEASON", seasonal: "SEASON" };

const slugify = (s) =>
  String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

async function main() {
  const db = JSON.parse(readFileSync(resolve(__dirname, "../../seed/seed.json"), "utf8"));
  let n = 0;
  for (const p of db.properties || []) {
    const slug = `${slugify(p.title)}-${String(p.id).replace(/\D/g, "")}`;
    const cityMatch = String(p.location || "").match(/,\s*([^,]+?)\s*-\s*[A-Z]{2}/);
    await prisma.property.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        title: p.title,
        description: p.description || "",
        type: TYPE[p.category] || "CASA",
        purpose: PURPOSE[p.rentalType] || "SALE",
        price: p.price ?? 0,
        condoFee: p.condoFee ?? null,
        bedrooms: p.bedrooms ?? 0,
        bathrooms: p.bathrooms ?? 0,
        suites: p.suites ?? 0,
        garages: p.garages ?? 0,
        area: p.area ?? 0,
        maxGuests: p.rentalType === "daily" ? (p.bedrooms || 1) * 2 + 2 : null,
        neighborhood: String(p.location || "").split(",")[0]?.trim() || null,
        city: cityMatch ? cityMatch[1] : "Cuiabá",
        state: "MT",
        latitude: p.latitude ?? null,
        longitude: p.longitude ?? null,
        isVerified: !!p.isVerified,
        amenities: p.proximities || [],
        images: { create: (p.images || []).map((url, i) => ({ url, position: i })) },
      },
    });
    n++;
  }
  console.log(`Seed: ${n} imóveis no Postgres.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
