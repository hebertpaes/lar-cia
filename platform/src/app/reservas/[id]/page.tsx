import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fmtBRL } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ReservaPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { status?: string };
}) {
  const b = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { property: true },
  });
  if (!b) notFound();

  const paid = b.status === "CONFIRMED";
  const cancelled = searchParams.status === "cancel";

  return (
    <main className="mx-auto max-w-lg px-6 py-16 text-center">
      <div className="text-5xl">{paid ? "✅" : cancelled ? "⚠️" : "⏳"}</div>
      <h1 className="mt-4 text-2xl font-bold">
        {paid ? "Reserva confirmada!" : cancelled ? "Pagamento cancelado" : "Reserva registrada"}
      </h1>
      <p className="mt-2 text-slate-600">
        {paid
          ? "Recebemos seu pagamento. Enviaremos os detalhes por e-mail."
          : cancelled
            ? "Você cancelou o checkout. A reserva não foi paga."
            : "Estamos confirmando o pagamento — isso pode levar alguns instantes (Pix/boleto)."}
      </p>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-left">
        <h2 className="font-semibold">{b.property.title}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {new Date(b.checkIn).toLocaleDateString("pt-BR")} → {new Date(b.checkOut).toLocaleDateString("pt-BR")} ·{" "}
          {b.nights} noite(s) · {b.guests} hóspede(s)
        </p>
        <p className="mt-3 text-lg font-bold text-brand">{fmtBRL(Number(b.total))}</p>
      </div>

      <div className="mt-8 flex justify-center gap-3">
        <Link href="/minhas-reservas" className="rounded-full bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-600">
          Minhas reservas
        </Link>
        <Link href="/imoveis" className="rounded-full border border-slate-200 px-5 py-3 font-semibold">
          Ver mais imóveis
        </Link>
      </div>
    </main>
  );
}
