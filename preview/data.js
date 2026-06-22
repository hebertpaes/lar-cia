/* ===== LAR & CIA — camada de dados (web-first, rumo a produção) =====
 *
 * Abstrai a origem dos dados. Se o Firebase Web SDK estiver disponível e
 * configurado (FIREBASE_ENABLED = true + firebaseConfig real), lê do Cloud
 * Firestore em tempo real. Caso contrário, faz fallback para o seed local
 * (seed/firestore-seed.json) — assim o preview funciona offline.
 *
 * PARA PRODUÇÃO:
 *   1. Preencha firebaseConfig com as chaves do projeto hebert-paes-platform
 *      (Firebase Console → Configurações do projeto → Apps Web).
 *   2. Mude FIREBASE_ENABLED para true.
 *   3. Inclua os SDKs no index.html (já comentados lá).
 */

// Origem dos dados — ordem de preferência: API MySQL → Firebase → seed local.
const USE_API = false;                          // ← true para usar o backend MySQL
const API_BASE = "http://localhost:3001/api";   // backend/server.js

const FIREBASE_ENABLED = false; // ← true em produção (alternativa ao MySQL)

const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "hebert-paes-platform.firebaseapp.com",
  projectId: "hebert-paes-platform",
  storageBucket: "hebert-paes-platform.appspot.com",
  messagingSenderId: "43305824333",
  appId: "1:43305824333:web:1d1787e4ca894c56bb6c04",
};

const Repository = {
  _seedCache: null,

  async _seed() {
    if (!this._seedCache) {
      const res = await fetch("../seed/firestore-seed.json");
      this._seedCache = await res.json();
    }
    return this._seedCache;
  },

  async _api(path, opts) {
    const res = await fetch(API_BASE + path, opts);
    if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
    return res.json();
  },

  // Em produção (FIREBASE_ENABLED): troca por
  //   onSnapshot(query(collection(db,'properties'), where('isActive','==',true), orderBy('updatedAt','desc')))
  async getProperties() {
    if (USE_API) return this._api("/properties");
    if (FIREBASE_ENABLED && window.__db) {
      const { collection, query, where, orderBy, getDocs } = window.__fs;
      const q = query(
        collection(window.__db, "properties"),
        where("isActive", "==", true),
        orderBy("updatedAt", "desc")
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
    return (await this._seed()).properties.filter((p) => p.isActive);
  },

  async getBlogPosts() {
    if (USE_API) return this._api("/blog");
    if (FIREBASE_ENABLED && window.__db) {
      const { collection, query, orderBy, getDocs } = window.__fs;
      const snap = await getDocs(query(collection(window.__db, "blog_posts"), orderBy("publishedAt", "desc")));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
    return (await this._seed()).blog_posts || [];
  },

  async getReviews() {
    if (USE_API) return this._api("/reviews");
    if (FIREBASE_ENABLED && window.__db) {
      const { collection, getDocs } = window.__fs;
      const snap = await getDocs(collection(window.__db, "property_reviews"));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
    return (await this._seed()).property_reviews || [];
  },

  // Em produção: addDoc(collection(db,'leads'), lead)
  async createLead(lead) {
    if (USE_API) return this._api("/leads", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lead),
    });
    if (FIREBASE_ENABLED && window.__db) {
      const { collection, addDoc } = window.__fs;
      return addDoc(collection(window.__db, "leads"), lead);
    }
    console.log("[demo] lead gravado localmente:", lead);
    return Promise.resolve({ id: "demo_" + Date.now() });
  },

  // Em produção: addDoc(collection(db,'schedule_events'), event)
  async createScheduleEvent(event) {
    if (USE_API) return this._api("/schedule", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(event),
    });
    if (FIREBASE_ENABLED && window.__db) {
      const { collection, addDoc } = window.__fs;
      return addDoc(collection(window.__db, "schedule_events"), event);
    }
    console.log("[demo] visita agendada localmente:", event);
    return Promise.resolve({ id: "demo_" + Date.now() });
  },
};

window.Repository = Repository;
