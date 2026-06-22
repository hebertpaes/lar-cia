/* ===== LAR & CIA — preview app =====
   Reconstrói o comportamento documentado em architecture.md usando os dados
   do seed do Firestore (seed/firestore-seed.json). Em produção, as funções
   load*() seriam substituídas por listeners do Cloud Firestore (snapshots()). */

const WHATSAPP = "5565999887766";
const CATEGORY_META = {
  casa:            { name: "Casas",            emoji: "🏠" },
  apartamento:     { name: "Apartamentos",     emoji: "🏢" },
  praia:           { name: "Beira-mar",        emoji: "🏖️" },
  piscina:         { name: "Com piscina",      emoji: "🏊" },
  luxo:            { name: "Alto padrão",      emoji: "💎" },
  condominio:      { name: "Condomínio",       emoji: "🏘️" },
  rural:           { name: "Rural",            emoji: "🌳" },
  florais_da_mata: { name: "Florais da Mata",  emoji: "🍃" },
  sitios_chacaras: { name: "Sítios/Chácaras",  emoji: "🚜" },
  cuiaba:          { name: "Cuiabá",           emoji: "🏙️" },
  fazenda:         { name: "Fazendas",         emoji: "🐄" },
  exotico:         { name: "Exóticos",         emoji: "🌴" },
};
const PURPOSE_LABEL = { sale: "Venda", monthly: "Aluguel", daily: "Temporada", seasonal: "Temporada" };

const state = {
  properties: [],
  blog: [],
  category: "all",
  purpose: "",
  type: "",
  location: "",
  sort: "relevance",
  favorites: new Set(JSON.parse(localStorage.getItem("lc_favs") || "[]")),
};

const $ = (s) => document.querySelector(s);
const fmtBRL = (n) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
const waLink = (msg) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;

/* ---------- Theme ---------- */
function initTheme() {
  const saved = localStorage.getItem("lc_theme");
  const theme = saved || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  setTheme(theme);
  $("#themeToggle").addEventListener("click", () => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  });
}
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  localStorage.setItem("lc_theme", t);
  $("#themeToggle .theme-icon").textContent = t === "dark" ? "☀️" : "🌙";
}

/* ---------- Data loading (would be Firestore listeners in prod) ---------- */
async function loadData() {
  try {
    const res = await fetch("../seed/firestore-seed.json");
    const db = await res.json();
    state.properties = (db.properties || []).filter((p) => p.isActive);
    state.blog = db.blog_posts || [];
  } catch (e) {
    console.warn("Falha ao carregar seed, usando fallback vazio.", e);
    state.properties = [];
    state.blog = [];
  }
}

/* ---------- Categories ---------- */
function renderCategories() {
  const wrap = $("#categoryScroll");
  const cats = ["all", ...Object.keys(CATEGORY_META).filter((c) => state.properties.some((p) => p.category === c))];
  wrap.innerHTML = cats
    .map((c) => {
      const meta = c === "all" ? { name: "Todos", emoji: "✨" } : CATEGORY_META[c];
      return `<button class="cat-chip ${c === state.category ? "active" : ""}" data-cat="${c}" role="tab">
        <span class="cat-emoji">${meta.emoji}</span>${meta.name}</button>`;
    })
    .join("");
  wrap.querySelectorAll(".cat-chip").forEach((b) =>
    b.addEventListener("click", () => {
      state.category = b.dataset.cat;
      renderCategories();
      render();
    })
  );

  // Populate type select in hero search
  const typeSel = $("#searchType");
  if (typeSel.options.length <= 1) {
    Object.keys(CATEGORY_META).forEach((c) => {
      const o = document.createElement("option");
      o.value = c;
      o.textContent = CATEGORY_META[c].name;
      typeSel.appendChild(o);
    });
  }
}

/* ---------- Filtering / sorting ---------- */
function getFiltered() {
  let list = state.properties.slice();
  if (state.category !== "all") list = list.filter((p) => p.category === state.category);
  if (state.type) list = list.filter((p) => p.category === state.type);
  if (state.purpose) list = list.filter((p) => p.rentalType === state.purpose);
  if (state.location) {
    const q = state.location.toLowerCase();
    list = list.filter(
      (p) => p.location.toLowerCase().includes(q) || p.title.toLowerCase().includes(q)
    );
  }
  switch (state.sort) {
    case "price_asc": list.sort((a, b) => a.price - b.price); break;
    case "price_desc": list.sort((a, b) => b.price - a.price); break;
    case "area_desc": list.sort((a, b) => b.area - a.area); break;
    case "recent": list.sort((a, b) => b.updatedAt - a.updatedAt); break;
    default: list.sort((a, b) => b.verificationScore - a.verificationScore);
  }
  return list;
}

