# Blocos Copa do Mundo + Política (dados + automação)

Dois blocos na home, logo abaixo do player (AO VIVO):

## ⚽ Copa do Mundo (resultados ao vivo)
- Liga/desliga: **Settings → Design → `copa_ativa`**.
- Fonte de dados: **`copa_api`** — uma URL que devolve JSON no formato do
  **TheSportsDB** (`{ "events": [ ... ] }`). Padrão já configurado para a Copa.
- **Atualiza sozinho:** o navegador busca os jogos ao carregar e **a cada 90s**.
- **À prova de falha:** se a API falhar, tenta de novo 2×; se ainda assim falhar,
  mostra um botão "Acompanhe ao vivo na CazéTV" (nunca quebra a página).
- Trocar de campeonato/temporada: ajuste o `id=` da liga na `copa_api`. Para
  mais requisições/estabilidade, use sua própria chave do TheSportsDB no lugar
  do `/3/` (chave de teste).

Cada item esperado (campos do TheSportsDB): `strHomeTeam`, `strAwayTeam`,
`intHomeScore`, `intAwayScore`, `dateEvent`, `strTime`.

## 📊 Política — Brasil & MT
- **Notícias:** automáticas, da editoria **Política** do próprio portal.
- **Pesquisas eleitorais:** vêm de um **JSON externo** em **`pesquisas_url`**
  (Design). Sem URL, a coluna de pesquisas some. Formato:

```json
[
  {
    "cargo": "Presidente (nacional)",
    "instituto": "Instituto X",
    "data": "06/2026",
    "candidatos": [
      { "nome": "Candidato A", "pct": 38 },
      { "nome": "Candidato B", "pct": 31 },
      { "nome": "Candidato C", "pct": 12 }
    ]
  },
  { "cargo": "Governo de MT", "instituto": "...", "data": "...", "candidatos": [...] }
]
```

> **Importante (honestidade):** não existe API pública gratuita confiável de
> pesquisas eleitorais brasileiras. Por isso a coluna lê um JSON que **você**
> mantém (atualizado à mão, por um colaborador, ou por uma automação sua).
> Hospede esse JSON em qualquer lugar público (ex.: um Gist, um bucket, ou um
> arquivo no seu servidor) e coloque a URL em `pesquisas_url`.

## Automação / atualização diária + falhas
- **Copa:** já é automática no navegador (90s + retry). Zero manutenção.
- **Pesquisas:** atualize o JSON quando sair pesquisa nova. Para automatizar
  por completo, agende (cron) um script seu que gera o JSON e o publica na URL.
  Exemplo de cron diário:

```cron
0 6 * * * /usr/local/bin/node /caminho/gera-pesquisas.js > /var/www/pesquisas.json 2>> /tmp/pesquisas.log
```

O bloco no site sempre lê a versão mais recente desse arquivo.
