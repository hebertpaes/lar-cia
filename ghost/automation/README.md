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
