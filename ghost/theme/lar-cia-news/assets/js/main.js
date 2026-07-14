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
    $$(".theme-icon").forEach(function (ic) { ic.textContent = t === "dark" ? "☀️" : "🌙"; });
    $$(".nav-theme-txt").forEach(function (el) { el.textContent = t === "dark" ? "Modo claro" : "Modo escuro"; });
  }
  (function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem("lcn_theme"); } catch (e) {}
    setTheme(saved || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
    // Todos os botões de tema (o do cabeçalho E o de dentro do menu ☰) alternam.
    $$(".theme-toggle").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
      });
    });
  })();

  /* ---- Menu mobile ----
     O toggle do menu agora vive INLINE em partials/main-nav.hbs (roda mesmo se
     este arquivo falhar). Mantido aqui só o comentário para não duplicar o bind. */

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

  /* ---- Copa do Mundo: resultados + próximos + tabela, em PT, tempo real ---- */
  (function initCopa() {
    var sec = $(".copa"); if (!sec) return;
    var body = $("#copaBody", sec);
    var apiPast = sec.getAttribute("data-api"), apiNext = sec.getAttribute("data-next"),
        apiTab = sec.getAttribute("data-tabela"), canal = sec.getAttribute("data-canal");
    var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
    var fbHtml = '<a class="copa-fallback" href="' + canal + '" target="_blank" rel="noopener">▶ Acompanhe os jogos ao vivo no YouTube</a>';
    function fallback() { body.innerHTML = fbHtml; }

    /* Tradução EN → PT de seleções/países (nomes vêm em inglês na API). */
    var PT = { "Brazil": "Brasil", "Argentina": "Argentina", "France": "França", "Spain": "Espanha",
      "Portugal": "Portugal", "Germany": "Alemanha", "England": "Inglaterra", "Netherlands": "Países Baixos",
      "Belgium": "Bélgica", "Italy": "Itália", "Croatia": "Croácia", "Switzerland": "Suíça", "Uruguay": "Uruguai",
      "Mexico": "México", "United States": "Estados Unidos", "USA": "EUA", "Canada": "Canadá", "Ecuador": "Equador",
      "Colombia": "Colômbia", "Peru": "Peru", "Chile": "Chile", "Paraguay": "Paraguai", "Bolivia": "Bolívia",
      "Venezuela": "Venezuela", "Japan": "Japão", "South Korea": "Coreia do Sul", "Korea Republic": "Coreia do Sul",
      "Australia": "Austrália", "Saudi Arabia": "Arábia Saudita", "Iran": "Irã", "Qatar": "Catar",
      "Morocco": "Marrocos", "Senegal": "Senegal", "Ghana": "Gana", "Nigeria": "Nigéria", "Cameroon": "Camarões",
      "Egypt": "Egito", "Tunisia": "Tunísia", "Algeria": "Argélia", "Ivory Coast": "Costa do Marfim",
      "Cote d'Ivoire": "Costa do Marfim", "Mali": "Mali", "DR Congo": "RD Congo", "South Africa": "África do Sul",
      "Cape Verde": "Cabo Verde", "Poland": "Polônia", "Serbia": "Sérvia", "Denmark": "Dinamarca", "Sweden": "Suécia",
      "Norway": "Noruega", "Austria": "Áustria", "Turkey": "Turquia", "Greece": "Grécia", "Scotland": "Escócia",
      "Wales": "País de Gales", "Ireland": "Irlanda", "Ukraine": "Ucrânia", "Czech Republic": "Tchéquia",
      "Slovakia": "Eslováquia", "Slovenia": "Eslovênia", "Hungary": "Hungria", "Romania": "Romênia",
      "New Zealand": "Nova Zelândia", "Uzbekistan": "Uzbequistão", "Jordan": "Jordânia", "United Arab Emirates": "Emirados Árabes",
      "Costa Rica": "Costa Rica", "Panama": "Panamá", "Jamaica": "Jamaica", "Honduras": "Honduras" };
    function tr(n) { return n && PT[String(n).trim()] || n || ""; }

    function fmtData(e) {
      var d = e.dateEvent ? String(e.dateEvent).split("-") : null;
      var data = d && d.length === 3 ? d[2] + "/" + d[1] : (e.dateEvent || "");
      var hora = e.strTime ? String(e.strTime).slice(0, 5) : "";
      return [data, hora].filter(Boolean).join(" · ");
    }
    function local(e) { return [e.strVenue, tr(e.strCountry)].filter(Boolean).join(" · "); }
    function fase(e) {
      var r = e.strRound != null ? String(e.strRound).trim() : "";
      var lg = e.strLeague ? String(e.strLeague).trim() : "";
      if (!r || /^0$/.test(r)) return lg;                 /* sem rodada: mostra a competição */
      if (/^\d+$/.test(r)) return "Rodada " + r;          /* liga (Brasileirão): Rodada N */
      var k = koRound(e); if (k) return k.l;              /* mata-mata (Copa do Brasil) em PT */
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
      var nm = '<span class="cteam-name">' + esc(tr(name) || "A definir") + '</span>';
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
      return '<div class="copa-block"><h3 class="copa-block-title">' + titulo + ' <span class="copa-count">' + evs.length + '</span></h3><div class="copa-cards">' + evs.map(card).join("") + '</div></div>';
    }
    function grupoLabel(g) { return String(g).replace(/^group\s*/i, "").trim(); }
    function tabela(rows) {
      if (!rows || !rows.length) return "";
      var groups = {};
      rows.forEach(function (r) { var g = r.strGroup || r.intGroup || ""; (groups[g] = groups[g] || []).push(r); });
      var keys = Object.keys(groups).sort(function (a, b) { return grupoLabel(a).localeCompare(grupoLabel(b), "pt", { numeric: true }); });
      var out = keys.map(function (g) {
        var rs = groups[g].slice().sort(function (a, b) { return (+a.intRank || 99) - (+b.intRank || 99); });
        var maxP = Math.max.apply(null, rs.map(function (r) { return +r.intPoints || 0; }).concat([1]));
        var lbl = grupoLabel(g);
        var cap = lbl ? '<caption><span class="gdot">' + esc(lbl) + '</span>Grupo ' + esc(lbl) + '</caption>' : '';
        var tb = rs.map(function (r, i) {
          var rank = +r.intRank || (i + 1);
          var bd = r.strBadge ? '<img class="cbadge sm" src="' + esc(r.strBadge) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' : '';
          var pts = +r.intPoints || 0, pct = Math.round(pts / maxP * 100);
          var gd = parseInt(r.intGoalDifference, 10), sg = isNaN(gd) ? esc(r.intGoalDifference || 0) : ((gd > 0 ? "+" : "") + gd);
          return '<tr class="' + (rank <= 4 ? "qz" : "") + '"><td class="r"><span class="cpos">' + rank + '</span></td>'
            + '<td class="t"><span class="cteam-row">' + bd + '<span class="cteam-nm">' + esc(tr(r.strTeam || r.name || "")) + '</span></span>'
            + '<span class="tbar"><i style="width:' + pct + '%"></i></span></td>'
            + '<td>' + esc(r.intPlayed || 0) + '</td><td>' + esc(r.intWin || 0) + '</td><td>' + esc(r.intDraw || 0)
            + '</td><td>' + esc(r.intLoss || 0) + '</td><td>' + sg + '</td><td class="p">' + pts + '</td></tr>';
        }).join("");
        return '<table class="copa-table">' + cap + '<thead><tr><th>#</th><th class="t">Time</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th><th>P</th></tr></thead><tbody>' + tb + '</tbody></table>';
      }).join("");
      return '<div class="copa-block"><h3 class="copa-block-title">📊 Classificação · Brasileirão</h3><p class="copa-hint"><b class="qz-key"></b> zona de Libertadores (G4) · a barra mostra o aproveitamento de pontos</p><div class="copa-tables">' + out + '</div></div>';
    }

    /* Chaveamento (mata-mata) — organiza os jogos de eliminatória em colunas
       Oitavas → Quartas → Semifinais → Final, do lado das tabelas. */
    function koRound(e) {
      var r = String(e.strRound || "").toLowerCase();
      if (/^\d+$/.test(r)) return null;
      if (/3rd|third|terceiro/.test(r)) return { o: 3.5, l: "3º lugar" };
      if (/\bfinal\b/.test(r) && !/semi|quarter|quartas/.test(r)) return { o: 4, l: "Final" };
      if (/semi/.test(r)) return { o: 3, l: "Semifinais" };
      if (/quarter|quartas/.test(r)) return { o: 2, l: "Quartas de final" };
      if (/round of 16|oitavas|1\/8|last 16/.test(r)) return { o: 1, l: "Oitavas de final" };
      return null;
    }
    function koCard(e) {
      var s = status(e);
      function side(name, badge, sc) {
        var img = badge ? '<img class="cbadge sm" src="' + esc(badge) + '" alt="" onerror="this.remove()">' : "";
        return '<div class="ko-team"><span class="ko-nm">' + img + esc(tr(name) || "A definir") + '</span><em>' + ((sc == null || sc === "") ? "" : esc(sc)) + '</em></div>';
      }
      return '<div class="ko-match ' + s.cls + '">' + side(e.strHomeTeam, e.strHomeTeamBadge, e.intHomeScore)
        + side(e.strAwayTeam, e.strAwayTeamBadge, e.intAwayScore) + '<div class="ko-meta">' + esc(fmtData(e) || s.txt) + '</div></div>';
    }
    function bracket(events) {
      if (!events || !events.length) return "";
      var cols = {}, seen = {};
      events.forEach(function (e) {
        var k = koRound(e); if (!k) return;
        var id = e.idEvent || (e.strHomeTeam + e.strAwayTeam + e.dateEvent); if (seen[id]) return; seen[id] = 1;
        (cols[k.o] = cols[k.o] || { l: k.l, items: [] }).items.push(e);
      });
      var keys = Object.keys(cols).sort(function (a, b) { return a - b; });
      if (!keys.length) return "";
      var out = keys.map(function (k) {
        var c = cols[k];
        var its = c.items.sort(function (a, b) { return String(a.dateEvent || "").localeCompare(String(b.dateEvent || "")); });
        return '<div class="ko-col"><h4 class="ko-col-t">' + c.l + '</h4>' + its.map(koCard).join("") + '</div>';
      }).join("");
      return '<div class="copa-block"><h3 class="copa-block-title">🏆 Chaveamento · mata-mata até a final</h3><div class="copa-bracket">' + out + '</div></div>';
    }

    var got = { past: null, next: null, table: null };
    function paint() {
      if (got.past === null && got.next === null) return;
      var past = (got.past || []).slice().sort(function (a, b) { return String(b.dateEvent || "").localeCompare(String(a.dateEvent || "")); });
      var next = (got.next || []).slice().sort(function (a, b) { return String(a.dateEvent || "").localeCompare(String(b.dateEvent || "")); });
      if (!past.length && !next.length && !(got.table && got.table.length)) { fallback(); return; }
      var todos = past.concat(next);
      body.innerHTML = (block('🔴 Resultados', past.slice(0, 9)) + block('📅 Próximos jogos', next.slice(0, 9)) + tabela(got.table) + bracket(todos)) || fbHtml;
    }
    function fetchEvents(url, retry) {
      return fetch(url, { cache: "no-store" }).then(function (r) { return r.json(); })
        .then(function (d) { return d.events || d.results || d.table || d.matches || []; })
        .catch(function () {
          if (retry > 0) return new Promise(function (res) { setTimeout(function () { res(fetchEvents(url, retry - 1)); }, 4000); });
          return [];
        });
    }
    /* past/next podem trazer VÁRIAS ligas (URLs separadas por espaço): junta e tira duplicados. */
    function grabList(urlStr, key, retry) {
      var urls = String(urlStr || "").trim().split(/\s+/).filter(Boolean);
      if (!urls.length) { got[key] = []; paint(); return; }
      Promise.all(urls.map(function (u) { return fetchEvents(u, retry); })).then(function (lists) {
        var all = [], seen = {};
        lists.forEach(function (evs) { (evs || []).forEach(function (e) {
          var id = e.idEvent || (e.strHomeTeam + e.strAwayTeam + e.dateEvent);
          if (seen[id]) return; seen[id] = 1; all.push(e);
        }); });
        got[key] = all; paint();
      });
    }
    function grabTable(url, retry) {
      if (!url) { got.table = []; paint(); return; }
      fetchEvents(url, retry).then(function (rows) { got.table = rows || []; paint(); });
    }
    function loadAll() { grabList(apiPast, "past", 2); grabList(apiNext, "next", 2); grabTable(apiTab, 1); }
    loadAll();
    setInterval(loadAll, 60000);   /* atualiza sozinho a cada 60s */
  })();

  /* ---- Embeds sociais: carrega os scripts só quando há embed na página ---- */
  (function initEmbeds() {
    if ($(".twitter-tweet")) {
      var s = document.createElement("script");
      s.src = "https://platform.twitter.com/widgets.js"; s.async = true; s.charset = "utf-8";
      document.body.appendChild(s);
    }
    if ($(".fb-post") || $(".fb-video")) {
      if (!$("#fb-root")) { var r = document.createElement("div"); r.id = "fb-root"; document.body.insertBefore(r, document.body.firstChild); }
      var f = document.createElement("script");
      f.async = true; f.defer = true; f.crossOrigin = "anonymous";
      f.src = "https://connect.facebook.net/pt_BR/sdk.js#xfbml=1&version=v19.0";
      document.body.appendChild(f);
    }
  })();

  /* ---- AO VIVO: autoplay mudo automático + som no 1º gesto do usuário ---- */
  (function initLive() {
    var frames = $$(".live-embed iframe"); if (!frames.length) return;
    function cmd(f, func, args) { try { f.contentWindow.postMessage(JSON.stringify({ event: "command", func: func, args: args || "" }), "*"); } catch (e) {} }
    function listen(f) { try { f.contentWindow.postMessage(JSON.stringify({ event: "listening" }), "*"); } catch (e) {} }
    // Cutuca o player pra iniciar sozinho (mudo): alguns navegadores só dão play
    // via API. Repete por ~8s pra pegar a hora em que o iframe termina de carregar.
    frames.forEach(function (f) {
      var n = 0, t = setInterval(function () {
        listen(f); cmd(f, "playVideo");
        if (++n >= 8) clearInterval(t);
      }, 1000);
    });
    // Tira o mudo no 1º gesto (a política do navegador não deixa começar com som).
    var evs = ["click", "touchstart", "keydown", "scroll"];
    function on() {
      frames.forEach(function (f) { cmd(f, "unMute"); cmd(f, "setVolume", [100]); cmd(f, "playVideo"); });
      evs.forEach(function (e) { document.removeEventListener(e, on); });
    }
    evs.forEach(function (e) { document.addEventListener(e, on, { passive: true }); });
  })();

  /* ---- Chat flutuante (assistente + IA opcional) ---- */
  (function initChat() {
    var wrap = $("#chatWidget"); if (!wrap) return;
    var fab = $("#chatFab"), panel = $("#chatPanel"), closeBtn = $("#chatClose"),
        bodyEl = $("#chatBody"), quickEl = $("#chatQuick"), form = $("#chatForm"),
        input = $("#chatInput"), waLink = $("#chatWa");
    var wa = wrap.getAttribute("data-wa") || "";
    var iaUrl = wrap.getAttribute("data-ia") || "";
    var nome = wrap.getAttribute("data-nome") || "Redação";
    var siteUrl = (wrap.getAttribute("data-url") || "").replace(/\/$/, "");
    var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
    var history = [], started = false;

    function waHref(text) { return "https://wa.me/" + wa + (text ? "?text=" + encodeURIComponent(text) : ""); }
    if (waLink) waLink.href = waHref("Olá! Vim pelo site " + nome + " e gostaria de falar com a redação.");
    function scroll() { bodyEl.scrollTop = bodyEl.scrollHeight; }
    function bubble(who, html) { var d = document.createElement("div"); d.className = "chat-msg " + who; d.innerHTML = html; bodyEl.appendChild(d); scroll(); return d; }
    function botText(t) { history.push({ role: "assistant", content: t }); return bubble("bot", esc(t).replace(/\n/g, "<br>")); }
    function userText(t) { history.push({ role: "user", content: t }); return bubble("user", esc(t)); }
    function typing() { return bubble("bot typing", "<span></span><span></span><span></span>"); }

    var defaultQuick = [
      { label: "📰 Últimas notícias", value: "últimas notícias" },
      { label: "📣 Anunciar", value: "anunciar" },
      { label: "✅ Assinar grátis", value: "assinar" },
      { label: "💬 Falar com a redação", value: "whatsapp" }
    ];
    function setQuick(items) {
      quickEl.innerHTML = "";
      (items || []).forEach(function (it) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "chat-chip"; b.textContent = it.label;
        b.addEventListener("click", function () { handle(it.value || it.label); });
        quickEl.appendChild(b);
      });
    }
    function localReply(msg) {
      var m = msg.toLowerCase();
      if (/anunci|public|comercial|midia kit|m[ií]dia|patroc/.test(m))
        return { text: "Para anunciar é rápido: fale com o comercial no WhatsApp que enviamos a tabela e as opções de banner.", quick: [{ label: "💬 Falar com o comercial", value: "whatsapp" }, { label: "Ver página Anuncie", value: "url:/anuncie/" }] };
      if (/assinar|assinatura|inscrev|newsletter|cadastr/.test(m))
        return { text: "Você pode assinar de graça e receber as notícias por e-mail. É só clicar em Assinar.", quick: [{ label: "✅ Assinar grátis", value: "portal" }] };
      if (/contato|reda[çc][aã]o|pauta|den[uú]ncia|whats|humano|atendente/.test(m))
        return { text: "Quer falar direto com a redação? Te levo ao nosso WhatsApp agora.", quick: [{ label: "💬 Abrir WhatsApp", value: "whatsapp" }] };
      if (/copa|jogo|placar|sele[çc][aã]o|futebol|tabela/.test(m))
        return { text: "Os jogos, resultados e a tabela da Copa estão na home, atualizando em tempo real.", quick: [{ label: "⚽ Ver a Copa", value: "url:/" }] };
      if (/pol[ií]tic|cidade|pol[ií]cia|economia|agro|esporte|im[oó]ve/.test(m)) {
        var slug = /pol[ií]tic/.test(m) ? "politica" : /pol[ií]cia/.test(m) ? "policia" : /cidade/.test(m) ? "cidades" : /economia/.test(m) ? "economia" : /agro/.test(m) ? "agro" : /esporte/.test(m) ? "esportes" : "imoveis";
        return { text: "Aqui está a editoria que você procura:", quick: [{ label: "Abrir editoria", value: "url:/tag/" + slug + "/" }] };
      }
      if (/[uú]ltim|not[ií]cia|hoje|agora|novidade/.test(m))
        return { text: "As últimas notícias ficam na página inicial, atualizadas o dia todo.", quick: [{ label: "📰 Abrir a home", value: "url:/" }, { label: "Política", value: "url:/tag/politica/" }, { label: "Cidades", value: "url:/tag/cidades/" }] };
      if (/^(oi|ol[aá]|bom dia|boa tarde|boa noite|e a[íi]|hey)/.test(m))
        return { text: "Olá! 👋 Sou o assistente do " + nome + ". Como posso ajudar?", quick: defaultQuick };
      return { text: "Posso ajudar com notícias, anúncios, assinatura ou falar com a redação. Para atendimento humano, toque em WhatsApp.", quick: defaultQuick };
    }
    function doAction(v) {
      if (v === "whatsapp") { window.open(waHref("Olá! Vim pelo site e preciso de ajuda."), "_blank", "noopener"); return true; }
      if (v === "portal") { location.hash = "#/portal/signup"; return true; }
      if (v.indexOf("url:") === 0) { window.open(siteUrl + v.slice(4), "_blank", "noopener"); return true; }
      return false;
    }
    function localOut(msg) { var r = localReply(msg); botText(r.text); setQuick(r.quick || defaultQuick); }
    function respond(msg) {
      if (iaUrl) {
        var t = typing();
        fetch(iaUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: msg, history: history.slice(-12) }) })
          .then(function (r) { return r.json(); })
          .then(function (d) { t.remove(); var reply = d && (d.reply || d.text || d.message); if (reply) { botText(reply); setQuick(defaultQuick); } else { botText("Não consegui responder agora. Quer falar no WhatsApp?"); setQuick([{ label: "💬 Abrir WhatsApp", value: "whatsapp" }]); } })
          .catch(function () { t.remove(); botText("Não consegui responder agora. Quer falar no WhatsApp?"); setQuick([{ label: "💬 Abrir WhatsApp", value: "whatsapp" }]); });
      } else {
        var t2 = typing();
        setTimeout(function () { t2.remove(); localOut(msg); }, 500);
      }
    }
    function handle(value) { if (doAction(value)) return; userText(value); respond(value); }
    function start() { if (started) return; started = true; botText("Olá! 👋 Sou o assistente do " + nome + ". Posso ajudar com notícias, anúncios e assinatura — ou te levar ao WhatsApp da redação."); setQuick(defaultQuick); }
    function open() { panel.hidden = false; fab.setAttribute("aria-expanded", "true"); wrap.classList.add("open"); start(); setTimeout(function () { input.focus(); }, 50); }
    function close() { panel.hidden = true; fab.setAttribute("aria-expanded", "false"); wrap.classList.remove("open"); }
    fab.addEventListener("click", function () { panel.hidden ? open() : close(); });
    /* Abre ao passar o mouse (só em telas com hover/desktop); fecha no × ou clique. */
    if (window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      wrap.addEventListener("mouseenter", function () { if (panel.hidden) open(); });
    }
    if (closeBtn) closeBtn.addEventListener("click", close);
    form.addEventListener("submit", function (e) { e.preventDefault(); var v = input.value.trim(); if (!v) return; input.value = ""; handle(v); });
  })();

  /* ---- Enquete: voto honesto. Sem endpoint, registra o voto no aparelho
     (localStorage) e agradece — SEM porcentagem falsa. Com data-endpoint, envia
     o voto e mostra o resultado real devolvido {results:{opcao:contagem}}. ---- */
  (function initEnquetes() {
    var polls = $$(".enquete"); if (!polls.length) return;
    polls.forEach(function (el) {
      var q = $(".enquete-q", el);
      var id = el.getAttribute("data-id") || (location.pathname + "|" + (q ? q.textContent : ""));
      var key = "enquete:" + id;
      var endpoint = el.getAttribute("data-endpoint");
      var opts = $$(".enquete-opt", el);
      var msg = $(".enquete-msg", el);
      function render(tallies, mine) {
        el.classList.add("voted");
        var total = 0;
        if (tallies) Object.keys(tallies).forEach(function (k) { total += (+tallies[k] || 0); });
        opts.forEach(function (b) {
          b.setAttribute("disabled", "");
          var v = b.getAttribute("data-opt");
          if (v === mine) b.classList.add("chosen");
          if (tallies && total > 0) {
            var pct = Math.round((+tallies[v] || 0) / total * 100);
            var fill = document.createElement("span"); fill.className = "enquete-fill"; fill.style.width = pct + "%";
            b.insertBefore(fill, b.firstChild);
            var p = document.createElement("span"); p.className = "enquete-pct"; p.textContent = pct + "%";
            b.appendChild(p);
          }
        });
        if (msg) { msg.hidden = false; msg.textContent = (tallies && total > 0) ? "Obrigado! Resultado parcial acima." : "Voto registrado. Obrigado!"; }
      }
      function results(mine) {
        if (!endpoint) { render(null, mine); return; }
        fetch(endpoint + (endpoint.indexOf("?") > -1 ? "&" : "?") + "id=" + encodeURIComponent(id), { cache: "no-store" })
          .then(function (r) { return r.json(); })
          .then(function (d) { render(d.results || d.tallies || null, mine); })
          .catch(function () { render(null, mine); });
      }
      function vote(v) {
        try { localStorage.setItem(key, v); } catch (e) {}
        if (endpoint) {
          fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: id, opt: v }) })
            .then(function (r) { return r.json(); })
            .then(function (d) { render(d.results || d.tallies || null, v); })
            .catch(function () { render(null, v); });
        } else { render(null, v); }
      }
      var mine = null; try { mine = localStorage.getItem(key); } catch (e) {}
      if (mine) results(mine);
      else opts.forEach(function (b) { b.addEventListener("click", function () { vote(b.getAttribute("data-opt")); }); });
    });
  })();
})();

/* Cobertura AO VIVO (live-blog): enquanto estiver no ar (data-live="1"), recarrega
   a página a cada minuto para o leitor ver as novas notas em tempo real. Pausa se
   a aba está oculta (não gasta à toa). Some quando a cobertura é encerrada. */
(function () {
  if (!document.querySelector('.live-cobertura[data-live="1"]')) return;
  setTimeout(function tick() {
    if (document.hidden) { setTimeout(tick, 5000); return; }
    location.reload();
  }, 60000);
})();

/* Tempo de leitura dinâmico na linha de autoria: "lendo" ENQUANTO o leitor rola a
   página; "lido" quando PARA de rolar e fica estático. Volta a "lendo" ao rolar
   de novo. Começa em "lendo" (o leitor acabou de abrir p/ ler). */
(function () {
  var el = document.querySelector(".rt-state");
  if (!el) return;
  var lendo = el.getAttribute("data-lendo") || "lendo";
  var lido = el.getAttribute("data-lido") || "lido";
  var t = null;
  window.addEventListener("scroll", function () {
    if (el.textContent !== lendo) el.textContent = lendo;
    clearTimeout(t);
    t = setTimeout(function () { el.textContent = lido; }, 900);
  }, { passive: true });
})();
