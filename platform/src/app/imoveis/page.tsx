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
  searchParams: { purpose?: string; q?: string };
}) {
  const sel = (searchParams.purpose || "").toUpperCase();
  const q = (searchParams.q || "").trim();

  const where: Prisma.PropertyWhereInput = { status: PropertyStatus.ACTIVE };
  if ((["SALE", "RENT", "SEASON"] as string[]).includes(sel)) where.purpose = sel as Purpose;
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
      { neighborhood: { contains: q, mode: "insensitive" } },
    ];
  }

  const properties = await prisma.property.findMany({
    where,
    include: { images: { orderBy: { position: "asc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-sm text-brand">← Início</Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/minhas-reservas" className="text-slate-600 hover:text-brand">Minhas reservas</Link>
          <Link href="/login" className="font-semibold text-brand">Entrar</Link>
        </nav>
      </div>

      <h1 className="text-2xl font-bold">Imóveis ({properties.length})</h1>

      <form action="/imoveis" className="mt-4 flex gap-2">
        {sel && <input type="hidden" name="purpose" value={sel.toLowerCase()} />}
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por cidade, bairro ou título…"
          className="w-full rounded-full border border-slate-200 px-5 py-2.5 text-sm"
        />
        <button className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white">Buscar</button>
      </form>

      <div className="mb-6 mt-4 flex flex-wrap gap-2">
        {TABS.map(([v, label]) => {
          const active = sel === v || (!sel && !v);
          const href = v ? `/imoveis?purpose=${v.toLowerCase()}` : "/imoveis";
          return (
            <Link
              key={v || "all"}
              href={q ? `${href}${v ? "&" : "?"}q=${encodeURIComponent(q)}` : href}
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
          Nenhum imóvel encontrado{q ? ` para “${q}”` : ""}. {`(Rode `}<code>npm run db:seed</code>{` se o banco estiver vazio.)`}
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
