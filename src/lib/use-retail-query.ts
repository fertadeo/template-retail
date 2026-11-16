"use client";

import { useBranchScope } from "@/lib/branch-scope-context";
import { useCatalogQuery } from "@/lib/use-catalog-query";

export function useRetailQuery<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const { branchId, vendedorId, loading: scopeLoading } = useBranchScope();
  const query = useCatalogQuery(["retail", branchId, vendedorId, ...deps],
    () => loader(), 0, !scopeLoading);
  return { data: query.data ?? null, error: query.error ?? null,
    loading: query.loading, reload: query.reload };
}
