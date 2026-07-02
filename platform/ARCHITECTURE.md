# Lar&Cia — Plataforma (Next.js + Stripe)

App imobiliário transacional "estilo site de viagem": busca, calendário de
disponibilidade, reserva e **checkout** (Pix, boleto, cartão), contas de
usuário, avaliações e assinatura de anunciantes.

## Stack

| Camada | Escolha | Por quê |
|---|---|---|
| Frontend + Backend | **Next.js 14 (App Router, TypeScript)** | SSR p/ SEO de portal, API routes no mesmo projeto |
| Estilo | **Tailwind CSS** | rápido; reaproveita o design system (azul #1976D2, Inter) |
| Banco | **PostgreSQL + Prisma** | relacional (reservas, datas, pagamentos); evolui o schema MySQL que já fizemos |
| Auth | **Auth.js (NextAuth)** | e-mail/senha + Google; sessões |
| Pagamentos | **Stripe** (cartão, **Pix**, **boleto** no BR) | Checkout/Payment Intents; **Connect** p/ repasse a proprietários |
| Busca | Postgres (filtros) → **Meilisearch** depois | começa simples, escala |
| Hospedagem | **Vercel** (app) + **Neon/Supabase** (Postgres) | deploy git-push, Postgres gerenciado |

> Pagamentos BR: o Stripe já suporta **Pix** e **boleto** além de cartão.
> Alternativa local: **Mercado Pago** (Pix/boleto/cartão). A camada de
> pagamento é abstraída para trocar o provedor sem reescrever o app.

## Os 4 fluxos de checkout (→ API do Stripe)

| Fluxo | Modelo | Stripe |
|---|---|---|
| **Reserva de temporada** | datas + diária × noites | Checkout Session (pagamento único) + **Connect** (repasse ao dono, menos taxa da plataforma) |
| **Sinal na venda** | valor fixo de reserva do imóvel | Payment Intent (pagamento único, captura manual opcional) |
| **Aluguel mensal** | 1º aluguel/caução online; resto fora | Payment Intent (único) ou assinatura, conforme o caso |
| **Assinatura de anunciantes** | planos p/ corretores publicarem | **Stripe Billing** (Subscriptions + Customer Portal) |

Tudo confirmado por **webhook** (`/api/webhooks/stripe`) — a reserva só vira
`confirmed` quando o pagamento é aprovado (idempotente).

## Modelo de dados (resumo — ver `prisma/schema.prisma`)

`User` (papéis: cliente/corretor/admin) · `Property` + `PropertyImage` ·
`Availability` (calendário de temporada) · `Booking` (reserva com datas) ·
`Payment` (cartão/pix/boleto, vínculo Stripe) · `Reservation` (sinal de
venda) · `Lead` (venda/aluguel) · `Plan` + `Subscription` (anunciantes) ·
`Review` · `Favorite`.

## Roadmap (MVP primeiro)

- **Fase 1 — MVP transacional (núcleo):** listagem + detalhe, busca por
  filtros, **reserva de temporada com checkout Stripe** (cartão+Pix),
  contas de usuário, painel "minhas reservas". → já é vendável.
- **Fase 2 — Venda & aluguel:** sinal de reserva (venda), lead/proposta
  (aluguel), favoritos, avaliações.
- **Fase 3 — Anunciantes:** cadastro de corretor, **assinatura (Billing)**,
  publicação de imóveis, **Connect** para repasse das reservas.
- **Fase 4 — Escala:** Meilisearch, mensagens, app mobile (Expo) reusando a API.

## O que reaproveitamos do que já foi feito
- **Schema** (do MySQL) → vira o `schema.prisma` (Postgres).
- **Design** (cores, cards, layout do tema lar-cia) → componentes Tailwind.
- **Seed** (`seed/seed.json`) → popular o Postgres.
- **Ghost** (opcional) → fica só para **blog/SEO/conteúdo** num subdomínio.

## Como rodar (depois de scaffold)
```bash
cd platform
cp .env.example .env        # DATABASE_URL, STRIPE_*, AUTH_*
npm install
npx prisma migrate dev
npm run dev                 # http://localhost:3000
```
