"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addPedido,
  getPriceList,
  listClients,
  listOrders,
  listProducts,
  resolveClientPriceListId,
} from "@/lib/store";
import { printThermalTicket } from "@/lib/thermal-ticket";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  orderTotal,
  productPrice,
  type OrderLine,
} from "@/lib/types";
import { formatMxn } from "@/lib/utils";
import { CatalogWebOrders } from "@/components/catalog-web-orders";
import { useRetailQuery } from "@/lib/use-retail-query";

export function OrdersPanel() {
  const {
    data: orders,
    loading,
    error,
    reload,
  } = useRetailQuery(() => listOrders(), []);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Operaciones
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-charcoal">
            Pedidos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pedidos a cliente, tickets de POS y pedidos del catálogo web.
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          className="h-10"
          onClick={() => setOpen(true)}
        >
          Nuevo pedido
        </Button>
      </div>

      {open ? (
        <NewOrderForm
          onCancel={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            reload();
          }}
        />
      ) : null}

      <CatalogWebOrders />

      <div className="overflow-hidden rounded-xl bg-card/90 ring-1 ring-border/70">
        {loading ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Cargando pedidos…</p>
        ) : error ? (
          <p className="px-4 py-6 text-sm text-destructive">{error}</p>
        ) : null}
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border/60 text-xs uppercase tracking-[0.1em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Folio</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Canal</th>
              <th className="px-4 py-3 font-medium text-right">Total</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {(orders ?? []).map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-3 font-mono text-xs">{o.folio}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{o.clienteNombre}</p>
                  {o.conEnvio ? (
                    <p className="text-xs text-teal">
                      Envío · {formatMxn(o.envioCosto)}
                      {o.metodoPago
                        ? ` · ${PAYMENT_METHOD_LABELS[o.metodoPago]}`
                        : ""}
                    </p>
                  ) : o.metodoPago ? (
                    <p className="text-xs text-muted-foreground">
                      {PAYMENT_METHOD_LABELS[o.metodoPago]}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {ORDER_STATUS_LABELS[o.status]}
                </td>
                <td className="px-4 py-3 uppercase text-muted-foreground">
                  {o.canal}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">
                  {formatMxn(orderTotal(o))}
                </td>
                <td className="px-4 py-3 text-right">
                  {o.conEnvio ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => printThermalTicket(o)}
                    >
                      <Printer className="size-3.5" />
                      Ticket
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewOrderForm({
  onCancel,
  onSaved,
}: {
  onCancel: () => void;
  onSaved: () => void;
}) {
  const {
    data,
    loading,
    error: loadError,
  } = useRetailQuery(
    () => Promise.all([listClients(), listProducts()]),
    []
  );
  const clients = data?.[0] ?? [];
  const products = (data?.[1] ?? []).filter((p) => p.activo);
  const [clientId, setClientId] = useState("");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId && clients[0]) setClientId(clients[0].id);
    if (!productId && products[0]) setProductId(products[0].id);
  }, [clientId, clients, productId, products]);
  const {
    data: priceData,
    loading: priceLoading,
    error: priceError,
  } = useRetailQuery(async () => {
    const listId = await resolveClientPriceListId(clientId);
    const list = await getPriceList(listId);
    return { listId, listName: list?.nombre ?? "Default" };
  }, [clientId]);
  const listId = priceData?.listId ?? null;
  const listName = priceData?.listName ?? "Default";

  function addLine() {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    const cantidad = Math.max(1, Number(qty) || 1);
    const unit = productPrice(p, listId);
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === p.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === p.id
            ? { ...l, cantidad: l.cantidad + cantidad }
            : l
        );
      }
      return [
        ...prev,
        {
          productId: p.id,
          nombre: p.nombre,
          cantidad,
          precioUnitario: unit,
        },
      ];
    });
  }

  async function save() {
    setError(null);
    try {
      await addPedido(clientId, lines);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear.");
    }
  }

  const total = lines.reduce(
    (a, l) => a + l.cantidad * l.precioUnitario,
    0
  );

  return (
    <div className="space-y-4 rounded-xl bg-card/90 p-5 ring-1 ring-border/70">
      <h2 className="font-display text-lg font-medium">Nuevo pedido</h2>
      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando datos…</p>
      ) : loadError || priceError ? (
        <p className="text-sm text-destructive">{loadError ?? priceError}</p>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="cli">Cliente</Label>
        <select
          id="cli"
          className="flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
          value={clientId}
          onChange={(e) => {
            setClientId(e.target.value);
            setLines([]);
          }}
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Lista del cliente: {listName}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="prod">Producto</Label>
          <select
            id="prod"
            className="flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} · {formatMxn(productPrice(p, listId))}
              </option>
            ))}
          </select>
        </div>
        <div className="w-24 space-y-1.5">
          <Label htmlFor="qty">Cant.</Label>
          <Input
            id="qty"
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </div>
        <Button type="button" variant="secondary" onClick={addLine}>
          Agregar
        </Button>
      </div>
      <ul className="divide-y divide-border/60 rounded-lg bg-muted/40">
        {lines.map((l) => (
          <li
            key={l.productId}
            className="flex justify-between px-3 py-2 text-sm"
          >
            <span>
              {l.cantidad}× {l.nombre}
            </span>
            <span className="tabular-nums">
              {formatMxn(l.cantidad * l.precioUnitario)}
            </span>
          </li>
        ))}
        {lines.length === 0 ? (
          <li className="px-3 py-4 text-sm text-muted-foreground">
            Sin líneas todavía.
          </li>
        ) : null}
      </ul>
      <p className="text-right font-display text-lg font-semibold tabular-nums">
        Total {formatMxn(total)}
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button
          type="button"
          disabled={loading || priceLoading}
          onClick={() => void save()}
        >
          Confirmar pedido
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
