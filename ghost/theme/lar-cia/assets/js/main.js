/* ===== LAR & CIA — tema Ghost (client-side) =====
   Comportamento que não depende de backend: tema, menu mobile, filtro do
   grid, simulador de financiamento e contadores. Os dados (imóveis, blog,
   categorias) são renderizados pelo Ghost via Handlebars no servidor. */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---- Tema claro/escuro (com ?theme= e localStorage) ---- */
  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem("lc_theme", t); } catch (e) {}
    const ic = $("#themeToggle .theme-icon");
    if (ic) ic.textContent = t === "dark" ? "☀️" : "🌙";
  }
  (function initTheme() {
    const url = new URLSearchParams(location.search).get("theme");
    let saved = null;
    try { saved = localStorage.getItem("lc_theme"); } catch (e) {}
    const theme = (url === "dark" || url === "light") ? url
      : saved || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(theme);
    const btn = $("#themeToggle");
    if (btn) btn.addEventListener("click", () =>
      setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
  })();

  /* ---- Menu mobile ---- */
  (function initNav() {
    const burger = $("#navBurger"), nav = $("#mainNav");
    if (!burger || !nav) return;
    burger.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      burger.setAttribute("aria-expanded", String(open));
    });
  })();

  /* ---- Contadores do hero ---- */
  $$(".hero-stats [data-count]").forEach((el) => {
    const target = +el.dataset.count, step = Math.max(1, Math.round(target / 40));
    let cur = 0;
    (function tick() {
      cur = Math.min(target, cur + step);
      el.textContent = cur.toLocaleString("pt-BR");
      if (cur < target) requestAnimationFrame(tick);
    })();
  });

  /* ---- Filtro client-side do grid de imóveis ---- */
  (function initFilter() {
    const grid = $("#propertyGrid");
    if (!grid) return;
    const empty = $("#emptyState"), count = $("#resultCount");
    const apply = (q) => {
      q = (q || "").trim().toLowerCase();
      let shown = 0;
      $$(".card", grid).forEach((c) => {
        const hit = !q || (c.dataset.search || "").toLowerCase().includes(q);
        c.style.display = hit ? "" : "none";
        if (hit) shown++;
      });
      if (empty) empty.hidden = shown > 0;
      if (count) count.textContent = shown + " imóveis encontrados";
    };
    const fi = $("#gridFilter"); if (fi) fi.addEventListener("input", (e) => apply(e.target.value));
    const sf = $("#searchForm"), sl = $("#searchLocation");
    if (sf && sl) sf.addEventListener("submit", (e) => { e.preventDefault(); apply(sl.value); grid.scrollIntoView({ behavior: "smooth" }); });
  })();

  /* ---- Simulador de financiamento (Tabela Price) ---- */
  (function initFinancing() {
    const form = $("#financingForm");
    if (!form) return;
    const brl = (n) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
    function calc() {
      const price = +$("#finPrice")?.value || 0, down = +$("#finDown")?.value || 0;
      const months = +$("#finMonths")?.value || 1, annual = +$("#finRate")?.value || 0;
      const principal = Math.max(price - down, 0), i = annual / 100 / 12;
      let pmt = 0;
      if (principal > 0) pmt = i > 0 ? (principal * i) / (1 - Math.pow(1 + i, -months)) : principal / months;
      const out = $("#finResult"); if (out) out.textContent = pmt > 0 ? brl(pmt) : "—";
      const wa = $("#finWhats");
      if (wa) wa.href = "https://wa.me/5565999887766?text=" +
        encodeURIComponent(`Olá Hebert! Simulei: imóvel ${brl(price)}, entrada ${brl(down)}, ${months} meses → parcela ${brl(pmt)}.`);
    }
    form.addEventListener("input", calc);
    form.addEventListener("submit", (e) => e.preventDefault());
    calc();
  })();
})();
