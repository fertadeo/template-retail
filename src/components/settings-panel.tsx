"use client";

import { useState } from "react";
import { AccountsPanel } from "@/components/accounts-panel";
import { PriceListsPanel } from "@/components/price-lists-panel";
import { cn } from "@/lib/utils";

type SettingsTab = "precios" | "cuentas";

export function SettingsPanel() {
  const [tab, setTab] = useState<SettingsTab>("precios");

  const tabs: Array<{ id: SettingsTab; label: string }> = [
    { id: "precios", label: "Listas de precios" },
    { id: "cuentas", label: "Centro de cuentas" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Sistema
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-charcoal">
          Configuración
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Listas de precios del comercio y centro de cuentas con roles
          (vendedor, administrador, visitante y superadmin).
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Secciones de configuración"
        className="inline-flex rounded-lg bg-secondary/70 p-1 ring-1 ring-border/60"
      >
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                active
                  ? "bg-card text-charcoal shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <section className="space-y-4 rounded-xl bg-card/90 p-5 ring-1 ring-border/70 sm:p-6">
        {tab === "precios" ? <PriceListsPanel /> : <AccountsPanel />}
      </section>
    </div>
  );
}
