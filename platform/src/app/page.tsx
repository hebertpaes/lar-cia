import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-20">
      <header className="mb-12 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-sm font-extrabold text-white">
          L&amp;C
        </span>
        <div className="leading-tight">
          <strong className="text-lg">Lar&amp;Cia</strong>
          <p className="text-xs text-slate-500">Hebert Paes · Imóveis & Reservas</p>
        </div>
      </header>

      <section className="rounded-3xl bg-brand-soft p-10 text-center">
        <span className="inline-block rounded-full bg-white px-4 py-1 text-xs font-semibold text-brand-700 shadow-sm">
          🏆 Cuiabá &amp; região — MT
        </span>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">
          Compre, alugue ou reserve
          <br /> o imóvel ideal
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-slate-600">
          Reserva de temporada com <strong>checkout online</strong> (Pix, boleto, cartão),
          sinal de venda, propostas de aluguel e planos para anunciantes.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/imoveis" className="rounded-full bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-600">
            Ver imóveis
          </Link>
          <Link href="/anunciar" className="rounded-full border border-brand px-6 py-3 font-semibold text-brand hover:bg-white">
            Anunciar
          </Link>
        </div>
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-4">
        {[
          ["🏖️", "Temporada", "Reserve por noite com pagamento online."],
          ["🏠", "Venda", "Pague o sinal e garanta o imóvel."],
          ["🔑", "Aluguel", "Envie proposta e pague o 1º aluguel."],
          ["📣", "Anuncie", "Planos para corretores publicarem."],
        ].map(([emoji, t, d]) => (
          <article key={t} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-2xl">{emoji}</div>
            <h3 className="mt-2 font-semibold">{t}</h3>
            <p className="mt-1 text-sm text-slate-500">{d}</p>
          </article>
        ))}
      </section>

      <p className="mt-12 text-center text-sm text-slate-400">
        Fundação do app (Fase 1). Veja <code>platform/ARCHITECTURE.md</code> para o roadmap.
      </p>
    </main>
  );
}
