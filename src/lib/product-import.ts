import type { ProductCategory } from "@/lib/types";

export type ImportedProductDraft = {
  nombre: string;
  sku: string;
  descripcion: string;
  precio: number;
  categoria: ProductCategory | string;
  sourceUrl: string;
  images: Array<{
    filename: string;
    mime: string;
    dataUrl: string | null;
    sourceUrl: string;
  }>;
  warnings: string[];
};

export function dataUrlByteSize(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return 0;
  const b64 = dataUrl.slice(comma + 1);
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
}
