"use client";

import { useState } from "react";
import { OrdersPanel } from "@/components/orders-panel";
import { StoreAdministration } from "@/components/catalog/catalog-admin";

export function StoreOrdersPanel() {
  const [section, setSection] = useState("store");
  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Origen de los pedidos"
        className="flex gap-2"
      >
        {[
          { id: "store", label: "Tienda online" },
          { id: "local", label: "Pedidos del local" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={section === tab.id}
            onClick={() => setSection(tab.id)}
            className={`min-h-11 rounded-full px-4 text-sm font-medium ${section === tab.id ? "bg-teal text-white" : "bg-secondary text-muted-foreground"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {section === "store" ? (
        <StoreAdministration section="orders" />
      ) : (
        <OrdersPanel />
      )}
    </div>
  );
}
