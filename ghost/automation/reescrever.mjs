#!/usr/bin/env node
/* EDITOR DE IA — reescreve cada matéria coletada (release oficial) num texto
   único e jornalístico ANTES de publicar, seguindo o modelo do editor:
     • título até 76 caracteres
     • subtítulo até 55 caracteres
     • corpo de notícia completo (jornalismo profissional)
     • resumo SEO de 139 a 149 caracteres
   Mantém a FOTO e o CRÉDITO da fonte (feature_image / feature_image_caption).

   Aceita a API do Claude (Anthropic) OU um endpoint compatível com a OpenAI
   (chat/completions — OpenAI, OpenRouter, Groq, Together…). Configure por ambiente:
     IA_API_KEY   (obrigatório; sem ele o passo é PULADO e nada é reescrito)
     IA_PROVIDER  (anthropic | openai — auto-detecta pela chave/URL se omitido)
     IA_API_URL   (opcional; padrão conforme o provider)
     IA_MODEL     (opcional; padrão: claude-3-5-haiku-latest ou gpt-4o-mini)
   Chave começando com "sk-ant" ou URL com "anthropic" ⇒ usa o Claude.

   Uso:
     node ghost/automation/reescrever.mjs <arquivo.json> [--out=saida.json]
                                          [--max=50] [--verbose]
   Sem --out, reescreve o próprio arquivo (in place). */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const EDITORIAL =
  "Você é um escritor, editor, redator e jornalista profissional. Sua missão é " +
  "reescrever os textos fornecidos de forma única, evitando qualquer repetição. " +
  "Crie um título com até 76 caracteres, respeitando gramática e pontuação " +
  "corretas do português brasileiro. Elabore um subtítulo de até 55 caracteres. " +
  "Desenvolva um artigo de notícia completo, seguindo os padrões do jornalismo " +
  "profissional. Redija um resumo com técnicas de SEO, de 139 a 149 caracteres. " +
  "Evite qualquer plágio, evite termos genéricos e conclua com expressões " +
  "específicas e coerentes.";

const KEY = process.env.IA_API_KEY || "";
const PROVIDER = (process.env.IA_PROVIDER ||
  (KEY.startsWith("sk-ant") || (process.env.IA_API_URL || "").includes("anthropic") ? "anthropic" : "openai")).toLowerCase();
const URL_ = process.env.IA_API_URL ||
  (PROVIDER === "anthropic" ? "https://api.anthropic.com/v1/messages" : "https://api.openai.com/v1/chat/completions");
const MODEL = process.env.IA_MODEL || (PROVIDER === "anthropic" ? "claude-3-5-haiku-latest" : "gpt-4o-mini");

/* Voz editorial POR PORTAL (--persona=hojemt|pacunews|odiapolitico ou IA_PERSONA).
   Faz cada portal reescrever a MESMA notícia com texto próprio — evita portais
   clones e conteúdo duplicado (ruim de SEO). Sem persona, usa a voz padrão. */
const PERSONAS = {
  hojemt: "IDENTIDADE DO VEÍCULO — Hoje MT: jornalismo regional informativo, direto e confiável, foco no dia a dia de Mato Grosso. Produza uma versão ÚNICA para este veículo.",
  pacunews: "IDENTIDADE DO VEÍCULO — Pacu News: linguagem popular, ágil e acessível ao grande público; títulos diretos, sem sensacionalismo nem clickbait. Produza uma versão ÚNICA para este veículo.",
  odiapolitico: "IDENTIDADE DO VEÍCULO — O Dia Político: escreva para um público QUALIFICADO — clientes, gestores e agentes públicos com relevância política e intelectual, e leitores de economia, finanças e negócios. Tom analítico e intelectual, conectando política a economia e negócios. NÃO use tom burocrático nem 'institucional' de release; produza uma versão ÚNICA para este veículo.",
};
const PERSONA_ARG = (process.argv.find((a) => a.startsWith("--persona=")) || "").split("=")[1] || "";
const PERSONA_KEY = (PERSONA_ARG || process.env.IA_PERSONA || "").toLowerCase();  // CLI vence o env
const PERSONA = PERSONAS[PERSONA_KEY] || "";
const SYSTEM = PERSONA ? `${EDITORIAL}\n\n${PERSONA}` : EDITORIAL;

const stripTags = (s) => String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const clamp = (s, n) => { s = String(s || "").trim(); return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "").trim() : s; };

