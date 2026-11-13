"use client";

import { useState } from "react";
import { AccountsPanel } from "@/components/accounts-panel";
import { CatalogSettingsForm } from "@/components/catalog-web-orders";
import { PriceListsPanel } from "@/components/price-lists-panel";
import { PrintPaperSettings } from "@/components/print-paper-settings";
import { cn } from "@/lib/utils";

type SettingsTab = "impresora" | "precios" | "cuentas" | "tienda";

export function SettingsPanel() {
  const [tab, setTab] = useState<SettingsTab>("impresora");

  const tabs: Array<{ id: SettingsTab; label: string }> = [
    { id: "impresora", label: "Impresora" },
    { id: "precios", label: "Listas de precios" },
    { id: "cuentas", label: "Centro de cuentas" },
    { id: "tienda", label: "Tienda pública" },
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
          Papel de impresora, listas de precios, centro de cuentas y tienda
          pública (WhatsApp).
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Secciones de configuración"
        className="flex w-full flex-wrap gap-1 rounded-lg bg-secondary/70 p-1 ring-1 ring-border/60 sm:inline-flex sm:w-auto"
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

      {tab === "impresora" ? <PrintPaperSettings /> : null}

      {tab !== "impresora" ? (
        <section className="space-y-4 rounded-xl bg-card/90 p-5 ring-1 ring-border/70 sm:p-6">
          {tab === "precios" ? <PriceListsPanel /> : null}
          {tab === "cuentas" ? <AccountsPanel /> : null}
          {tab === "tienda" ? <CatalogSettingsForm /> : null}
        </section>
      ) : null}
    </div>
  );
}
