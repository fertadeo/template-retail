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
              nombre: "Venta local",
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
        const business = await api.getLocalBusiness();
        setComercios([business]);
        setComercioIdState(business.id);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Compatibility for local data hooks: the profile cannot be switched.
  function setComercioId() { return; }

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