/* ---------- Property cards ---------- */
function priceLabel(p) {
  const suffix = p.rentalType === "sale" ? "" : p.rentalType === "daily" ? " <small>/diária</small>" : " <small>/mês</small>";
  return fmtBRL(p.price) + suffix;
}
function specIcons(p) {
  const parts = [
    `<span>🛏️ ${p.bedrooms}</span>`,
    `<span>🛁 ${p.bathrooms}</span>`,
  ];
  if (p.garages) parts.push(`<span>🚗 ${p.garages}</span>`);
  parts.push(`<span>📐 ${p.area >= 10000 ? (p.area / 10000).toLocaleString("pt-BR") + " ha" : p.area + " m²"}</span>`);
  return parts.join("");
}
function mediaHtml(p) {
  const img = p.images && p.images[0];
  const fallback = `<div class="img-fallback">${CATEGORY_META[p.category]?.emoji || "🏠"}</div>`;
  return img
    ? `<img src="${img}" alt="${p.title}" loading="lazy" onerror="this.outerHTML='${fallback.replace(/'/g, "&#39;")}'" />`
    : fallback;
}
function render() {
  const grid = $("#propertyGrid");
  const list = getFiltered();
  $("#resultCount").textContent = `${list.length} imóvel${list.length === 1 ? "" : "is"} encontrado${list.length === 1 ? "" : "s"}`;
  $("#emptyState").hidden = list.length > 0;
  grid.innerHTML = list
    .map((p) => {
      const fav = state.favorites.has(p.id);
      return `<article class="card" data-id="${p.id}">
        <div class="card-media">
          ${mediaHtml(p)}
          ${p.isVerified ? `<span class="badge-verified">✓ Verificado</span>` : ""}
          <button class="fav-btn ${fav ? "active" : ""}" data-fav="${p.id}" aria-label="Favoritar">${fav ? "❤️" : "🤍"}</button>
          <span class="badge-purpose">${PURPOSE_LABEL[p.rentalType] || ""}</span>
        </div>
        <div class="card-body">
          <div class="card-row"><h3 class="card-title">${p.title}</h3></div>
          <div class="card-loc">📍 ${p.location}</div>
          <div class="card-specs">${specIcons(p)}</div>
          <div class="card-price">${priceLabel(p)}</div>
        </div>
      </article>`;
    })
    .join("");

  grid.querySelectorAll(".card").forEach((c) =>
    c.addEventListener("click", (e) => {
      if (e.target.closest(".fav-btn")) return;
      openDetail(c.dataset.id);
    })
  );
  grid.querySelectorAll(".fav-btn").forEach((b) =>
    b.addEventListener("click", () => toggleFav(b.dataset.fav))
  );
}
function toggleFav(id) {
  state.favorites.has(id) ? state.favorites.delete(id) : state.favorites.add(id);
  localStorage.setItem("lc_favs", JSON.stringify([...state.favorites]));
  render();
}

/* ---------- Detail modal ---------- */
function openDetail(id) {
  const p = state.properties.find((x) => x.id === id);
  if (!p) return;
  const imgs = p.images || [];
  const gallery = `<div class="modal-gallery">
      <img class="g-main" src="${imgs[0] || ""}" alt="${p.title}" onerror="this.style.display='none'">
      <div class="g-side">
        <img src="${imgs[1] || imgs[0] || ""}" alt="" onerror="this.style.display='none'">
        <img src="${imgs[0] || ""}" alt="" onerror="this.style.display='none'">
      </div>
    </div>`;
  const msg = `Olá Hebert! Tenho interesse no imóvel "${p.title}" (${p.location}) — ${priceLabel(p).replace(/<[^>]+>/g, "")}. Pode me passar mais informações?`;
  $("#modalBody").innerHTML = `
    ${gallery}
    <div class="modal-content">
      <h2 id="modalTitle">${p.title}</h2>
      <div class="modal-loc">📍 ${p.location} ${p.isVerified ? "· <b style='color:var(--brand)'>✓ Verificado</b>" : ""}</div>
      <div class="modal-price">${priceLabel(p)}</div>
      <div class="modal-specs">
        <div class="spec"><b>${p.bedrooms}</b><span>Quartos</span></div>
        <div class="spec"><b>${p.suites || 0}</b><span>Suítes</span></div>
        <div class="spec"><b>${p.bathrooms}</b><span>Banheiros</span></div>
        <div class="spec"><b>${p.garages || 0}</b><span>Vagas</span></div>
        <div class="spec"><b>${p.area >= 10000 ? (p.area/10000).toLocaleString("pt-BR")+" ha" : p.area+" m²"}</b><span>Área</span></div>
        ${p.yearBuilt ? `<div class="spec"><b>${p.yearBuilt}</b><span>Ano</span></div>` : ""}
      </div>
      <p class="modal-desc">${p.description}</p>
      ${p.proximities?.length ? `<div class="modal-prox">${p.proximities.map((x) => `<span>📌 ${x}</span>`).join("")}</div>` : ""}
      <div class="modal-actions">
        <a class="btn-primary" href="${waLink(msg)}" target="_blank" rel="noopener">💬 Tenho interesse</a>
        <button class="btn-outline" onclick="window.location.href='#financiamento';document.getElementById('detailModal').hidden=true;document.getElementById('finPrice').value=${p.price};document.getElementById('financingForm').dispatchEvent(new Event('input'));">Simular financiamento</button>
      </div>
    </div>`;
  $("#detailModal").hidden = false;
  document.body.style.overflow = "hidden";
}
function closeModal() {
  $("#detailModal").hidden = true;
  document.body.style.overflow = "";
}

