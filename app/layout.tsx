import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "SUR Giveaway — Sempre Um Rock",
  description: "Ferramenta interna de sorteios do Sempre Um Rock",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning={true}>
      <body>{children}</body>
    </html>
  );
}
