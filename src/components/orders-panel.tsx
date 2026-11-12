"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BellRing, Printer, X } from "lucide-react";
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
  type Order,
  type OrderLine,
} from "@/lib/types";
import { cn, formatMxn } from "@/lib/utils";
import { CatalogWebOrders } from "@/components/catalog-web-orders";
import { useRetailQuery } from "@/lib/use-retail-query";

const SEEN_KEY = "aurix.orders.seenPrepareIds";
const POLL_MS = 25_000;

const CANAL_BADGE: Record<
  Order["canal"],
  { label: string; className: string }
> = {
  pos: {
    label: "POS",
    className: "bg-[#1f1c19] text-[#f2eee6] ring-1 ring-black/10",
  },
  pedido: {
    label: "Pedido",
    className: "bg-teal/15 text-teal ring-1 ring-teal/25",
  },
  mayorista: {
    label: "Mayorista",
    className: "bg-amber-100 text-amber-900 ring-1 ring-amber-300/70",
  },
};

function needsPrepare(o: Order): boolean {
  if (o.canal === "pos") return false;
  return o.status === "confirmado" || o.status === "preparando";
}

function readSeenIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeSeenIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    SEEN_KEY,
    JSON.stringify([...ids].slice(-200))
  );
}

function CanalBadge({ canal }: { canal: Order["canal"] }) {
  const cfg = CANAL_BADGE[canal];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide",
        cfg.className
      )}
    >
      {cfg.label}
    </span>
  );
}

export function OrdersPanel() {
  const {
    data: orders,
    loading,
    error,
    reload,
  } = useRetailQuery(() => listOrders(), []);
  const [open, setOpen] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const [alertOrder, setAlertOrder] = useState<Order | null>(null);
  const [dismissedBanner, setDismissedBanner] = useState(false);
  const primedRef = useRef(false);

  const pendingPrepare = useMemo(
    () => (orders ?? []).filter(needsPrepare),
    [orders]
  );

  useEffect(() => {
    const t = window.setInterval(() => reload(), POLL_MS);
    return () => window.clearInterval(t);
  }, [reload]);

  useEffect(() => {
    if (!orders) return;
    const pending = orders.filter(needsPrepare);
    const seen = readSeenIds();

    if (!primedRef.current) {
      // Primera carga: marcar los actuales como vistos (sin alarmar).
      for (const o of pending) seen.add(o.id);
      writeSeenIds(seen);
      primedRef.current = true;
      return;
    }

    const fresh = pending.filter((o) => !seen.has(o.id));
    if (!fresh.length) return;
    // El más reciente primero.
    fresh.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    setAlertOrder(fresh[0]);
    setDismissedBanner(false);
    for (const o of fresh) seen.add(o.id);
    writeSeenIds(seen);

    try {
      // Beep suave si el navegador lo permite.
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 880;
        gain.gain.value = 0.04;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        window.setTimeout(() => {
          osc.stop();
          void ctx.close();
        }, 180);
      }
    } catch {
      /* ignore */
    }
  }, [orders]);

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

      {pendingPrepare.length > 0 && !dismissedBanner ? (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-2xl border border-teal/30 bg-teal/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-lg bg-teal/20 p-2 text-teal">
              <BellRing className="size-5" />
            </span>
            <div>
              <p className="font-medium text-charcoal">
                {pendingPrepare.length === 1
                  ? "Tenés 1 pedido para preparar"
                  : `Tenés ${pendingPrepare.length} pedidos para preparar`}
              </p>
              <p className="text-sm text-muted-foreground">
                {pendingPrepare
                  .slice(0, 3)
                  .map((o) => o.folio)
                  .join(" · ")}
                {pendingPrepare.length > 3
                  ? ` · +${pendingPrepare.length - 3}`
                  : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="self-end rounded-lg p-2 text-muted-foreground hover:bg-teal/15 hover:text-foreground sm:self-center"
            aria-label="Cerrar aviso"
            onClick={() => setDismissedBanner(true)}
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      {alertOrder ? (
        <div
          role="alert"
          className="fixed bottom-5 left-1/2 z-50 w-[min(28rem,calc(100%-1.5rem))] -translate-x-1/2 rounded-2xl bg-[#1f1c19] p-4 text-[#f2eee6] shadow-2xl ring-1 ring-white/10"
        >
          <div className="flex items-start gap-3">
            <BellRing className="mt-0.5 size-5 shrink-0 text-[#5eead4]" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-semibold">
                Pedido nuevo · {alertOrder.folio}
              </p>
              <p className="mt-1 text-sm text-sand/70">
                {alertOrder.clienteNombre}
                {alertOrder.conEnvio ? " · con envío" : ""} ·{" "}
                {formatMxn(orderTotal(alertOrder))}. Preparalo para despachar.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="bg-[#5eead4] text-[#1f1c19] hover:bg-[#5eead4]/90"
                  onClick={() => setAlertOrder(null)}
                >
                  Entendido
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
        {printError ? (
          <p className="px-4 pt-3 text-sm text-destructive">{printError}</p>
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
              <tr
                key={o.id}
                className={cn(
                  needsPrepare(o) ? "bg-teal/[0.04]" : undefined
                )}
              >
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
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "text-sm",
                      needsPrepare(o)
                        ? "font-medium text-teal"
                        : "text-muted-foreground"
                    )}
                  >
                    {ORDER_STATUS_LABELS[o.status]}
                    {needsPrepare(o) ? " · preparar" : ""}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <CanalBadge canal={o.canal} />
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">
                  {formatMxn(orderTotal(o))}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => {
                      setPrintError(null);
                      try {
                        printThermalTicket(o);
                      } catch (e) {
                        setPrintError(
                          e instanceof Error
                            ? e.message
                            : "No se pudo imprimir."
                        );
                      }
                    }}
                  >
                    <Printer className="size-3.5" />
                    Ticket
                  </Button>
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
