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

  /* ---- Copa do Mundo: resultados + próximos jogos + tabela (retry + fallback) ---- */
  (function initCopa() {
    var sec = $(".copa"); if (!sec) return;
    var body = $("#copaBody", sec);
    var apiPast = sec.getAttribute("data-api"), apiNext = sec.getAttribute("data-next"),
        apiTab = sec.getAttribute("data-tabela"), canal = sec.getAttribute("data-canal");
    var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
    var fbHtml = '<a class="copa-fallback" href="' + canal + '" target="_blank" rel="noopener">▶ Acompanhe os jogos ao vivo na CazéTV</a>';
    function fallback() { body.innerHTML = fbHtml; }

    function fmtData(e) {
      var d = e.dateEvent ? String(e.dateEvent).split("-") : null;
      var data = d && d.length === 3 ? d[2] + "/" + d[1] : (e.dateEvent || "");
      var hora = e.strTime ? String(e.strTime).slice(0, 5) : "";
      return [data, hora].filter(Boolean).join(" · ");
    }
    function local(e) { return [e.strVenue, e.strCity, e.strCountry].filter(Boolean).join(", "); }
    function fase(e) {
      var r = e.strRound != null ? String(e.strRound).trim() : "";
      var g = e.strGroup ? String(e.strGroup).trim() : "";
      if (g) return "Grupo " + g.replace(/^group\s*/i, "");
      if (!r) return "Copa do Mundo";
      if (/^\d+$/.test(r)) return "Fase de grupos · Rodada " + r;
      return r;
    }
    function status(e) {
      var st = String(e.strStatus || "").toLowerCase();
      var hasScore = e.intHomeScore != null && e.intHomeScore !== "";
      if (/1h|2h|ht|live|et|in play|playing/.test(st)) return { cls: "live", txt: "AO VIVO" };
      if (hasScore || /ft|aet|pen|finished/.test(st)) return { cls: "done", txt: "Encerrado" };
      return { cls: "soon", txt: "Agendado" };
    }
    function team(name, badge, away) {
      var img = badge ? '<img class="cbadge" src="' + esc(badge) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' : '';
      var nm = '<span class="cteam-name">' + esc(name || "A definir") + '</span>';
      return '<div class="cteam' + (away ? " away" : "") + '">' + (away ? nm + img : img + nm) + '</div>';
    }
    function card(e) {
      var s = status(e), hs = e.intHomeScore, as = e.intAwayScore;
      var placar = (hs == null || hs === "") ? '<div class="cscore soon">×</div>'
        : '<div class="cscore">' + esc(hs) + '<i>×</i>' + esc(as) + '</div>';
      var meta = [fmtData(e), local(e)].filter(Boolean).join(" · ");
      return '<article class="cmatch ' + s.cls + '"><div class="cmatch-top"><span class="cmatch-round">' + esc(fase(e))
        + '</span><span class="cmatch-status ' + s.cls + '">' + s.txt + '</span></div><div class="cmatch-teams">'
        + team(e.strHomeTeam, e.strHomeTeamBadge) + placar + team(e.strAwayTeam, e.strAwayTeamBadge, true)
        + '</div>' + (meta ? '<div class="cmatch-meta">' + esc(meta) + '</div>' : '') + '</article>';
    }
    function block(titulo, evs) {
      if (!evs.length) return "";
      return '<div class="copa-block"><h3 class="copa-block-title">' + titulo + '</h3><div class="copa-cards">' + evs.map(card).join("") + '</div></div>';
    }
    function tabela(rows) {
      if (!rows || !rows.length) return "";
      var groups = {};
      rows.forEach(function (r) { var g = r.strGroup || r.intGroup || ""; (groups[g] = groups[g] || []).push(r); });
      var out = Object.keys(groups).map(function (g) {
        var rs = groups[g].slice().sort(function (a, b) { return (+a.intRank || 99) - (+b.intRank || 99); });
        var cap = g ? '<caption>' + esc(String(g).replace(/^group\s*/i, "Grupo ")) + '</caption>' : '';
        var tb = rs.map(function (r) {
          var bd = r.strBadge ? '<img class="cbadge sm" src="' + esc(r.strBadge) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' : '';
          return '<tr><td class="r">' + esc(r.intRank || "") + '</td><td class="t">' + bd + esc(r.strTeam || r.name || "")
            + '</td><td>' + esc(r.intPlayed || 0) + '</td><td>' + esc(r.intWin || 0) + '</td><td>' + esc(r.intDraw || 0)
            + '</td><td>' + esc(r.intLoss || 0) + '</td><td>' + esc(r.intGoalDifference || 0) + '</td><td class="p">' + esc(r.intPoints || 0) + '</td></tr>';
        }).join("");
        return '<table class="copa-table">' + cap + '<thead><tr><th>#</th><th class="t">Seleção</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th><th>P</th></tr></thead><tbody>' + tb + '</tbody></table>';
      }).join("");
      return '<div class="copa-block"><h3 class="copa-block-title">📊 Classificação</h3><div class="copa-tables">' + out + '</div></div>';
    }

    var got = { past: null, next: null, table: null };
    function paint() {
      if (got.past === null && got.next === null) return;
      var past = (got.past || []).slice().sort(function (a, b) { return String(b.dateEvent || "").localeCompare(String(a.dateEvent || "")); });
      var next = (got.next || []).slice().sort(function (a, b) { return String(a.dateEvent || "").localeCompare(String(b.dateEvent || "")); });
      if (!past.length && !next.length && !(got.table && got.table.length)) { fallback(); return; }
      body.innerHTML = block('🔴 Resultados', past.slice(0, 8)) + block('📅 Próximos jogos', next.slice(0, 8)) + tabela(got.table) || fbHtml;
    }
    function grab(url, key, retry) {
      if (!url) { got[key] = []; paint(); return; }
      fetch(url, { cache: "no-store" }).then(function (r) { return r.json(); })
        .then(function (d) { got[key] = d.events || d.results || d.table || d.matches || []; paint(); })
        .catch(function () { if (retry > 0) setTimeout(function () { grab(url, key, retry - 1); }, 4000); else { got[key] = got[key] || []; paint(); } });
    }
    function loadAll() { grab(apiPast, "past", 2); grab(apiNext, "next", 2); grab(apiTab, "table", 1); }
    loadAll();
    setInterval(loadAll, 90000);
  })();
})();
