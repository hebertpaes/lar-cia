/* ===== LAR & CIA NEWS — comportamento client-side =====
   Tema claro/escuro, menu mobile, busca, relógio/data e ticker contínuo.
   Os dados (notícias, editorias, anúncios) vêm do Ghost via Handlebars. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---- Tema claro/escuro ---- */
  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem("lcn_theme", t); } catch (e) {}
    var ic = $("#themeToggle .theme-icon");
    if (ic) ic.textContent = t === "dark" ? "☀️" : "🌙";
  }
  (function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem("lcn_theme"); } catch (e) {}
    setTheme(saved || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
    var btn = $("#themeToggle");
    if (btn) btn.addEventListener("click", function () {
      setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
    });
  })();

  /* ---- Menu mobile ---- */
  (function initNav() {
    var burger = $("#navBurger"), nav = $("#mainNav");
    if (!burger || !nav) return;
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      burger.setAttribute("aria-expanded", String(open));
    });
  })();

  /* ---- Busca (drawer) ---- */
  (function initSearch() {
    var t = $("#searchToggle"), d = $("#searchDrawer"), i = $("#searchInput");
    if (!t || !d) return;
    t.addEventListener("click", function () {
      d.hidden = !d.hidden;
      if (!d.hidden && i) i.focus();
    });
  })();

  /* ---- Data no cabeçalho + relógio na faixa ---- */
  (function initClock() {
    var dEl = $("#headerDate"), cEl = $("#topClock");
    function pad(n) { return n < 10 ? "0" + n : "" + n; }
    function tick() {
      var now = new Date();
      if (dEl) dEl.textContent = now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
      if (cEl) cEl.textContent = pad(now.getHours()) + ":" + pad(now.getMinutes());
    }
    tick();
    setInterval(tick, 30000);
  })();

  /* ---- Ticker contínuo (duplica o conteúdo para loop sem corte) ---- */
  (function initTicker() {
    var track = $(".ticker-track");
    if (!track || !track.children.length) return;
    track.innerHTML = track.innerHTML + track.innerHTML;
  })();
})();
