# Instalar o portal de notícias com 1 comando

Estes scripts instalam o tema **lar-cia-news**, ativam, aplicam o roteamento
de editorias e importam o conteúdo de demonstração — tudo via Admin API do Ghost,
sem cliques.

## Passo único de preparação: pegar a Admin API Key (≈30s, uma vez)

1. Abra `http://localhost:2368/ghost`
2. **Settings → Integrations → Add custom integration**
3. Nome: `Setup` → **Create**
4. Copie a **Admin API Key** (formato `id:secret`)

> A chave fica só no seu Mac. Você **não** precisa me enviar.

## Rodar (no Mac)

```bash
cd ~/Sites/lar-cia
git pull origin claude/wonderful-bardeen-y8640f
GHOST_ADMIN_API_KEY='COLE_A_CHAVE_AQUI' bash ghost/scripts/setup-news-portal.sh
```

O script faz, em sequência:
1. Empacota e **envia** o tema `lar-cia-news`.
2. **Ativa** o tema.
3. Sobe o **routes.yaml** (editorias em `/editoria/{slug}/`).
4. **Importa** `news-import.json` (editorias, matérias-modelo, releases, anúncios).

No fim, abra `http://localhost:2368/`.

## Variáveis opcionais

- `GHOST_URL` (padrão `http://localhost:2368`) — se seu Ghost roda em outra porta/host.

## Reverter / repetir

- Rodar de novo **sobrescreve** o tema e **reimporta** o conteúdo (o Ghost
  ignora duplicados por slug). Seguro de repetir.
- Para trocar de tema: Ghost Admin → Settings → Design → Change theme.
