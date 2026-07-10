# CLAUDE.md — instruções do projeto (para o cowork)

Rede de **portais de notícias no Ghost (MT)**. Hoje são **3 portais**:

| Portal | Domínio | Editorias | Cor |
|---|---|---|---|
| **Hoje MT** | hojemt.com.br | todas | `#0F9D58` (verde da logo) |
| **O Dia Político** | odiapolitico.com.br | só **Política** | **layout "Fox News" em PRETO + BRANCO** (`#111111`) |
| **Pacu News** | pacunews.com.br | todas | `#D62828` (vermelho) |

> **O Dia Político** usa o **layout/funções do foxnews.com** (cabeçalho cheio,
> faixa de editorias com aba ativa "Início", manchetes serifadas, rodapé escuro),
> mas com identidade **preto + branco** — sem azul-marinho nem vermelho. O visual
> mora em `ghost/theme/overrides/odiapolitico-fox.css`, anexado ao `screen.css`
> **só nessa variação** pelo `build-portal.sh` (build com cor `#111111`). A faixa e
> as seções da home dela são políticas (Congresso, Governo, Brasil, Mundo, Colunas).
> Semente de conteúdo real (cívico, com fonte): `ghost/import/odiapolitico-seed.json`.

Logo da marca: `ghost/brand/hojemt-logo.svg` (cor) e `hojemt-logo-branco.svg`
(fundo escuro), gerados por `ghost/brand/gen-logo.mjs`. O logo do site é definido
no Ghost (Design → Brand → Logo) ou pelo `LOGO_FILE` do `ativar-tudo.mjs`.

## Como funciona (fonte única + variações)
- O tema-base é **`ghost/theme/lar-cia-news/`** — **só edite aqui**.
- As variações por portal são **geradas** com `build-portal.sh` (nome, cor, e-mail
  `contato@<domínio>` e o banner GIF da marca). As pastas geradas
  (`hojemt/`, `odiapolitico/`, `pacunews/`) e os `.zip` são **gitignored**.

```bash
cd ghost/theme
bash build-portal.sh hojemt       "Hoje MT"        "#0F9D58"
bash build-portal.sh odiapolitico "O Dia Político" "#111111"   # layout Fox, preto+branco
bash build-portal.sh pacunews     "Pacu News"      "#D62828"
```

## Regras de trabalho
1. Toda mudança de tema vai em `lar-cia-news/`; depois **rode `build-portal.sh` para os 3**.
2. **Valide antes de commitar**: `cd ghost/theme/lar-cia-news && npx --yes gscan .`
   (precisa dar "compatible with Ghost 6.x", 0 erros; máx. **20** custom settings).
3. Ao mexer no JS: `node --check assets/js/main.js`.
4. Não commitar as pastas de variação nem os `.zip` (já ignoradas).
5. **Nada de placeholder/instrução no front** (produção). Comentários só no código.
6. **Manter o leitor no portal:** navegação interna sempre na mesma aba (links do
   próprio site). Todo link **externo** (fonte, YouTube, redes) abre em **nova aba**
   (`target="_blank" rel="noopener"`) — **nunca** navegar para fora na mesma aba.
   Vale especialmente para o **Hoje MT**. Na automação, `collect.mjs`/`reescrever.mjs`
   já forçam isso no corpo das matérias (`linkExternos`).