function htmlFromMobiledoc(md) {
  try { const j = JSON.parse(md); const c = (j.cards || []).find((x) => x[0] === "html"); return c ? c[1].html : ""; } catch { return ""; }
}
function mobiledocFromHtml(html) {
  return JSON.stringify({ version: "0.3.1", atoms: [], markups: [], sections: [[10, 0]], cards: [["html", { html }]] });
}

const INSTRUCAO =
  "Reescreva a notícia abaixo (baseada em release oficial). Responda SOMENTE com " +
  "um JSON válido, sem markdown, no formato exato:\n" +
  '{"titulo":"...","subtitulo":"...","corpo_html":"<p>...</p><p>...</p>","resumo":"..."}\n' +
  "Regras: titulo ≤76 caracteres; subtitulo ≤55; resumo entre 139 e 149; " +
  "corpo_html com parágrafos <p>…</p> (jornalismo profissional, texto único).";

async function reescreverUm(titulo, texto) {
  const userMsg = `${INSTRUCAO}\n\nTÍTULO ORIGINAL: ${titulo}\nTEXTO ORIGINAL:\n${texto}`;
  let out = "";
  if (PROVIDER === "anthropic") {
    const r = await fetch(URL_, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 2000, system: SYSTEM, messages: [{ role: "user", content: userMsg }] }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status} ${(await r.text()).slice(0, 160)}`);
    out = (await r.json())?.content?.[0]?.text || "";
  } else {
    const r = await fetch(URL_, {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({ model: MODEL, temperature: 0.7, response_format: { type: "json_object" }, messages: [{ role: "system", content: SYSTEM }, { role: "user", content: userMsg }] }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status} ${(await r.text()).slice(0, 160)}`);
    out = (await r.json())?.choices?.[0]?.message?.content || "";
  }
  out = out.replace(/^```json\s*|\s*```$/g, "").trim();
  const j = JSON.parse(out);
  return {
    titulo: clamp(j.titulo, 76),
    subtitulo: clamp(j.subtitulo, 55),
    corpo_html: String(j.corpo_html || "").trim(),
    resumo: clamp(j.resumo, 149),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split("=").slice(1).join("=") : d; };
  const has = (k) => args.includes(`--${k}`);
  const verbose = has("verbose");
  const max = parseInt(opt("max", "50"), 10);
  if (!file) { console.error("Informe o arquivo JSON coletado. Ex.: node reescrever.mjs ghost/import/secom-hoje.json"); process.exit(1); }
  const inPath = resolve(process.cwd(), file);
  const outPath = resolve(process.cwd(), opt("out", file));

  if (PERSONA) console.log(`Voz editorial: ${PERSONA_KEY}`);
  else if (PERSONA_KEY) console.log(`(persona "${PERSONA_KEY}" desconhecida — usando voz padrão)`);

  const j = JSON.parse(readFileSync(inPath, "utf8"));
  if (!KEY) {
    console.log("IA_API_KEY não definido — reescrita PULADA (copiando o original para a saída).");
    writeFileSync(outPath, JSON.stringify(j, null, 2) + "\n");
    return;
  }
  const posts = j?.db?.[0]?.data?.posts || [];
  if (!posts.length) { console.log("Nada a reescrever (0 posts)."); writeFileSync(outPath, JSON.stringify(j, null, 2) + "\n"); return; }

  let ok = 0, fail = 0;
  for (const p of posts.slice(0, max)) {
    const texto = stripTags(htmlFromMobiledoc(p.mobiledoc)) || stripTags(p.title);
    try {
      const e = await reescreverUm(p.title, texto);
      if (!e.titulo || !e.corpo_html) throw new Error("resposta incompleta");
      p.title = e.titulo;
      p.custom_excerpt = e.resumo || p.custom_excerpt || null;
      const deck = e.subtitulo ? `<p class="post-deck"><strong>${esc(e.subtitulo)}</strong></p>` : "";
      p.mobiledoc = mobiledocFromHtml(deck + e.corpo_html);
      ok++; if (verbose) console.log(`  ✓ ${e.titulo}  (sub ${e.subtitulo.length}c · resumo ${(e.resumo || "").length}c)`);
    } catch (err) { fail++; if (verbose) console.log(`  ✗ mantido original: ${p.title.slice(0, 50)} — ${err.message}`); }
  }
  writeFileSync(outPath, JSON.stringify(j, null, 2) + "\n");
  console.log(`Reescritas: ${ok} · falhas (mantidas originais): ${fail} · arquivo: ${outPath}`);
}

main().catch((e) => { console.error("Falhou:", e.message); process.exit(1); });
