"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/minhas-reservas";
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError("");
    setLoading(true);
    try {
      if (mode === "register") {
        const r = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const d = await r.json();
        if (!r.ok) { setError(d.error || "Falha no cadastro."); return; }
      }
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) setError("E-mail ou senha inválidos.");
      else router.push(next);
    } finally {
      setLoading(false);
    }
  }

  const input = "w-full rounded-lg border border-slate-200 p-2.5 text-sm";
  return (
    <main className="mx-auto max-w-sm px-6 py-20">
      <Link href="/" className="text-sm text-brand">← Início</Link>
      <h1 className="mt-4 text-2xl font-bold">{mode === "login" ? "Entrar" : "Criar conta"}</h1>
      <div className="mt-6 space-y-3">
        {mode === "register" && (
          <input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} className={input} />
        )}
        <input placeholder="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        <input placeholder="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          onClick={submit}
          disabled={loading || !email || !password}
          className="w-full rounded-full bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {loading ? "…" : mode === "login" ? "Entrar" : "Cadastrar"}
        </button>
      </div>
      <button
        onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
        className="mt-4 w-full text-center text-sm text-slate-500 hover:text-brand"
      >
        {mode === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
      </button>
    </main>
  );
}
