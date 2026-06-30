#!/usr/bin/env node
/* Teste offline do parser do coletor (não acessa rede).
   Roda: node ghost/automation/test-collect.mjs */
import { parseFeed, slugify, makeBuilder } from "./collect.mjs";

let fail = 0;
const ok = (cond, msg) => { if (!cond) { fail++; console.log("  ✗", msg); } else console.log("  ✓", msg); };

// --- RSS 2.0 com enclosure de imagem e CDATA ---
const rss = `<?xml version="1.0"?><rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel>
<title>Prefeitura</title>
<item>
  <title><![CDATA[Prefeitura entrega nova UBS no bairro]]></title>
  <link>https://www.exemplo.mt.gov.br/noticias/ubs-nova</link>
  <pubDate>Mon, 30 Jun 2026 12:00:00 -0400</pubDate>
  <description><![CDATA[<p>A nova unidade vai atender 5 mil pessoas.</p>]]></description>
  <enclosure url="https://www.exemplo.mt.gov.br/img/ubs.jpg" type="image/jpeg" length="12345"/>
</item>
<item>
  <title>Notícia antiga de maio</title>
  <link>https://www.exemplo.mt.gov.br/noticias/antiga</link>
  <pubDate>Thu, 15 May 2026 09:00:00 -0400</pubDate>
  <description>Texto curto sem imagem.</description>
</item>
</channel></rss>`;

const r = parseFeed(rss);
ok(r.length === 2, `RSS: 2 itens (got ${r.length})`);
ok(r[0].title === "Prefeitura entrega nova UBS no bairro", "RSS: título com CDATA decodificado");
ok(r[0].link === "https://www.exemplo.mt.gov.br/noticias/ubs-nova", "RSS: link extraído");
ok(r[0].image === "https://www.exemplo.mt.gov.br/img/ubs.jpg", "RSS: imagem do enclosure");
ok(r[0].date && r[0].date.toISOString().slice(0, 10) === "2026-06-30", "RSS: data 30/06 parseada");
ok(/5 mil pessoas/.test(r[0].summary), "RSS: resumo limpo de tags");

// --- Atom com link href, media:thumbnail e summary ---
const atom = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
<entry>
  <title>Câmara aprova projeto de lei</title>
  <link rel="alternate" href="https://www.exemplo.mt.leg.br/noticia/123"/>
  <updated>2026-06-30T18:30:00-04:00</updated>
  <summary>Vereadores aprovaram por unanimidade.</summary>
  <media:thumbnail url="https://www.exemplo.mt.leg.br/img/sessao.png"/>
</entry></feed>`;

const a = parseFeed(atom);
ok(a.length === 1, `Atom: 1 entrada (got ${a.length})`);
ok(a[0].link === "https://www.exemplo.mt.leg.br/noticia/123", "Atom: href do link");
ok(a[0].image === "https://www.exemplo.mt.leg.br/img/sessao.png", "Atom: imagem do media:thumbnail");
ok(a[0].date && a[0].date.toISOString().slice(0, 10) === "2026-06-30", "Atom: data parseada");

// --- filtro do dia (simula o que o coletor faz) ---
const doDia = r.filter((it) => it.date && it.date.toISOString().slice(0, 10) === "2026-06-30");
ok(doDia.length === 1, `Filtro do dia: 1 de 2 (got ${doDia.length})`);

ok(slugify("São José dos Quatro Marcos") === "sao-jose-dos-quatro-marcos", "slugify com acentos");

// --- builder: a FONTE vira legenda da imagem e a editoria é a 1ª tag ---
const B = makeBuilder();
const tEd = B.tag("Cidades", "cidades", "public");
const tMun = B.tag("Cuiabá", "cuiaba", "public");
const tCol = B.tag("#coletado", "hash-coletado", "internal");
B.add({ title: "Teste", slug: "teste-cuiaba", html: "<p>oi</p>", excerpt: "oi",
  image: "https://x/y.jpg", fonteNome: "Prefeitura de Cuiabá", fonteUrl: "https://www.cuiaba.mt.gov.br/n/1",
  when: Date.now(), tagIds: [tEd, tMun, tCol] });
const out = B.done().db[0].data;
const p = out.posts[0];
ok(/^Fonte: <a href="https:\/\/www\.cuiaba\.mt\.gov\.br\/n\/1"/.test(p.feature_image_caption), "builder: fonte na legenda da imagem");
ok(p.feature_image === "https://x/y.jpg", "builder: feature_image setado");
const firstTagOfPost = out.posts_tags.filter((x) => x.post_id === p.id).sort((a, b) => a.sort_order - b.sort_order)[0].tag_id;
ok(firstTagOfPost === tEd, "builder: editoria é a 1ª tag (roteamento por editoria)");
ok(B.add({ title: "Teste", slug: "teste-cuiaba", html: "<p>x</p>", fonteNome: "x", fonteUrl: "x", tagIds: [tEd] }) === false, "builder: dedup por slug");

console.log(fail ? `\nFALHOU: ${fail} teste(s).` : "\nTODOS OS TESTES PASSARAM.");
process.exit(fail ? 1 : 0);
