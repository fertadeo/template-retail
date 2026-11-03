import type { Metadata } from "next";
import { Source_Sans_3, Syne } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const syne = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Retail 360",
  description:
    "Retail 360: multicomercio, catálogo, POS, sync WooCommerce y Mercado Libre.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${sourceSans.variable} ${syne.variable} h-full antialiased`}
    >
      <body className="flex h-full min-h-0 flex-col font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
