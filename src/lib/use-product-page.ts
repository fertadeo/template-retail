"use client";

import { useState } from "react";
import { type ProductPageOptions } from "@/lib/api-client";
import { listProductsPage } from "@/lib/catalog-data";
import { useComercioId } from "@/lib/comercio-context";
import { useCatalogQuery } from "@/lib/use-catalog-query";

export function useProductPage(options: Omit<ProductPageOptions, "page">) {
  const comercioId = useComercioId();
  const filterKey = JSON.stringify([comercioId, options]);
  const [cursor, setCursor] = useState({ key: filterKey, page: 1 });
  if (cursor.key !== filterKey) setCursor({ key: filterKey, page: 1 });
  const page = cursor.key === filterKey ? cursor.page : 1;
  const query = useCatalogQuery(["products", options, page],
    signal => listProductsPage({ ...options, page }, signal), options.q ? 180 : 0);
  return { ...query, page,
    setPage: (next: number) => setCursor({ key: filterKey, page: Math.max(1, next) }) };
}
