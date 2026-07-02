import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fmtBRL } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  PENDING: "Aguardando pagamento",
  CONFIRMED: "Confirmada ✓",
  CANCELLED: "Cancelada",
  COMPLETED: "Concluída",
};

export default async function MinhasReservas() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login?next=/minhas-reservas");

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  const bookings = user
    ? await prisma.booking.findMany({
        where: { guestId: user.id },
        include: { property: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between">
        <Link href="/imoveis" className="text-sm text-brand">← Imóveis</Link>
        <h1 className="text-2xl font-bold">Minhas reservas</h1>
      </div>

      {bookings.length === 0 ? (
        <p className="mt-8 text-slate-500">Você ainda não tem reservas.</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {bookings.map((b) => (
            <li key={b.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <Link href={`/imovel/${b.property.slug}`} className="font-semibold hover:text-brand">
                  {b.property.title}
                </Link>
                <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-700">
                  {STATUS[b.status] ?? b.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {new Date(b.checkIn).toLocaleDateString("pt-BR")} → {new Date(b.checkOut).toLocaleDateString("pt-BR")} ·
                {" "}{b.nights} noite(s) · {b.guests} hóspede(s)
              </p>
              <p className="mt-2 font-bold text-brand">{fmtBRL(Number(b.total))}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
