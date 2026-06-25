import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

// Webhook do Stripe — confirma reservas/sinais quando o pagamento é aprovado.
// Configure o endpoint em https://dashboard.stripe.com/webhooks apontando para
// /api/webhooks/stripe e copie o "Signing secret" para STRIPE_WEBHOOK_SECRET.
export const dynamic = "force-dynamic";

const methodFrom = (s: Stripe.Checkout.Session): "CARD" | "PIX" | "BOLETO" | null => {
  const t = s.payment_method_types?.[0];
  return t === "pix" ? "PIX" : t === "boleto" ? "BOLETO" : t === "card" ? "CARD" : null;
};

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig ?? "", process.env.STRIPE_WEBHOOK_SECRET ?? "");
  } catch (err) {
    return new NextResponse(`Webhook signature error: ${(err as Error).message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    const kind = s.metadata?.kind;
    const method = methodFrom(s);

    if (kind === "BOOKING" && s.metadata?.bookingId) {
      const bookingId = s.metadata.bookingId;
      await prisma.$transaction([
        prisma.booking.update({ where: { id: bookingId }, data: { status: "CONFIRMED" } }),
        prisma.payment.updateMany({
          where: { bookingId },
          data: { status: "SUCCEEDED", method, stripePaymentIntentId: (s.payment_intent as string) ?? undefined },
        }),
      ]);
    } else if (kind === "DEPOSIT" && s.metadata?.reservationId) {
      const reservationId = s.metadata.reservationId;
      await prisma.$transaction([
        prisma.reservation.update({ where: { id: reservationId }, data: { status: "PAID" } }),
        prisma.payment.updateMany({
          where: { reservationId },
          data: { status: "SUCCEEDED", method, stripePaymentIntentId: (s.payment_intent as string) ?? undefined },
        }),
      ]);
    }
  }

  return NextResponse.json({ received: true });
}
