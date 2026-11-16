"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import {
  BranchScopeProvider,
  useBranchScope,
} from "@/lib/branch-scope-context";
import { ComercioProvider, useComercio } from "@/lib/comercio-context";

function ShellInner({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { comercio } = useComercio();
  const { vendedor } = useBranchScope();

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
          <div className="ml-auto text-right text-sm">
            <p className="font-medium text-charcoal">{comercio?.nombre ?? "Venta local"}</p>
            {vendedor ? <p className="text-xs text-muted-foreground">Operador: {vendedor.nombre}</p> : null}
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
  const pathname = usePathname();
  if (pathname === "/login") {
    return <>{children}</>;
  }
  return (
    <ComercioProvider>
      <BranchScopeProvider>
        <ShellInner>{children}</ShellInner>
      </BranchScopeProvider>
    </ComercioProvider>
  );
}
