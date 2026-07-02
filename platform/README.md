# Lar&Cia — Plataforma (Next.js + Stripe)

App imobiliário transacional "estilo site de viagem". Visão, stack e roadmap
em [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Estado atual (fundação — Fase 1 em andamento)
- ✅ Modelo de dados completo (`prisma/schema.prisma`) — imóveis,
  disponibilidade, reservas, pagamentos, sinal de venda, leads, assinaturas,
  avaliações, favoritos.
- ✅ Integração **Stripe**: rota de checkout de reserva (cartão + Pix) e
  webhook que confirma a reserva ao aprovar o pagamento.
- ✅ Config do projeto (Next 14, Tailwind, TS) + landing.
- ⏳ A construir: páginas de busca/detalhe, calendário, auth, painéis.

## Rodar (na sua máquina — precisa de internet p/ baixar deps)

```bash
cd platform
cp .env.example .env          # preencha DATABASE_URL e STRIPE_*
npm install
npx prisma migrate dev --name init   # cria as tabelas no Postgres
npm run dev                   # http://localhost:3000
```
Postgres local rápido: `docker run -e POSTGRES_PASSWORD=pass -e POSTGRES_DB=larcia -p 5432:5432 postgres:16`
(ou um Postgres gerenciado: Neon / Supabase).

## Stripe (checkout)
1. Conta Stripe → ative **Pix** e **boleto** (Brasil) em Payment methods.
2. Coloque `STRIPE_SECRET_KEY` e `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` no `.env`.
3. Webhook local: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
   e copie o `whsec_...` para `STRIPE_WEBHOOK_SECRET`.

Fluxo de reserva: `POST /api/checkout/booking` → cria reserva PENDING + retorna
`url` do Stripe Checkout → cliente paga → webhook marca **CONFIRMED**.

## Validação
O schema e as rotas foram revisados; rode `npx prisma validate` e
`npm run build` na sua máquina (o ambiente onde foram criados bloqueia o
download dos binários do Prisma/Next, então o build final é local).

## Próximos passos
Fase 1: página de busca + detalhe do imóvel + widget de datas chamando
`/api/checkout/booking`; auth (login). Depois: venda (sinal), aluguel
(proposta), anunciantes (assinatura) e Connect (repasse).