/* ---------- Blog ---------- */
function renderBlog() {
  const grid = $("#blogGrid");
  grid.innerHTML = state.blog
    .slice(0, 3)
    .map(
      (b) => `<article class="blog-card">
        <div class="blog-media"><img src="${b.heroImageUrl}" alt="${b.title}" loading="lazy" onerror="this.parentElement.style.background='linear-gradient(135deg,var(--brand),var(--brand-700))'"></div>
        <div class="blog-content">
          <div class="blog-tags">${(b.tags || []).slice(0, 3).map((t) => `<span class="blog-tag">#${t}</span>`).join("")}</div>
          <h3>${b.title}</h3>
          <p>${b.excerpt}</p>
        </div>
      </article>`
    )
    .join("");
}

/* ---------- Financing simulator (Tabela Price) ---------- */
function renderFinancing() {
  const price = +$("#finPrice").value || 0;
  const down = +$("#finDown").value || 0;
  const months = +$("#finMonths").value || 1;
  const annual = +$("#finRate").value || 0;
  const principal = Math.max(price - down, 0);
  const i = annual / 100 / 12;
  let pmt = 0;
  if (principal > 0) pmt = i > 0 ? (principal * i) / (1 - Math.pow(1 + i, -months)) : principal / months;
  $("#finResult").textContent = pmt > 0 ? fmtBRL(pmt) : "—";
  const msg = `Olá Hebert! Simulei um financiamento: imóvel ${fmtBRL(price)}, entrada ${fmtBRL(down)}, ${months} meses. Parcela estimada ${fmtBRL(pmt)}. Quero uma análise personalizada.`;
  $("#finWhats").href = waLink(msg);
}

/* ---------- Forms & search ---------- */
function initSearch() {
  $("#searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    state.location = $("#searchLocation").value.trim();
    state.purpose = $("#searchPurpose").value;
    state.type = $("#searchType").value;
    if (state.type) state.category = "all";
    renderCategories();
    render();
    document.getElementById("imoveis").scrollIntoView({ behavior: "smooth" });
  });
  $("#sortSelect").addEventListener("change", (e) => {
    state.sort = e.target.value;
    render();
  });
  $("#clearFilters").addEventListener("click", () => {
    state.category = "all"; state.purpose = ""; state.type = ""; state.location = "";
    $("#searchLocation").value = ""; $("#searchPurpose").value = ""; $("#searchType").value = "";
    renderCategories();
    render();
  });
}
function initLeadForm() {
  $("#leadForm").addEventListener("submit", (e) => {
    e.preventDefault();
    // Em produção: firestore.collection('leads').add({...}) — ver FIRESTORE_SCHEMA.md §5
    const lead = {
      name: $("#leadName").value,
      email: $("#leadEmail").value,
      phone: $("#leadPhone").value,
      role: $("#leadRole").value,
      intent: $("#leadIntent").value,
      wantsFinancing: $("#leadFinancing").checked,
      source: "home",
      status: "novo",
      createdAt: Date.now(),
    };
    console.log("Novo lead (demo):", lead);
    $("#leadNote").hidden = false;
    e.target.reset();
  });
}

/* ---------- WhatsApp links ---------- */
function initWhats() {
  const generic = waLink("Olá Hebert! Vim pelo site LAR & CIA e gostaria de mais informações.");
  ["#fabWhats", "#contactWhats", "#finWhats"].forEach((s) => { const el = $(s); if (el) el.href = generic; });
}

/* ---------- Boot ---------- */
async function boot() {
  initTheme();
  await loadData();
  renderCategories();
  render();
  renderBlog();
  renderFinancing();
  initSearch();
  initLeadForm();
  initWhats();

  $("#financingForm").addEventListener("input", renderFinancing);
  $("#financingForm").addEventListener("submit", (e) => e.preventDefault());
  document.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", closeModal));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
}
boot();
