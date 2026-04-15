import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Taj Platform — Back-office",
  description: "Menus, promotions et paramètres par restaurant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        {children}
      </body>
    </html>
  );
}
