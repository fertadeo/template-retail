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
import type { Branch, UserAccount } from "@/lib/types";

const BRANCH_KEY = "retail360.branchScope";
const VENDEDOR_KEY = "retail360.vendedorId";

/** "all" = todas las sucursales (admin/superadmin). */
export type BranchScope = "all" | string;

type Ctx = {
  branches: Branch[];
  branchScope: BranchScope;
  setBranchScope: (scope: BranchScope) => void;
  /** Id concreto o null si scope=all */
  branchId: string | null;
  vendedores: UserAccount[];
  vendedorId: string | null;
  setVendedorId: (id: string | null) => void;
  vendedor: UserAccount | null;
  loading: boolean;
  reload: () => void;
};

const BranchScopeContext = createContext<Ctx | null>(null);

export function BranchScopeProvider({ children }: { children: ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [vendedores, setVendedores] = useState<UserAccount[]>([]);
  const [branchScope, setBranchScopeState] = useState<BranchScope>("all");
  const [vendedorId, setVendedorIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    const run = async () => {
      try {
        if (!isApiMode()) {
          const demoBranches: Branch[] = [
            {
              id: "br_musicanoba",
              codigo: "musicanoba",
              nombre: "Musicanoba",
              direccion: "",
              rubro: "Tecnología",
              activa: true,
              esDefault: true,
            },
            {
              id: "br_mi_espacio",
              codigo: "mi-espacio",
              nombre: "Mi Espacio",
              direccion: "",
              rubro: "Tecnología",
              activa: true,
              esDefault: false,
            },
            {
              id: "br_bella_dona",
              codigo: "bella-dona",
              nombre: "Bella Dona",
              direccion: "",
              rubro: "Bijouterie",
              activa: true,
              esDefault: false,
            },
          ];
          setBranches(demoBranches);
          setVendedores([]);
          setBranchScopeState("all");
          return;
        }
        const [br, users] = await Promise.all([
          api.listBranches(true),
          api.listUsers(true).catch(() => [] as UserAccount[]),
        ]);
        setBranches(br);
        const sellers = users.filter(
          (u) =>
            u.activa &&
            (u.role === "vendedor" ||
              u.role === "administrador" ||
              u.role === "superadmin")
        );
        setVendedores(sellers);

        const storedBranch =
          typeof window !== "undefined"
            ? localStorage.getItem(BRANCH_KEY)
            : null;
        const nextScope: BranchScope =
          storedBranch === "all" || !storedBranch
            ? "all"
            : br.some((b) => b.id === storedBranch)
              ? storedBranch
              : "all";
        setBranchScopeState(nextScope);

        const storedVend =
          typeof window !== "undefined"
            ? localStorage.getItem(VENDEDOR_KEY)
            : null;
        const nextVend =
          sellers.find((u) => u.id === storedVend)?.id ??
          sellers[0]?.id ??
          null;
        setVendedorIdState(nextVend);
        if (nextVend) localStorage.setItem(VENDEDOR_KEY, nextVend);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  function setBranchScope(scope: BranchScope) {
    setBranchScopeState(scope);
    if (typeof window !== "undefined") {
      localStorage.setItem(BRANCH_KEY, scope);
    }
  }

  function setVendedorId(id: string | null) {
    setVendedorIdState(id);
    if (typeof window !== "undefined") {
      if (id) localStorage.setItem(VENDEDOR_KEY, id);
      else localStorage.removeItem(VENDEDOR_KEY);
    }
  }

  const branchId = branchScope === "all" ? null : branchScope;
  const vendedor = vendedores.find((u) => u.id === vendedorId) ?? null;

  return (
    <BranchScopeContext.Provider
      value={{
        branches,
        branchScope,
        setBranchScope,
        branchId,
        vendedores,
        vendedorId,
        setVendedorId,
        vendedor,
        loading,
        reload,
      }}
    >
      {children}
    </BranchScopeContext.Provider>
  );
}

export function useBranchScope(): Ctx {
  const ctx = useContext(BranchScopeContext);
  if (!ctx) {
    throw new Error("useBranchScope debe usarse dentro de BranchScopeProvider");
  }
  return ctx;
}

export function useBranchId(): string | null {
  return useBranchScope().branchId;
}
