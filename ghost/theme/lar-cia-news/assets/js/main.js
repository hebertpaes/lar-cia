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

  /* ---- Rotação de banners (5s por padrão) ---- */
  (function initAdRotators() {
    $$(".ad-rotator").forEach(function (r) {
      var slides = $$(".ad-banner", r);
      if (slides.length < 2) return;
      var i = 0, iv = parseInt(r.getAttribute("data-interval"), 10) || 5000;
      setInterval(function () {
        slides[i].classList.remove("active");
        i = (i + 1) % slides.length;
        slides[i].classList.add("active");
      }, iv);
    });
  })();

  /* ---- Slider principal (autoplay + pausa/travamento) ---- */
  (function initSlider() {
    var slider = $(".hero-slider");
    if (!slider) return;
    var slides = $$(".slide", slider);
    if (slides.length < 1) return;
    var dots = $$(".slider-dot", slider), pauseBtn = $(".slider-pause", slider);
    var cur = 0, timer = null, paused = false;
    var delay = parseInt(slider.getAttribute("data-autoplay"), 10) || 6000;
    function show(i) {
      cur = (i + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle("active", k === cur); });
      dots.forEach(function (d, k) { d.classList.toggle("active", k === cur); });
    }
    function next() { show(cur + 1); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function start() { stop(); if (!paused && slides.length > 1) timer = setInterval(next, delay); }
    function setPaused(p) { paused = p; if (pauseBtn) pauseBtn.textContent = p ? "▶" : "⏸"; if (p) stop(); else start(); }
    var nb = $(".slider-arrow.next", slider), pb = $(".slider-arrow.prev", slider);
    if (nb) nb.addEventListener("click", function () { next(); start(); });
    if (pb) pb.addEventListener("click", function () { show(cur - 1); start(); });
    dots.forEach(function (d) { d.addEventListener("click", function () { show(+d.getAttribute("data-go")); start(); }); });
    if (pauseBtn) pauseBtn.addEventListener("click", function () { setPaused(!paused); });
    slider.addEventListener("mouseenter", stop);
    slider.addEventListener("mouseleave", function () { if (!paused) start(); });
    show(0); start();
  })();
})();
