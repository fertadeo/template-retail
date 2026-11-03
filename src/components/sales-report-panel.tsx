"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBranchScope } from "@/lib/branch-scope-context";
import { useComercio } from "@/lib/comercio-context";
import { BRANCHES_ENABLED } from "@/lib/features";
import { salesByVendor } from "@/lib/store";
import { useRetailQuery } from "@/lib/use-retail-query";
import { formatMxn } from "@/lib/utils";

export function SalesReportPanel() {
  // Fechas en useEffect: new Date() en render rompe el prerender (Cache Components).
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [canal, setCanal] = useState<"" | "pos" | "pedido" | "mayorista">("pos");
  const { comercio } = useComercio();
  const { branchScope, branches } = useBranchScope();
  const scopeLabel = BRANCHES_ENABLED
    ? branchScope === "all"
      ? "Todas las sucursales"
      : branches.find((b) => b.id === branchScope)?.nombre ?? "Sucursal"
    : comercio?.nombre ?? "Comercio activo";

  useEffect(() => {
    const d = new Date();
    const today = d.toISOString().slice(0, 10);
    const monthStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    setFrom(monthStart);
    setTo(today);
  }, []);

  const { data, loading, error, reload } = useRetailQuery(
    () => {
      if (!from || !to) return Promise.resolve([]);
      return salesByVendor({
        from,
        to,
        canal: canal || undefined,
      });
    },
    [from, to, canal]
  );
  const rows = data ?? [];
  const total = rows.reduce((a, r) => a + r.total, 0);
  const tickets = rows.reduce((a, r) => a + r.tickets, 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Reportes
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-charcoal">
          Ventas por vendedor
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Alcance actual: <span className="font-medium text-foreground">{scopeLabel}</span>.
          {BRANCHES_ENABLED
            ? "Cambiá sucursal arriba para ver un local o todos."
            : "El alcance es el comercio activo del encabezado."}
        </p>
      </div>

      <div className="grid gap-3 rounded-xl bg-card/90 p-4 ring-1 ring-border/70 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="rep-from">Desde</Label>
          <Input
            id="rep-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rep-to">Hasta</Label>
          <Input
            id="rep-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rep-canal">Canal</Label>
          <select
            id="rep-canal"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={canal}
            onChange={(e) =>
              setCanal(e.target.value as "" | "pos" | "pedido" | "mayorista")
            }
          >
            <option value="pos">POS / caja</option>
            <option value="pedido">Pedidos</option>
            <option value="mayorista">Mayorista</option>
            <option value="">Todos</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button type="button" className="w-full" onClick={() => reload()}>
            Actualizar
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-card/90 px-4 py-4 ring-1 ring-border/70">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
            Total período
          </p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-charcoal">
            {formatMxn(total)}
          </p>
        </div>
        <div className="rounded-xl bg-card/90 px-4 py-4 ring-1 ring-border/70">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
            Tickets
          </p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-charcoal">
            {tickets}
          </p>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="overflow-hidden rounded-xl bg-card/90 ring-1 ring-border/70">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border/60 text-xs uppercase tracking-[0.1em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Vendedor</th>
              {BRANCHES_ENABLED ? (
                <th className="px-4 py-3 font-medium">Sucursal</th>
              ) : null}
              <th className="px-4 py-3 font-medium">Tickets</th>
              <th className="px-4 py-3 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={BRANCHES_ENABLED ? 4 : 3}
                  className="px-4 py-6 text-muted-foreground"
                >
                  Cargando…
                </td>
              </tr>
            ) : null}
            {rows.map((r) => (
              <tr
                key={`${r.vendedorId ?? "x"}-${r.branchId ?? "all"}`}
                className="border-b border-border/40 last:border-0"
              >
                <td className="px-4 py-3 font-medium">{r.vendedorNombre}</td>
                {BRANCHES_ENABLED ? (
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.branchNombre ?? "—"}
                  </td>
                ) : null}
                <td className="px-4 py-3 tabular-nums">{r.tickets}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">
                  {formatMxn(r.total)}
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 ? (
              <tr>
                <td
                  colSpan={BRANCHES_ENABLED ? 4 : 3}
                  className="px-4 py-6 text-muted-foreground"
                >
                  Sin ventas en el período / alcance elegido.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
