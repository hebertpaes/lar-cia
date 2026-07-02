# Blocos Copa do Mundo + Política

Duas faixas na home, no fluxo de conteúdo (após "Últimas notícias"):

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
- Faixa com as **últimas matérias da editoria Política** do próprio portal
  (automática — qualquer post com a tag `politica` entra aqui).
- A coluna de pesquisas eleitorais foi **removida** a pedido; os números de
  institutos não fazem mais parte do tema.

## Automação / atualização
- **Copa:** automática no navegador (90s + retry). Zero manutenção.
- **Política:** automática — basta publicar matérias na editoria `politica`.
