# Publicação automática multi-portal

Publica matérias automaticamente em vários portais Ghost, **roteando por editoria**:
- **Hoje MT** (`hojemt.com.br`) → recebe **tudo**
- **Pacu News** (`pacunews.com.br`) → recebe **tudo**
- **O Dia Político** (`odiapolitico.com.br`) → recebe **só Política**
- **local** (`localhost:2368`) → para **testar** antes de produção

## 1) Configurar os sites

```bash
cp ghost/automation/sites.config.example.json ghost/automation/sites.config.json
```
Edite `editorias` por portal: `"*"` = tudo; `["politica"]` = só essa editoria.
As **chaves não vão no arquivo** — cada site aponta para uma variável de ambiente (`keyEnv`).

## 2) Pegar a Admin API Key de cada portal

Em cada Ghost: **Settings → Integrations → Add custom integration → Admin API Key** (formato `id:secret`).

## 3) Testar no localhost primeiro (recomendado)

```bash
# Simulação (não publica):
LOCAL_ADMIN_KEY='id:secret' node ghost/automation/publish.mjs ghost/import/secom-import.json --only=local --dry-run

# Publicar de verdade só no local:
LOCAL_ADMIN_KEY='id:secret' node ghost/automation/publish.mjs ghost/import/secom-import.json --only=local
```

## 4) Publicar nos portais de produção

```bash
HOJEMT_ADMIN_KEY='id:secret' \
PACUNEWS_ADMIN_KEY='id:secret' \
ODIAPOLITICO_ADMIN_KEY='id:secret' \
node ghost/automation/publish.mjs ghost/import/secom-hoje.json
```

> **`secom-hoje.json`** = matérias do dia (gere com `node ghost/import/generate-secom-hoje.mjs`).
> `secom-import.json` = lote maior de releases. Use o arquivo que quiser como fonte.

- **Não duplica:** se já existe matéria com o mesmo slug no portal, ela é pulada.
- **Roteia por editoria:** O Dia Político só recebe Política; Hoje MT e Pacu News recebem tudo.
- A **fonte** (`<fonte.json>`) é qualquer arquivo no formato de import do Ghost — você decide qual usar.

## 5) Agendar (rodar sozinho)

Exemplo de cron a cada hora (no Mac/servidor):

```cron
0 * * * * cd /caminho/lar-cia && HOJEMT_ADMIN_KEY='..' ODIAPOLITICO_ADMIN_KEY='..' /usr/local/bin/node ghost/automation/publish.mjs ghost/import/secom-import.json >> /tmp/publish.log 2>&1
```

> Segurança: `sites.config.json` e as chaves ficam **fora do Git** (veja .gitignore).

---

# Coletor das assessorias oficiais de MT (SECOM, ALMT, prefeituras e câmaras)

Coleta sozinho as **notícias do dia de cada assessoria** e gera o JSON pronto
para publicar. A **fonte aparece na legenda da imagem** (logo abaixo da foto),
via `feature_image_caption`.

> ⚠️ Rode o coletor na **sua máquina/servidor** (que alcança `.gov.br`/`.leg.br`).
> O ambiente de desenvolvimento do Claude **não** acessa esses domínios.

## Fontes (`sources.mt.json`)
Gere/atualize o registro com **284 fontes** (SECOM-MT, ALMT, 141 prefeituras e
141 câmaras):
```bash
node ghost/automation/gen-sources.mjs
```
Os domínios municipais são derivados por padrão (`<municipio>.mt.gov.br` e
`<municipio>.mt.leg.br`) e marcados com `"verificar": true`. Ajuste a `url` ou
informe um `feed` (URL do RSS) nas fontes que não responderem.

## Coletar o dia
```bash
# gera ghost/import/coletado-AAAA-MM-DD.json (só matérias de hoje):
node ghost/automation/collect.mjs

# opções úteis:
node ghost/automation/collect.mjs --date=2026-06-30 --max=4 --verbose
node ghost/automation/collect.mjs --only=cuiaba        # só uma cidade/fonte
node ghost/automation/collect.mjs --all-dates          # ignora o filtro de data
```
O coletor isola falhas: fonte sem RSS é apenas reportada (nunca derruba a rodada).
Testar o parser sem rede: `node ghost/automation/test-collect.mjs`.

## Filtro de qualidade (`filtro.mjs`)
Só entra **notícia de interesse público** (fatos da SECOM), **não o diário oficial**.
O filtro descarta automaticamente:
- **Atos administrativos / diário oficial:** decreto, portaria, edital, licitação,
  pregão, **contratação direta, aquisição de…, dispensa, chamada pública, termo de
  referência, processo administrativo**, nomeação/exoneração, extrato de contrato,
  resolução, errata, "Lei nº…", títulos "Aviso de…" e do tipo "1969/2026 - Cidade".

O coletor ainda **prefere o feed de notícias** (`/noticias/feed`, SECOM) ao feed
geral do site, que costuma misturar o diário oficial.
- **Matérias curtas:** abaixo do mínimo de palavras (padrão **100** na publicação).

Roda em **dois pontos**: na **coleta** (mínimo baixo, `--min=50`, pois a reescrita
por IA amplia releases curtos) e na **publicação** (corte duro de **100 palavras**
no texto já reescrito, ajustável com `FILTRO_MIN_PALAVRAS`). Conferir um arquivo
já coletado, sem publicar:
```bash
node ghost/automation/filtro.mjs ghost/import/coletado-AAAA-MM-DD.json --min=100
```

### Limpar o que já foi publicado (`limpar.mjs`)
O filtro é **preventivo** (barra o novo). Para remover o administrativo que **já
está no ar**, use o `limpar.mjs`: ele varre os posts publicados de cada portal
pela Admin API e aplica o mesmo filtro. **Padrão = `--dry-run`** (só lista) e mira
**só administrativo** — matéria curta só entra com `--curtas` (para não apagar as
**curtinhas** editoriais). Use `--draft` para despublicar em vez de apagar.
```bash
# Simular (não altera nada):
HOJEMT_ADMIN_KEY='id:secret' node ghost/automation/limpar.mjs --only=hojemt
# Remover de verdade:
HOJEMT_ADMIN_KEY='id:secret' node ghost/automation/limpar.mjs --only=hojemt --apply
```

## Publicar o que foi coletado
- **Vários portais, roteando por editoria** (recomendado):
  ```bash
  HOJEMT_ADMIN_KEY='id:secret' PACUNEWS_ADMIN_KEY='id:secret' ODIAPOLITICO_ADMIN_KEY='id:secret' \
    node ghost/automation/publish.mjs ghost/import/coletado-2026-06-30.json
  ```
- **Tudo num site só** (import nativo em lote):
  ```bash
  SITE_URL='https://hojemt.com.br' SITE_ADMIN_KEY='id:secret' \
    node ghost/automation/import.mjs ghost/import/coletado-2026-06-30.json
  ```

## Pipeline diário (cron) — coleta + publica sozinho
```cron
0 6 * * * cd /caminho/lar-cia && \
  /usr/local/bin/node ghost/automation/collect.mjs --out=ghost/import/coletado-hoje.json && \
  HOJEMT_ADMIN_KEY='..' PACUNEWS_ADMIN_KEY='..' ODIAPOLITICO_ADMIN_KEY='..' \
  /usr/local/bin/node ghost/automation/publish.mjs ghost/import/coletado-hoje.json \
  >> /tmp/coleta.log 2>&1
```
As coletas diárias (`coletado-*.json`) ficam **fora do Git**.
