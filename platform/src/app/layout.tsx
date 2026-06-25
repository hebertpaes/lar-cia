import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lar&Cia — Imóveis & Reservas",
  description:
    "Compre, alugue ou reserve imóveis em Cuiabá e região. Reserva de temporada com checkout online (Pix, boleto, cartão).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
