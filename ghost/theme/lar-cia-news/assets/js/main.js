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

  /* ---- Player de vídeo em popup (lightbox) ao clicar no AO VIVO ---- */
  (function initYtLightbox() {
    function open(id) {
      var ov = document.createElement("div");
      ov.className = "yt-modal";
      ov.innerHTML =
        '<div class="yt-modal-box">' +
        '<button class="yt-close" type="button" aria-label="Fechar">×</button>' +
        '<div class="yt-frame"><iframe src="https://www.youtube.com/embed/' + id +
        '?autoplay=1&rel=0&playsinline=1" title="Ao vivo" ' +
        'allow="autoplay; encrypted-media; picture-in-picture; web-share; fullscreen" allowfullscreen></iframe></div>' +
        '<a class="yt-open" href="https://www.youtube.com/watch?v=' + id +
        '" target="_blank" rel="noopener">Se não carregar aqui, assista no YouTube ↗</a></div>';
      function close() { ov.remove(); document.removeEventListener("keydown", esc); }
      function esc(e) { if (e.key === "Escape") close(); }
      ov.addEventListener("click", function (e) {
        if (e.target === ov || e.target.classList.contains("yt-close")) close();
      });
      document.addEventListener("keydown", esc);
      document.body.appendChild(ov);
    }
    $$(".js-yt").forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("data-yt");
        if (!id) return;
        e.preventDefault();
        open(id);
      });
    });
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

  /* ---- Copa do Mundo (resultados ao vivo, com retry + fallback) ---- */
  (function initCopa() {
    var sec = $(".copa"); if (!sec) return;
    var grid = $("#copaGrid", sec);
    var api = sec.getAttribute("data-api"), canal = sec.getAttribute("data-canal");
    var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
    function fallback() { grid.innerHTML = '<a class="copa-fallback" href="' + canal + '" target="_blank" rel="noopener">▶ Acompanhe os jogos ao vivo na CazéTV</a>'; }
    function render(ev) {
      if (!ev || !ev.length) { fallback(); return; }
      grid.innerHTML = ev.slice(0, 8).map(function (e) {
        var hs = e.intHomeScore, as = e.intAwayScore;
        var sc = (hs == null || hs === "") ? '<small>' + esc(e.dateEvent || "") + (e.strTime ? " · " + String(e.strTime).slice(0, 5) : "") + '</small>' : '<b>' + esc(hs) + ' × ' + esc(as) + '</b>';
        return '<div class="match"><span class="team">' + esc(e.strHomeTeam) + '</span><span class="score">' + sc + '</span><span class="team away">' + esc(e.strAwayTeam) + '</span></div>';
      }).join("");
    }
    function load(retry) {
      if (!api) { fallback(); return; }
      fetch(api, { cache: "no-store" }).then(function (r) { return r.json(); })
        .then(function (d) { render(d.events || d.results || d.matches || []); })
        .catch(function () { if (retry > 0) setTimeout(function () { load(retry - 1); }, 4000); else fallback(); });
    }
    load(2);
    setInterval(function () { load(1); }, 90000);
  })();

  /* ---- Pesquisas eleitorais (JSON externo, com fallback) ---- */
  (function initPolls() {
    var box = $("#pollsBox"); if (!box) return;
    var url = box.parentNode.getAttribute("data-url"); if (!url) return;
    var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
    function render(list) {
      if (!list || !list.length) { box.innerHTML = '<p class="rail-empty">Sem pesquisas no momento.</p>'; return; }
      box.innerHTML = list.slice(0, 3).map(function (p) {
        var cand = (p.candidatos || []).slice(0, 5).map(function (c) {
          return '<div class="poll-row"><span class="poll-name">' + esc(c.nome) + '</span><span class="poll-pct">' + esc(c.pct) + '%</span><div class="poll-bar"><i style="width:' + (parseFloat(c.pct) || 0) + '%"></i></div></div>';
        }).join("");
        return '<div class="poll"><div class="poll-head">' + esc(p.cargo || "") + ' <small>' + esc(p.instituto || "") + ' · ' + esc(p.data || "") + '</small></div>' + cand + '</div>';
      }).join("");
    }
    fetch(url, { cache: "no-store" }).then(function (r) { return r.json(); })
      .then(function (d) { render(Array.isArray(d) ? d : (d.pesquisas || [])); })
      .catch(function () { box.innerHTML = '<p class="rail-empty">Não foi possível carregar as pesquisas.</p>'; });
  })();
})();
