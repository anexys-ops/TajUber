import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Taj — Caisse",
  description: "Prise de commande restaurant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
