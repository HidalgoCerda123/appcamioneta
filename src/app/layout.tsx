import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ConstruservAPP — Gestión de Flota",
  description: "Sistema de gestión de flota y mantenciones para Construserv Ltda.",
  manifest: "/manifest.json",
  themeColor: "#E8500A",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