## Pastas
- `ghost/theme/lar-cia-news/` — tema (Handlebars/CSS/JS). Conteúdo demo em `content/noticias.json`.
- `ghost/theme/build-portal.sh` — gera as variações.
- `ghost/banners/` — GIFs "Anuncie" por marca (o build embute em `assets/img/anuncie.gif`).
- `ghost/import/` — geradores + JSON de conteúdo (`generate-noticias-300.mjs` → `noticias-300.json`; `generate-secom-*` etc.).
- `ghost/automation/` — `collect.mjs` (coleta assessorias oficiais via RSS), `secom.mjs` (coletor da SECOM lendo o HTML; a lista é JS, então use `secom-headless.mjs` com Playwright), `reescrever.mjs` (editor de IA: reescreve cada matéria — título ≤76, subtítulo ≤55, corpo, resumo SEO 139–149 — via endpoint compatível com OpenAI; `IA_API_KEY`; **voz por portal** com `--persona=hojemt|pacunews|odiapolitico` para os portais não ficarem clones — sem chave, copia o original), `publish.mjs` (publica roteando por editoria), `filtro.mjs` (filtro de qualidade: descarta atos administrativos — decreto/portaria/edital/licitação etc. — e matérias com <100 palavras; roda na coleta e na publicação), `limpar.mjs` (remove/despublica o administrativo já publicado nos portais via Admin API; `--dry-run` por padrão, mira só administrativo p/ não apagar curtinhas), `desfixar.mjs` (tira o Featured das matérias fixadas antigas para a capa voltar a mostrar a notícia real mais recente; `--dry-run` por padrão, alvo fixadas com +2 dias), `import.mjs`, `gen-sources.mjs` (gera o `sources.mt.json`: 4 federais + 3 estaduais/AMM + 141 prefeituras + 141 câmaras de MT; municipais vêm por padrão de domínio `<slug>.mt.gov.br`/`.mt.leg.br` com `verificar:true`), `gen-sources-amm.mjs` (enriquece o `sources.mt.json` com o **site oficial** de cada prefeitura lido do diretório da AMM — *Lista de Prefeituras* de amm.org.br — marcando `verificar:false`; roda **na máquina do usuário** pois o sandbox não alcança a AMM; `--dry-run`/`--print`), `sources.mt.json`.
- `ghost/scripts/` — `ativar-tudo.mjs` (liga Membros/Portal, menu, comentários, sobe tema e importa) e helpers.
- `ghost/whatsapp-crm/` — CRM + disparo (Cloud API oficial) + QR opcional + webhook `/chat`.

## Operar (roda na máquina do usuário — o sandbox NÃO alcança os sites/gov)
- **Ativar tudo num portal** (jeito fácil — pergunta a chave, você cola só ela):
  ```bash
  bash ghost/scripts/ativar.sh hojemt            # Membros/Portal, menu, comentários, páginas do rodapé
  bash ghost/scripts/ativar.sh hojemt --dry-run  # só simula
  bash ghost/scripts/ativar.sh hojemt --completo # + sobe o tema e importa as 300 notícias
  ```
  O wrapper entra na pasta certa sozinho. Por baixo chama o `ativar-tudo.mjs`
  (que também aceita `SITE_URL`/`SITE_ADMIN_KEY`/`THEME_ZIP`/`CONTENT_JSON` direto).
- **Coletar + publicar** (rotea por editoria — O Dia Político só recebe Política):
  ```bash
  node ghost/automation/collect.mjs
  HOJEMT_ADMIN_KEY='..' PACUNEWS_ADMIN_KEY='..' ODIAPOLITICO_ADMIN_KEY='..' \
    node ghost/automation/publish.mjs ghost/import/coletado-AAAA-MM-DD.json
  ```
- **CRM/disparo** (opt-in obrigatório; Cloud API oficial): ver `ghost/whatsapp-crm/README.md`.

## Limites técnicos (honestos — não são bugs)
- O sandbox do Claude **não acessa** `.gov.br`/sites de notícias/os próprios portais (rede bloqueada). Coleta e ativação rodam na máquina do usuário.
- **CazéTV bloqueia incorporação** → o AO VIVO mostra "vídeo indisponível" se apontar pra ela; use um canal/vídeo que permita embed, ou o link do YouTube.
- **Navegador não deixa autoplay com som**; o tema tira o mudo no 1º gesto do usuário.
- Popups de **Assinar/Entrar** dependem de **Membros ativados** no Ghost (o `ativar-tudo.mjs` liga).

## Chaves/segredos
Nunca no repositório. Admin API Keys vêm de *Ghost → Settings → Integrations → Custom integration*. Configs locais (`sites.config.json`, `.env`, `contacts.json`) são gitignored.
