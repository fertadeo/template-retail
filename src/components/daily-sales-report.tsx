"use client";
import { useState } from "react";
import { isApiMode } from "@/lib/api-config";
import { api } from "@/lib/api-client";
import { catalogMoney } from "@/lib/catalog";
import { useCatalogQuery } from "@/lib/use-catalog-query";
import { ProductPagination } from "@/components/product-pagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export function DailySalesReport() {
  const connected = isApiMode();
  const clock = useCatalogQuery(
    ["report-clock"],
    (signal) => api.currentCash(signal),
    0,
    connected,
  );
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const from = range?.from ?? clock.data?.today ?? "";
  const to = range?.to ?? clock.data?.today ?? "";
  const valid = Boolean(
    from &&
      to &&
      from <= to &&
      (Date.parse(to) - Date.parse(from)) / 86400000 <= 365,
  );
  const daily = useCatalogQuery(
    ["daily-sales", from, to],
    (signal) => api.dailySales(from, to, signal),
    150,
    valid && connected,
  );
  const [page, setPage] = useState(1);
  const history = useCatalogQuery(
    ["cash-history", page],
    (signal) => api.cashHistory(page, signal),
    0,
    connected,
  );
  const rows = daily.data?.rows ?? [];
  function csv() {
    if (!rows.length) return;
    const quote = (value: unknown) => `"${String(value).replace(/"/g, '""')}"`;
    const text = [
      [
        "Día",
        "Moneda",
        "Tickets",
        "Efectivo",
        "Transferencias",
        "Sin clasificar",
        "Total",
      ],
      ...rows.map((row) => [
        row.day,
        row.currency,
        row.tickets,
        row.cash,
        row.transfer,
        row.unclassified,
        row.total,
      ]),
    ]
      .map((row) => row.map(quote).join(";"))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\ufeff" + text], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `ventas-diarias-${from}-${to}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  if (!connected)
    return (
      <section className="rounded-xl bg-secondary/50 p-4 text-sm text-muted-foreground">
        Los reportes diarios de caja estarán disponibles al conectar el local.
      </section>
    );
  return (
    <section className="space-y-5 rounded-2xl bg-card/90 p-4 ring-1 ring-border sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Ventas por día</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Ventas cobradas en POS, sin incluir fondos de apertura ni pedidos
            pendientes. Horario comercial UTC
            {(clock.data?.utcOffsetMinutes ?? -180) / 60 >= 0 ? "+" : ""}
            {(clock.data?.utcOffsetMinutes ?? -180) / 60}.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={!rows.length || daily.loading}
          onClick={csv}
        >
          Descargar CSV
        </Button>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-medium">
          Desde
          <Input
            type="date"
            value={from}
            onChange={(event) => setRange({ from: event.target.value, to })}
            className="mt-1"
          />
        </label>
        <label className="text-xs font-medium">
          Hasta
          <Input
            type="date"
            value={to}
            onChange={(event) => setRange({ from, to: event.target.value })}
            className="mt-1"
          />
        </label>
        <Button
          variant="outline"
          disabled={!valid || daily.loading}
          onClick={daily.reload}
        >
          Actualizar
        </Button>
      </div>
      {!valid && from && to ? (
        <p role="alert" className="text-sm text-destructive">
          Elegí un rango válido de hasta 366 días.
        </p>
      ) : null}
      {clock.error || daily.error ? (
        <p role="alert" className="text-sm text-destructive">
          {clock.error || daily.error}
        </p>
      ) : null}
      {daily.loading && valid ? (
        <p role="status" className="text-sm text-muted-foreground">
          Cargando ventas del período…
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b border-border text-xs text-muted-foreground">
            <tr>
              {[
                "Día",
                "Tickets",
                "Efectivo",
                "Transferencia",
                "Sin clasificar",
                "Total",
              ].map((text) => (
                <th key={text} className="px-3 py-3 font-medium">
                  {text}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.day}:${row.currency}`}
                className="border-b border-border/50"
              >
                <td className="px-3 py-3">
                  {row.day.split("-").reverse().join("/")}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {row.currency}
                  </span>
                </td>
                <td className="px-3 py-3">{row.tickets}</td>
                {[row.cash, row.transfer, row.unclassified, row.total].map(
                  (value, index) => (
                    <td
                      key={index}
                      className="whitespace-nowrap px-3 py-3 tabular-nums"
                    >
                      {catalogMoney(value, row.currency)}
                    </td>
                  ),
                )}
              </tr>
            ))}
            {!daily.loading && valid && !daily.error && !rows.length ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-muted-foreground">
                  No hay ventas cobradas en el período.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <h3 className="border-t border-border pt-5 font-display text-lg font-semibold">
        Historial de cierres
      </h3>
      {history.error ? (
        <p role="alert" className="text-sm text-destructive">
          {history.error}
        </p>
      ) : null}
      {history.loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Cargando cierres…
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {history.data?.items.map((session) => (
            <li key={session.id} className="space-y-2 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-sm">
                  {session.closedAt
                    ? new Date(session.closedAt).toLocaleString("es-AR")
                    : ""}
                </strong>
                <span
                  className={`text-sm font-medium ${session.difference ? "text-amber-700" : "text-teal"}`}
                >
                  Diferencia:{" "}
                  {catalogMoney(session.difference ?? 0, session.currency)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Abrió {session.openedByName} · Cerró{" "}
                {session.closedByName ?? "Usuario"} · {session.tickets} tickets
              </p>
              <p className="text-xs">
                Inicial: {catalogMoney(session.openingAmount, session.currency)}{" "}
                · Esperado:{" "}
                {catalogMoney(session.expectedAmount, session.currency)} ·
                Contado:{" "}
                {catalogMoney(session.countedAmount ?? 0, session.currency)}
              </p>
              {session.note ? (
                <p className="text-xs text-muted-foreground">{session.note}</p>
              ) : null}
            </li>
          ))}
          {!history.data?.items.length ? (
            <li className="py-4 text-sm text-muted-foreground">
              Todavía no hay cierres registrados.
            </li>
          ) : null}
        </ul>
      )}
      <ProductPagination
        page={page}
        loading={history.loading}
        hasMore={history.data?.hasMore ?? false}
        onPage={setPage}
        label="Páginas del historial de caja"
      />
    </section>
  );
}
