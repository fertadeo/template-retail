"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import {
  BranchScopeProvider,
  useBranchScope,
} from "@/lib/branch-scope-context";
import { ComercioProvider, useComercio } from "@/lib/comercio-context";
import { BRANCHES_ENABLED } from "@/lib/features";

function ShellInner({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { comercios, comercioId, setComercioId, comercio } = useComercio();
  const {
    branches,
    branchScope,
    setBranchScope,
    vendedores,
    vendedorId,
    setVendedorId,
  } = useBranchScope();

  return (
    <div className="aurix-atmosphere relative flex h-dvh max-h-dvh min-h-0 overflow-hidden">
      <div className="aurix-grain absolute inset-0 overflow-hidden" aria-hidden />
      <AppSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="lg:hidden"
            aria-label="Abrir menú"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-4" />
          </Button>
          <p className="font-display text-lg font-semibold text-charcoal lg:hidden">
            Aurix<span className="text-teal">.</span> Retail 360
          </p>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <label className="hidden text-xs text-muted-foreground sm:inline">
              Comercio
            </label>
            <select
              className="h-9 max-w-[12rem] rounded-lg border border-border bg-card px-2 text-sm"
              value={comercioId ?? ""}
              onChange={(e) => setComercioId(e.target.value)}
              title={comercio?.rubro || "Comercio activo"}
            >
              {comercios.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                  {c.rubro ? ` · ${c.rubro}` : ""}
                </option>
              ))}
            </select>

            {BRANCHES_ENABLED ? (
              <>
                <label className="hidden text-xs text-muted-foreground md:inline">
                  Sucursal
                </label>
                <select
                  className="h-9 max-w-[12rem] rounded-lg border border-border bg-card px-2 text-sm"
                  value={branchScope}
                  onChange={(e) => setBranchScope(e.target.value)}
                  title="Alcance: todas o una sucursal"
                >
                  <option value="all">Todas las sucursales</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nombre}
                      {b.rubro ? ` · ${b.rubro}` : ""}
                    </option>
                  ))}
                </select>
              </>
            ) : null}

            {vendedores.length > 0 ? (
              <>
                <label className="hidden text-xs text-muted-foreground lg:inline">
                  Operador
                </label>
                <select
                  className="h-9 max-w-[11rem] rounded-lg border border-border bg-card px-2 text-sm"
                  value={vendedorId ?? ""}
                  onChange={(e) => setVendedorId(e.target.value || null)}
                  title="Vendedor / operador de caja"
                >
                  <option value="">Sin asignar</option>
                  {vendedores.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre}
                    </option>
                  ))}
                </select>
              </>
            ) : null}
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl animate-aurix-fade">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ComercioProvider>
      <BranchScopeProvider>
        <ShellInner>{children}</ShellInner>
      </BranchScopeProvider>
    </ComercioProvider>
  );
}
