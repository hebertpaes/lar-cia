// =====================================================================
// LAR & CIA — API REST (Node/Express + MySQL)
// Entrega os dados no mesmo formato (camelCase) que o frontend consome.
// =====================================================================
import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import { randomUUID } from "node:crypto";

const {
  DB_HOST = "127.0.0.1",
  DB_PORT = "3306",
  DB_USER = "lar_cia",
  DB_PASSWORD = "lar_cia",
  DB_NAME = "lar_cia",
  PORT = "3001",
  CORS_ORIGIN = "*",
} = process.env;

const pool = mysql.createPool({
  host: DB_HOST,
  port: +DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
});

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

const ms = (d) => (d ? new Date(d).getTime() : null);
const num = (v) => (v === null || v === undefined ? null : Number(v));

function mapProperty(r, images = [], proximities = []) {
  return {
    id: r.id, title: r.title, location: r.location, price: num(r.price),
    bedrooms: r.bedrooms, bathrooms: r.bathrooms, garages: r.garages, suites: r.suites,
    category: r.category, description: r.description, area: num(r.area),
    rentalType: r.rental_type, isActive: !!r.is_active,
    yearBuilt: r.year_built, condoFee: num(r.condo_fee),
    latitude: num(r.latitude), longitude: num(r.longitude),
    isVerified: !!r.is_verified, verificationScore: num(r.verification_score),
    verifiedBy: r.verified_by, createdAt: ms(r.created_at), updatedAt: ms(r.updated_at),
    images, proximities,
  };
}

// ---- Properties -----------------------------------------------------
app.get("/api/properties", async (req, res, next) => {
  try {
    const { category, rentalType, q: search } = req.query;
    const where = ["is_active = 1"];
    const params = {};
    if (category) { where.push("category = :category"); params.category = category; }
    if (rentalType) { where.push("rental_type = :rentalType"); params.rentalType = rentalType; }
    if (search) { where.push("(title LIKE :s OR location LIKE :s)"); params.s = `%${search}%`; }

    const [rows] = await pool.query(
      `SELECT * FROM properties WHERE ${where.join(" AND ")} ORDER BY updated_at DESC LIMIT 200`,
      params
    );
    if (rows.length === 0) return res.json([]);

    const ids = rows.map((r) => r.id);
    const [imgs] = await pool.query(
      "SELECT property_id, url FROM property_images WHERE property_id IN (?) ORDER BY position", [ids]
    );
    const [prox] = await pool.query(
      "SELECT property_id, label FROM property_proximities WHERE property_id IN (?)", [ids]
    );
    const byImg = {}, byProx = {};
    imgs.forEach((i) => (byImg[i.property_id] ||= []).push(i.url));
    prox.forEach((p) => (byProx[p.property_id] ||= []).push(p.label));

    res.json(rows.map((r) => mapProperty(r, byImg[r.id] || [], byProx[r.id] || [])));
  } catch (e) { next(e); }
});

app.get("/api/properties/:id", async (req, res, next) => {
  try {
    const [[row]] = await pool.query("SELECT * FROM properties WHERE id = :id", { id: req.params.id });
    if (!row) return res.status(404).json({ error: "not_found" });
    const [imgs] = await pool.query(
      "SELECT url FROM property_images WHERE property_id = :id ORDER BY position", { id: row.id });
    const [prox] = await pool.query(
      "SELECT label FROM property_proximities WHERE property_id = :id", { id: row.id });
    res.json(mapProperty(row, imgs.map((i) => i.url), prox.map((p) => p.label)));
  } catch (e) { next(e); }
});

// ---- Blog -----------------------------------------------------------
app.get("/api/blog", async (_req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM blog_posts ORDER BY published_at DESC LIMIT 50");
    const [tags] = await pool.query("SELECT post_id, tag FROM blog_post_tags");
    const byTag = {};
    tags.forEach((t) => (byTag[t.post_id] ||= []).push(t.tag));
    res.json(rows.map((b) => ({
      id: b.id, slug: b.slug, title: b.title, subtitle: b.subtitle, excerpt: b.excerpt,
      body: b.body, heroImageUrl: b.hero_image_url, authorName: b.author_name,
      isFeatured: !!b.is_featured, priority: b.priority,
      publishedAt: ms(b.published_at), updatedAt: ms(b.updated_at), tags: byTag[b.id] || [],
    })));
  } catch (e) { next(e); }
});

// ---- Reviews --------------------------------------------------------
app.get("/api/reviews", async (_req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM property_reviews ORDER BY created_at DESC LIMIT 100");
    res.json(rows.map((r) => ({
      id: r.id, propertyId: r.property_id, authorName: r.author_name,
      rating: r.rating, comment: r.comment, createdAt: ms(r.created_at),
    })));
  } catch (e) { next(e); }
});

// ---- Leads (create) -------------------------------------------------
app.post("/api/leads", async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.name || !b.email) return res.status(400).json({ error: "name_email_required" });
    const id = randomUUID();
    await pool.query(
      `INSERT INTO leads (id,name,email,phone,role,intent,source,wants_financing,status)
       VALUES (:id,:name,:email,:phone,:role,:intent,:source,:wf,'novo')`,
      { id, name: b.name, email: b.email, phone: b.phone || null,
        role: b.role || "cliente", intent: b.intent || null, source: b.source || "home",
        wf: b.wantsFinancing ? 1 : 0 }
    );
    res.status(201).json({ id });
  } catch (e) { next(e); }
});

// ---- Schedule events (create) --------------------------------------
app.post("/api/schedule", async (req, res, next) => {
  try {
    const b = req.body || {};
    const id = randomUUID();
    const start = b.start ? new Date(b.start) : new Date();
    await pool.query(
      `INSERT INTO schedule_events
       (id,title,start_at,agent_email,client_name,client_email,client_phone,property_id,property_title,mode,status)
       VALUES (:id,:title,:start,:agent,:cname,:cemail,:cphone,:pid,:ptitle,:mode,'pending')`,
      { id, title: b.title || "Visita", start, agent: b.agentEmail || "ciencia@msn.com",
        cname: b.clientName || null, cemail: b.clientEmail || null, cphone: b.clientPhone || null,
        pid: b.propertyId || null, ptitle: b.propertyTitle || null, mode: b.mode || "presencial" }
    );
    res.status(201).json({ id });
  } catch (e) { next(e); }
});

// ---- Health + errors ------------------------------------------------
app.get("/api/health", async (_req, res) => {
  try { await pool.query("SELECT 1"); res.json({ status: "ok", db: "up" }); }
  catch { res.status(503).json({ status: "degraded", db: "down" }); }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "internal_error" });
});

app.listen(+PORT, () => console.log(`LAR & CIA API on :${PORT} (db ${DB_HOST}:${DB_PORT}/${DB_NAME})`));
