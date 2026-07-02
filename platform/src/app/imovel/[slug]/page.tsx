import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fmtBRL, areaLabel, purposeSuffix } from "@/lib/format";
import { BookingWidget } from "@/components/BookingWidget";

export const dynamic = "force-dynamic";

export default async function PropertyPage({ params }: { params: { slug: string } }) {
  const p = await prisma.property.findUnique({
    where: { slug: params.slug },
    include: { images: { orderBy: { position: "asc" } } },
  });
  if (!p) notFound();

  const specs: [string, string | number][] = [
    ["Quartos", p.bedrooms],
    ["Suítes", p.suites],
    ["Banheiros", p.bathrooms],
    ["Vagas", p.garages],
    ["Área", areaLabel(Number(p.area))],
  ];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/imoveis" className="text-sm text-brand">← Imóveis</Link>
      <h1 className="mt-3 text-3xl font-bold">{p.title}</h1>
      <p className="mt-1 text-slate-500">
        📍 {p.neighborhood ? `${p.neighborhood}, ` : ""}{p.city} - {p.state}
        {p.isVerified && <span className="ml-2 font-semibold text-brand">✓ Verificado</span>}
      </p>

      {p.images.length > 0 && (
        <div className="mt-5 grid gap-2 md:grid-cols-4 md:grid-rows-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.images[0].url}
            alt={p.title}
            className="md:col-span-2 md:row-span-2 aspect-[4/3] w-full rounded-2xl object-cover md:aspect-auto md:h-full"
          />
          {p.images.slice(1, 5).map((img) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={img.id} src={img.url} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" />
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <div className="flex flex-wrap gap-6 border-y border-slate-200 py-4">
            {specs.map(([label, value]) => (
              <div key={label}>
                <div className="text-xl font-bold">{value}</div>
                <div className="text-xs text-slate-400">{label}</div>
              </div>
            ))}
          </div>
          <p className="mt-6 whitespace-pre-line text-slate-700">{p.description}</p>
          {p.amenities.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {p.amenities.map((a) => (
                <span key={a} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">📍 {a}</span>
              ))}
            </div>
          )}
        </div>

        <aside className="md:col-span-1">
          <div className="sticky top-6 rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="text-2xl font-bold text-brand">
              {fmtBRL(Number(p.price))}
              <span className="text-sm font-medium text-slate-400">{purposeSuffix(p.purpose)}</span>
            </div>
            <div className="mt-4">
              {p.purpose === "SEASON" ? (
                <BookingWidget propertyId={p.id} nightly={Number(p.price)} />
              ) : (
                <a
                  href={`https://wa.me/5565999900005?text=${encodeURIComponent(`Tenho interesse no imóvel "${p.title}".`)}`}
                  target="_blank"
                  rel="noopener"
                  className="block rounded-full bg-brand px-5 py-3 text-center font-semibold text-white hover:bg-brand-600"
                >
                  💬 Tenho interesse
                </a>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
