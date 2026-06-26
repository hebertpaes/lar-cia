import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { stripe, toCents } from "@/lib/stripe";

// POST /api/checkout/booking
// Cria a reserva. Se o Stripe estiver configurado (chave real), abre o
// Checkout (cartão/Pix). Senão, entra em MODO DEMO: confirma a reserva sem
// pagamento real — para você testar o fluxo completo. Trocar a chave por uma
// real ativa o pagamento de verdade automaticamente.
const Body = z.object({
  propertyId: z.string(),
  checkIn: z.string(),
  checkOut: z.string(),
  guests: z.number().int().min(1).default(1),
  guestId: z.string().optional(),
  guest: z.object({ name: z.string().optional(), email: z.string().email() }).optional(),
});

const nightsBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86_400_000);

// Considera o Stripe configurado só com uma chave real (não placeholder).
function stripeConfigured() {
  const k = process.env.STRIPE_SECRET_KEY ?? "";
  return /^sk_(test|live)_/.test(k) && k.length > 40 && !/SUA_CHAVE|COLE|placeholder|xxx/i.test(k);
}

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }
  const { propertyId, checkIn, checkOut, guests } = parsed.data;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const nights = nightsBetween(start, end);
  if (!(nights > 0)) {
    return NextResponse.json({ error: "Período inválido (check-out deve ser após o check-in)." }, { status: 400 });
  }

  // Hóspede: usa o id (se logado) ou cria/encontra pelo e-mail.
  let guestId = parsed.data.guestId;
  if (!guestId) {
    const g = parsed.data.guest;
    if (!g?.email) {
      return NextResponse.json({ error: "Informe seu e-mail para reservar." }, { status: 400 });
    }
    const user = await prisma.user.upsert({
      where: { email: g.email },
      update: { name: g.name ?? undefined },
      create: { email: g.email, name: g.name },
    });
    guestId = user.id;
  }

  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property || property.status !== "ACTIVE" || property.purpose !== "SEASON") {
    return NextResponse.json({ error: "Imóvel indisponível para reserva." }, { status: 400 });
  }

  const blocked = await prisma.availability.count({
    where: { propertyId, isAvailable: false, date: { gte: start, lt: end } },
  });
  if (blocked > 0) {
    return NextResponse.json({ error: "Há datas indisponíveis no período." }, { status: 409 });
  }

  const nightly = Number(property.price);
  const subtotal = nightly * nights;
  const fees = Number(property.cleaningFee ?? 0);
  const total = subtotal + fees;

  const booking = await prisma.booking.create({
    data: {
      propertyId, guestId, checkIn: start, checkOut: end, guests,
      nights, subtotal, fees, total, status: "PENDING",
    },
  });

  // ---- MODO DEMO (sem Stripe configurado): confirma sem pagamento real ----
  if (!stripeConfigured()) {
    await prisma.booking.update({ where: { id: booking.id }, data: { status: "CONFIRMED" } });
    await prisma.payment.create({
      data: {
        kind: "BOOKING", amount: total, userId: guestId,
        bookingId: booking.id, status: "SUCCEEDED",
      },
    });
    return NextResponse.json({
      url: `${process.env.APP_URL ?? ""}/reservas/${booking.id}?status=ok&demo=1`,
      demo: true,
    });
  }

  // ---- Stripe real ----
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    locale: "pt-BR",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "brl",
          unit_amount: toCents(total),
          product_data: {
            name: `Reserva — ${property.title}`,
            description: `${nights} noite(s) · ${guests} hóspede(s)`,
          },
        },
      },
    ],
    metadata: { kind: "BOOKING", bookingId: booking.id },
    success_url: `${process.env.APP_URL}/reservas/${booking.id}?status=ok`,
    cancel_url: `${process.env.APP_URL}/imovel/${property.slug}?status=cancel`,
  });

  await prisma.payment.create({
    data: {
      kind: "BOOKING", amount: total, userId: guestId,
      bookingId: booking.id, stripeCheckoutId: session.id, status: "PENDING",
    },
  });

  return NextResponse.json({ bookingId: booking.id, url: session.url });
}
