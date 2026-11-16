"use client";

import { useCallback, useEffect, useState } from "react";
import { useComercio } from "@/lib/comercio-context";

/** Commerce-scoped, cancellable requests; never run before the scope is ready. */
export function useCatalogQuery<T>(
  parts: unknown[], loader: (signal: AbortSignal) => Promise<T>, delay = 0, enabled = true
) {
  const { comercioId, loading: scopeLoading } = useComercio();
  const [version, setVersion] = useState(0);
  const key = JSON.stringify([comercioId, scopeLoading, enabled, ...parts, version]);
  const [result, setResult] = useState<{ key: string; data?: T; error?: string } | null>(null);
  useEffect(() => {
    if (scopeLoading || !comercioId || !enabled) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      loader(controller.signal).then(data => {
        if (!controller.signal.aborted) setResult({ key, data });
      }).catch((err: unknown) => {
        if (!controller.signal.aborted) setResult({ key, error: err instanceof Error ? err.message : "No se pudo cargar." });
      });
    }, delay);
    return () => { clearTimeout(timer); controller.abort(); };
    // key includes every request parameter and its scope; loader uses that snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const reload = useCallback(() => setVersion(v => v + 1), []);
  const current = result?.key === key ? result : null;
  return { data: current?.data, error: current?.error,
    loading: !current, version, reload };
}
