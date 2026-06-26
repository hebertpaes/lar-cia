import Link from "next/link";

export default function Anunciar() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-center">
      <Link href="/" className="text-sm text-brand">← Início</Link>
      <h1 className="mt-4 text-3xl font-bold">Anuncie seu imóvel</h1>
      <p className="mx-auto mt-3 max-w-md text-slate-600">
        Planos para corretores e proprietários publicarem imóveis com checkout integrado.
        (Assinatura via Stripe — Fase 3 do roadmap.)
      </p>
      <a
        href="https://wa.me/5565999900005?text=Quero%20anunciar%20no%20Lar%26Cia"
        target="_blank"
        rel="noopener"
        className="mt-6 inline-block rounded-full bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-600"
      >
        Falar no WhatsApp
      </a>
    </main>
  );
}
