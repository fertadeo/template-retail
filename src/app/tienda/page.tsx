import type { Metadata } from "next";
import { PublicStore } from "@/components/public-store";

export const metadata: Metadata = {
  title: "Tienda",
  description: "Catálogo público — pedí por WhatsApp.",
};

export default function TiendaPage() {
  return <PublicStore />;
}
