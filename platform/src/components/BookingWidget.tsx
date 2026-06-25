"use client";
import { useState } from "react";

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

export function BookingWidget({ propertyId, nightly }: { propertyId: string; nightly: number }) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const nights =
    checkIn && checkOut
      ? Math.max(0, Math.round((+new Date(checkOut) - +new Date(checkIn)) / 86_400_000))
      : 0;
  const total = nights * nightly;

  async function reservar() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/checkout/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, checkIn, checkOut, guests, guest: { name, email } }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setError(data.error || "Não foi possível iniciar a reserva.");
    } catch {
      setError("Erro de rede.");
    } finally {
      setLoading(false);
    }
  }

  const input = "mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm";
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-slate-500">
          Check-in
          <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className={input} />
        </label>
        <label className="text-xs text-slate-500">
          Check-out
          <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className={input} />
        </label>
      </div>
      <label className="block text-xs text-slate-500">
        Hóspedes
        <input type="number" min={1} value={guests} onChange={(e) => setGuests(Number(e.target.value))} className={input} />
      </label>
      <input placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} className={`${input} mt-0`} />
      <input placeholder="Seu e-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${input} mt-0`} />
      {nights > 0 && (
        <div className="flex justify-between text-sm">
          <span>{fmt(nightly)} × {nights} noite(s)</span>
          <strong>{fmt(total)}</strong>
        </div>
      )}
      <button
        disabled={loading || nights <= 0 || !email}
        onClick={reservar}
        className="w-full rounded-full bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
      >
        {loading ? "Processando…" : "Reservar e pagar"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-center text-xs text-slate-400">Pagamento seguro via Stripe (Pix ou cartão)</p>
    </div>
  );
}
