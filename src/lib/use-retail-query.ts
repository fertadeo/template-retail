"use client";

import { useCallback, useEffect, useState } from "react";
import { useBranchId } from "@/lib/branch-scope-context";
import { useComercioId } from "@/lib/comercio-context";

export function useRetailQuery<T>(
  loader: () => Promise<T>,
  deps: unknown[] = []
) {
  const comercioId = useComercioId();
  const branchId = useBranchId();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loader()
      .then((value) => {
        if (!cancelled) {
          setData(value);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "No se pudo cargar."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, comercioId, branchId, ...deps]);

  return { data, error, loading, reload, setData };
}
