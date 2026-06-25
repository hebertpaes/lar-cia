import Link from "next/link";
import { Prisma, Purpose, PropertyStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PropertyCard } from "@/components/PropertyCard";

export const dynamic = "force-dynamic";

const TABS: ReadonlyArray<readonly [string, string]> = [
  ["", "Todos"],
  ["SEASON", "Temporada"],
  ["SALE", "Venda"],
  ["RENT", "Aluguel"],
];

export default async function ImoveisPage({
  searchParams,
}: {
  searchParams: { purpose?: string };
}) {
  const sel = (searchParams.purpose || "").toUpperCase();
  const where: Prisma.PropertyWhereInput = { status: PropertyStatus.ACTIVE };
  if ((["SALE", "RENT", "SEASON"] as string[]).includes(sel)) where.purpose = sel as Purpose;

  const properties = await prisma.property.findMany({
    where,
    include: { images: { orderBy: { position: "asc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-sm text-brand">← Início</Link>
        <h1 className="text-2xl font-bold">Imóveis ({properties.length})</h1>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map(([v, label]) => {
          const active = sel === v || (!sel && !v);
          return (
            <Link
              key={v || "all"}
              href={v ? `/imoveis?purpose=${v.toLowerCase()}` : "/imoveis"}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                active ? "bg-brand text-white" : "border border-slate-200 bg-white"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {properties.length === 0 ? (
        <p className="text-slate-500">
          Nenhum imóvel ainda. Rode <code>npm run db:seed</code> para popular o banco.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <PropertyCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </main>
  );
}
