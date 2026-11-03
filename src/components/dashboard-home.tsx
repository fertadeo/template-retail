"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { isApiMode } from "@/lib/api-config";
import { useBranchScope } from "@/lib/branch-scope-context";
import { useComercio } from "@/lib/comercio-context";
import { BRANCHES_ENABLED } from "@/lib/features";
import { dashboardStats, listOrders } from "@/lib/store";
import { useRetailQuery } from "@/lib/use-retail-query";
import { ORDER_STATUS_LABELS, orderTotal } from "@/lib/types";
import { cn, formatMxn } from "@/lib/utils";

export function DashboardHome() {
  const [today, setToday] = useState("2026-10-27");
  useEffect(() => {
    setToday(new Date().toISOString().slice(0, 10));
  }, []);

  const { comercio } = useComercio();
  const { branchScope, branches } = useBranchScope();
  const scopeLabel = BRANCHES_ENABLED
    ? branchScope === "all"
      ? "Todas las sucursales"
      : branches.find((b) => b.id === branchScope)?.nombre ?? "Sucursal"
    : comercio?.nombre ?? "Comercio activo";

  const statsQ = useRetailQuery(() => dashboardStats(today), [today]);
  const ordersQ = useRetailQuery(() => listOrders(), []);
  const stats = statsQ.data;
  const recent = (ordersQ.data ?? []).slice(0, 5);
  const vendors = stats?.ventasPorVendedor ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Aurix Retail
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-charcoal">
            Mostrador
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Productos, clientes, pedidos y caja POS.
            {isApiMode()
              ? " Conectado al API del cliente."
              : " Modo demo en memoria (sin NEXT_PUBLIC_API_URL)."}{" "}
            Vista: <span className="font-medium text-foreground">{scopeLabel}</span>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/reportes"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10 rounded-lg")}
          >
            Reportes
          </Link>
          <Link
            href="/pos"
            className={cn(buttonVariants({ size: "lg" }), "h-10 rounded-lg")}
          >
            Abrir POS
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Ventas hoy"
          value={stats ? formatMxn(stats.ventasHoy) : "…"}
        />
        <Kpi
          label="Productos activos"
          value={stats ? String(stats.productos) : "…"}
        />
        <Kpi
          label="Pedidos abiertos"
          value={stats ? String(stats.pedidosAbiertos) : "…"}
        />
        <Kpi
          label="Stock bajo"
          value={stats ? String(stats.stockBajo) : "…"}
        />
      </div>

      {(statsQ.error || ordersQ.error) && (
        <p className="text-sm text-destructive">
          {statsQ.error || ordersQ.error}
        </p>
      )}

      <section className="overflow-hidden rounded-xl bg-card/90 ring-1 ring-border/70">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
          <h2 className="font-display text-lg font-medium text-charcoal">
            Ventas por vendedor (hoy)
          </h2>
          <Link href="/reportes" className="text-sm font-medium text-teal">
            Ver reporte →
          </Link>
        </div>
        <ul className="divide-y divide-border/60">
          {vendors.map((v) => (
            <li
              key={`${v.vendedorId ?? "x"}-${v.branchId ?? "all"}`}
              className="flex items-center justify-between gap-3 px-5 py-3"
            >
              <div>
                <p className="font-medium text-foreground">{v.vendedorNombre}</p>
                <p className="text-xs text-muted-foreground">
                  {v.tickets} ticket{v.tickets === 1 ? "" : "s"}
                  {BRANCHES_ENABLED && v.branchNombre
                    ? ` · ${v.branchNombre}`
                    : ""}
                </p>
              </div>
              <p className="text-sm font-medium tabular-nums">
                {formatMxn(v.total)}
              </p>
            </li>
          ))}
          {!statsQ.loading && vendors.length === 0 ? (
            <li className="px-5 py-6 text-center text-sm text-muted-foreground">
              Sin ventas registradas hoy en este alcance.
            </li>
          ) : null}
        </ul>
      </section>

      <section className="overflow-hidden rounded-xl bg-card/90 ring-1 ring-border/70">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
          <h2 className="font-display text-lg font-medium text-charcoal">
            Movimientos recientes
          </h2>
          <Link href="/pedidos" className="text-sm font-medium text-teal">
            Ver pedidos →
          </Link>
        </div>
        <ul className="divide-y divide-border/60">
          {ordersQ.loading && !recent.length ? (
            <li className="px-5 py-8 text-center text-sm text-muted-foreground">
              Cargando…
            </li>
          ) : null}
          {recent.map((o) => (
            <li
              key={o.id}
              className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-foreground">
                  {o.folio} · {o.clienteNombre}
                </p>
                <p className="text-xs text-muted-foreground">
                  {ORDER_STATUS_LABELS[o.status]} · {o.canal.toUpperCase()}
                  {BRANCHES_ENABLED && o.branchNombre
                    ? ` · ${o.branchNombre}`
                    : ""}
                  {o.vendedorNombre ? ` · ${o.vendedorNombre}` : ""}
                </p>
              </div>
              <p className="text-sm font-medium tabular-nums">
                {formatMxn(orderTotal(o))}
              </p>
            </li>
          ))}
          {!ordersQ.loading && recent.length === 0 ? (
            <li className="px-5 py-8 text-center text-sm text-muted-foreground">
              Sin movimientos aún.
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card/90 px-4 py-4 ring-1 ring-border/70">
      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-charcoal">
        {value}
      </p>
    </div>
  );
}
