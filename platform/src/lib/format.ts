export const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

export const areaLabel = (a: number) =>
  a >= 10000 ? `${(a / 10000).toLocaleString("pt-BR")} ha` : `${a} m²`;

export const purposeSuffix = (purpose: string) =>
  purpose === "SEASON" ? "/noite" : purpose === "RENT" ? "/mês" : "";

export const purposeLabel = (purpose: string) =>
  (({ SALE: "Venda", RENT: "Aluguel", SEASON: "Temporada" }) as Record<string, string>)[purpose] ?? purpose;
