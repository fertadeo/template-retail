"use client";

import { useState } from "react";
import { listMediaPage } from "@/lib/catalog-data";
import { useComercioId } from "@/lib/comercio-context";
import { useCatalogQuery } from "@/lib/use-catalog-query";
import type { MediaKind } from "@/lib/media-library";

export function useMediaPage(kind: MediaKind, q: string) {
  const comercioId = useComercioId();
  const key = JSON.stringify([comercioId, kind, q]);
  const [cursor, setCursor] = useState({ key, page: 1 });
  if (cursor.key !== key) setCursor({ key, page: 1 });
  const page = cursor.key === key ? cursor.page : 1;
  const query = useCatalogQuery(["media", kind, q, page], signal =>
    listMediaPage({ kind, q, page, pageSize: 24 }, signal), q ? 180 : 0);
  return { ...query, page, setPage: (next: number) => setCursor({ key, page: Math.max(1, next) }) };
}
