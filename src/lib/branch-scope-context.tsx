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
import { listUsers as listDemoUsers } from "@/lib/memory-store";
import { isApiMode } from "@/lib/api-config";
import type { Branch, UserAccount } from "@/lib/types";


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
        const users: UserAccount[] = isApiMode()
          ? [await api.getSession().then(({ user }) => ({ ...user, activa: true,
              branchIds: [], functions: [], createdAt: "", updatedAt: "" }))]
          : listDemoUsers(true);
        setBranches([]);
        setVendedores(users);
        setBranchScopeState("all");
        const current = users[0]?.id ?? null;
        setVendedorIdState(current);
      } finally { setLoading(false); }
    };
    void run();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void reload(), 0);
    return () => clearTimeout(timer);
  }, [reload]);

  function setBranchScope() { setBranchScopeState("all"); }
  function setVendedorId() { return; }

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
