import { Suspense } from "react";
import type { Metadata } from "next";
import { PublicCatalog } from "@/components/catalog/public-catalog";

export const metadata: Metadata = {
  title: "Catálogo · Pedí por WhatsApp",
  description:
    "Explorá productos, armá tu carrito y coordiná tu pedido directamente con el local por WhatsApp. Sin crear una cuenta.",
  openGraph: {
    title: "Encontrá tus favoritos y pedí por WhatsApp",
    description:
      "Elegí productos, armá tu carrito y hablá directamente con el local.",
    type: "website",
  },
};
export default function PublicCatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="catalog-surface flex min-h-dvh items-center justify-center text-sm text-[#66736b]">
          Abriendo catálogo…
        </div>
      }
    >
      <PublicCatalog />
    </Suspense>
  );
}
