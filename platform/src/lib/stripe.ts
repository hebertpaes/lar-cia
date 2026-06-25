import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  // Em build sem env, evita crash; rotas que usam Stripe exigem a chave em runtime.
  console.warn("STRIPE_SECRET_KEY não definida.");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-06-20",
  appInfo: { name: "Lar&Cia" },
});

/** Converte reais (number) para centavos (inteiro) exigidos pelo Stripe. */
export const toCents = (reais: number) => Math.round(reais * 100);
