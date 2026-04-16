import type { Metadata } from "next";
import { AppFooter } from "../components/AppFooter";
import "./globals.css";

export const metadata: Metadata = {
  title: "Taj Platform — Portail",
  description:
    "Back-office restaurant, caisse commandes et cuisine sur le même domaine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="app-body-stack">
        <div className="app-body-main">{children}</div>
        <AppFooter />
      </body>
    </html>
  );
}
