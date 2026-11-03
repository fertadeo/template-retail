"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api-client";
import { isApiMode } from "@/lib/api-config";
import type { Comercio } from "@/lib/types";

const STORAGE_KEY = "retail360.comercioId";

type Ctx = {
  comercios: Comercio[];
  comercioId: string | null;
  comercio: Comercio | null;
  loading: boolean;
  setComercioId: (id: string) => void;
  reload: () => void;
};

const ComercioContext = createContext<Ctx | null>(null);

export function ComercioProvider({ children }: { children: ReactNode }) {
  const [comercios, setComercios] = useState<Comercio[]>([]);
  const [comercioId, setComercioIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    const run = async () => {
      try {
        if (!isApiMode()) {
          const demo: Comercio[] = [
            {
              id: "co_principal",
              codigo: "principal",
              nombre: "Comercio principal",
              rubro: "",
              direccion: "",
              activa: true,
              esDefault: true,
            },
          ];
          setComercios(demo);
          setComercioIdState(demo[0].id);
          return;
        }
        const list = await api.listComercios(true);
        setComercios(list);
        const stored =
          typeof window !== "undefined"
            ? localStorage.getItem(STORAGE_KEY)
            : null;
        const next =
          list.find((c) => c.id === stored)?.id ??
          list.find((c) => c.esDefault)?.id ??
          list[0]?.id ??
          null;
        setComercioIdState(next);
        if (next) localStorage.setItem(STORAGE_KEY, next);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  function setComercioId(id: string) {
    setComercioIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, id);
    }
  }

  const comercio = comercios.find((c) => c.id === comercioId) ?? null;

  return (
    <ComercioContext.Provider
      value={{
        comercios,
        comercioId,
        comercio,
        loading,
        setComercioId,
        reload,
      }}
    >
      {children}
    </ComercioContext.Provider>
  );
}

export function useComercio(): Ctx {
  const ctx = useContext(ComercioContext);
  if (!ctx) {
    throw new Error("useComercio debe usarse dentro de ComercioProvider");
  }
  return ctx;
}

export function useComercioId(): string | null {
  return useComercio().comercioId;
}
