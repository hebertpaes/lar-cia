import Link from "next/link";
import { fmtBRL, areaLabel, purposeSuffix, purposeLabel } from "@/lib/format";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function PropertyCard({ p }: { p: any }) {
  const img: string | undefined = p.images?.[0]?.url;
  return (
    <Link
      href={`/imovel/${p.slug}`}
      className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={p.title} className="h-full w-full object-cover transition group-hover:scale-105" />
        ) : (
          <div className="grid h-full place-items-center text-4xl">🏠</div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold shadow">
          {purposeLabel(p.purpose)}
        </span>
        {p.isVerified && (
          <span className="absolute right-3 top-3 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
            ✓ Verificado
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold leading-tight">{p.title}</h3>
        <p className="mt-1 text-sm text-slate-500">
          📍 {p.neighborhood ? `${p.neighborhood}, ` : ""}{p.city} - {p.state}
        </p>
        <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-600">
          <span>🛏 {p.bedrooms}</span>
          <span>🛁 {p.bathrooms}</span>
          {p.garages ? <span>🚗 {p.garages}</span> : null}
          <span>📐 {areaLabel(Number(p.area))}</span>
        </div>
        <div className="mt-2 text-lg font-bold text-brand">
          {fmtBRL(Number(p.price))}
          <span className="text-xs font-medium text-slate-400">{purposeSuffix(p.purpose)}</span>
        </div>
      </div>
    </Link>
  );
}
