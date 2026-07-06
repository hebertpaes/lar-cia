# Template "bom_dia" — para aprovar na Meta

Onde: **Meta Business → WhatsApp Manager → Modelos de mensagem → Criar modelo**.
Depois de aprovado, use o nome no `.env`: `WA_TEMPLATE=bom_dia`.

- **Nome:** `bom_dia`
- **Categoria:** Marketing
- **Idioma:** Português (BR) — `pt_BR`

## Corpo (Body) — texto FIXO (sem variáveis)
> ☀️ Bom dia! Comece o dia informado: as principais notícias de Mato Grosso, todos os dias aqui no seu WhatsApp.

## Rodapé (Footer)
> Responda SAIR para deixar de receber.

## Botão (opcional) — URL fixa
- Tipo: **Visitar site**
- Texto: **Ver as notícias**
- URL: `https://hojemt.com.br`

## Por que assim
- **Sem variáveis `{{1}}` no corpo** → casa com o `broadcast.mjs` e o `disparo-lote.mjs`
  como estão (eles enviam só `name + language`, sem parâmetros).
- **Marketing exige opt-out** → o "Responda SAIR" cobre. Quando alguém responder
  SAIR, marque: `node crm.mjs optout <numero>` (ou o `server.mjs` faz automático
  se estiver rodando com o webhook).
- Se quiser textos diferentes por portal, crie um template por número
  (ex.: `bom_dia_pacu`) e aponte no `.env` de cada um.

## Importante (antes do 1º disparo real)
1. Número **novo** começa com tier baixo (~250–1.000/dia) — cresce com boa qualidade.
2. Sempre teste primeiro no **seu próprio número**:
   `node disparo-lote.mjs --dry-run` e depois `--por-dia=1`.
3. Vá subindo o `--por-dia` aos poucos, de olho na qualidade do número no painel da Meta.
