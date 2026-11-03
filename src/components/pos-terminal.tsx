"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  Banknote,
  CheckCircle2,
  MapPin,
  Phone,
  Printer,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addPosSale,
  getPriceList,
  listClients,
  listProducts,
  resolveClientPriceListId,
} from "@/lib/store";
import { printThermalTicket } from "@/lib/thermal-ticket";
import {
  PAYMENT_METHOD_LABELS,
  orderTotal,
  productPrice,
  type Order,
  type OrderLine,
  type PaymentMethod,
} from "@/lib/types";
import { useBranchScope } from "@/lib/branch-scope-context";
import { useComercio } from "@/lib/comercio-context";
import { BRANCHES_ENABLED } from "@/lib/features";
import { cn, formatMxn } from "@/lib/utils";
import { useRetailQuery } from "@/lib/use-retail-query";

const fieldClass =
  "h-10 border-white/12 bg-[#1a1714] text-[#f2eee6] placeholder:text-sand/40 focus-visible:ring-teal/40 [color-scheme:dark]";

const selectClass = cn(
  "flex h-10 w-full appearance-none rounded-lg border border-white/12 bg-[#1a1714] px-3 text-sm text-[#f2eee6] outline-none",
  "focus-visible:ring-2 focus-visible:ring-teal/40 [color-scheme:dark]",
  "bg-[length:1rem] bg-[right_0.65rem_center] bg-no-repeat",
  "bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23cfc6b8%22 stroke-width=%222.5%22%3E%3Cpath d=%22m6 9 6 6 6-6%22/%3E%3C/svg%3E')]"
);

export function PosTerminal() {
  const { comercio } = useComercio();
  const { branchId, vendedorId, branchScope, branches, vendedor } =
    useBranchScope();
  const {
    data,
    loading,
    error: loadError,
  } = useRetailQuery(
    () => Promise.all([listProducts(), listClients()]),
    []
  );
  const products = (data?.[0] ?? []).filter((p) => p.activo && p.stock > 0);
  const clients = data?.[1] ?? [];
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<OrderLine[]>([]);
  const [clientId, setClientId] = useState("");
  const [conEnvio, setConEnvio] = useState(false);
  const [envioCosto, setEnvioCosto] = useState("45");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [metodoPago, setMetodoPago] = useState<PaymentMethod>("efectivo");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSale, setLastSale] = useState<Order | null>(null);
  const [phase, setPhase] = useState<"editing" | "done">("editing");

  const {
    data: priceData,
    loading: priceLoading,
    error: priceError,
  } = useRetailQuery(async () => {
    const priceListId = await resolveClientPriceListId(clientId || null);
    const list = await getPriceList(priceListId);
    return { priceListId, listLabel: list?.nombre ?? "Default" };
  }, [clientId]);
  const priceListId = priceData?.priceListId ?? null;
  const listLabel = priceData?.listLabel ?? "Default";
  const selectedClient = clients.find((c) => c.id === clientId) ?? null;

  const filtered = products.filter((p) => {
    if (!q.trim()) return true;
    const n = q.trim().toLowerCase();
    return (
      p.nombre.toLowerCase().includes(n) || p.sku.toLowerCase().includes(n)
    );
  });

  const subtotal = cart.reduce(
    (a, l) => a + l.cantidad * l.precioUnitario,
    0
  );
  const envioNum = conEnvio ? Math.max(0, Number(envioCosto) || 0) : 0;
  const total = subtotal + envioNum;
  const itemCount = cart.reduce((a, l) => a + l.cantidad, 0);

  function applyClientDefaults(nextClientId: string) {
    const c = clients.find((x) => x.id === nextClientId);
    if (c) {
      setDireccion(c.direccion || "");
      setTelefono(c.telefono || "");
    } else {
      setDireccion("");
      setTelefono("");
    }
  }

  async function rebuildCartForList(nextClientId: string) {
    const listId = await resolveClientPriceListId(nextClientId || null);
    setCart((prev) =>
      prev.map((l) => {
        const p = products.find((x) => x.id === l.productId);
        if (!p) return l;
        return { ...l, precioUnitario: productPrice(p, listId) };
      })
    );
  }

  function addToCart(productId: string) {
    if (phase === "done") startNewSale();
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    const unit = productPrice(p, priceListId);
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === p.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === p.id ? { ...l, cantidad: l.cantidad + 1 } : l
        );
      }
      return [
        ...prev,
        {
          productId: p.id,
          nombre: p.nombre,
          cantidad: 1,
          precioUnitario: unit,
        },
      ];
    });
    setMessage(null);
    setError(null);
  }

  function bump(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) =>
          l.productId === productId
            ? { ...l, cantidad: l.cantidad + delta }
            : l
        )
        .filter((l) => l.cantidad > 0)
    );
  }

  function startNewSale() {
    setPhase("editing");
    setCart([]);
    setMessage(null);
    setError(null);
    setLastSale(null);
  }

  async function checkout() {
    setError(null);
    setMessage(null);
    try {
      const sale = await addPosSale(cart, {
        clientId: clientId || null,
        priceListId,
        conEnvio,
        envioCosto: envioNum,
        direccionEnvio: direccion,
        telefonoContacto: telefono,
        metodoPago,
        branchId:
          branchId ??
          (branchScope === "all"
            ? branches.find((b) => b.esDefault)?.id ?? branches[0]?.id ?? null
            : null),
        vendedorId,
      });
      setLastSale(sale);
      setCart([]);
      setPhase("done");
      setMessage(
        `Venta ${sale.folio} · ${listLabel} · ${formatMxn(orderTotal(sale))}`
      );
      if (sale.conEnvio) {
        // Diferir un tick: el click de cobrar sigue contando como gesto de usuario
        window.setTimeout(() => {
          try {
            printThermalTicket(sale);
            setError(null);
          } catch (printErr) {
            setError(
              printErr instanceof Error
                ? printErr.message
                : "Venta OK. Usá «Imprimir ticket»."
            );
          }
        }, 0);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cobrar.");
    }
  }

  function reprint() {
    if (!lastSale) return;
    try {
      printThermalTicket(lastSale);
      setError(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo abrir el ticket."
      );
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Caja
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-charcoal">
          POS
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lista activa:{" "}
          <span className="font-medium text-teal">{listLabel}</span>
          {" · "}
          {BRANCHES_ENABLED ? (
            <>
              Sucursal:{" "}
              <span className="font-medium text-foreground">
                {branchId
                  ? branches.find((b) => b.id === branchId)?.nombre ?? branchId
                  : branches.find((b) => b.esDefault)?.nombre ??
                    branches[0]?.nombre ??
                    "—"}
              </span>
            </>
          ) : (
            <>
              Comercio:{" "}
              <span className="font-medium text-foreground">
                {comercio?.nombre ?? "—"}
              </span>
            </>
          )}
          {" · "}
          Operador:{" "}
          <span className="font-medium text-foreground">
            {vendedor?.nombre ?? "Sin asignar"}
          </span>
          {conEnvio ? " · Con envío imprime ticket térmico 80 mm." : "."}
        </p>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando productos y clientes…</p>
      ) : loadError || priceError ? (
        <p className="text-sm text-destructive">{loadError ?? priceError}</p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.35fr_minmax(20rem,22rem)]">
        <section className="space-y-3">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar producto o SKU…"
            autoFocus
          />
          <div className="grid max-h-[min(36rem,70vh)] gap-2 overflow-y-auto sm:grid-cols-2">
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addToCart(p.id)}
                className="rounded-xl bg-card/90 p-3 text-left ring-1 ring-border/70 transition hover:ring-teal/40"
              >
                <p className="font-medium text-foreground">{p.nombre}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.sku} · stock {p.stock}
                </p>
                <p className="mt-2 font-display text-lg font-semibold tabular-nums text-teal">
                  {formatMxn(productPrice(p, priceListId))}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col overflow-hidden rounded-2xl bg-[#241f1b] text-sand shadow-[0_12px_40px_-18px_rgba(31,28,25,0.55)] ring-1 ring-white/10">
          <header className="flex items-start justify-between gap-3 border-b border-white/8 bg-[#2c2722] px-4 py-3.5">
            <div>
              <h2 className="font-display text-lg font-medium text-[#f2eee6]">
                Ticket
              </h2>
              <p className="mt-0.5 text-xs text-sand/50">
                {phase === "done" && lastSale
                  ? lastSale.folio
                  : itemCount
                    ? `${itemCount} ítem${itemCount === 1 ? "" : "s"}`
                    : "Sin productos"}
              </p>
            </div>
            <span className="rounded-md bg-teal/25 px-2 py-1 text-[11px] font-medium tracking-wide text-[#5eead4]">
              {listLabel}
            </span>
          </header>

          {phase === "done" && lastSale ? (
            <div className="flex flex-1 flex-col gap-4 p-4">
              <div className="rounded-xl border border-teal/30 bg-teal/10 px-4 py-5 text-center">
                <CheckCircle2 className="mx-auto size-8 text-[#5eead4]" />
                <p className="mt-2 font-display text-xl font-semibold text-[#f2eee6]">
                  {lastSale.folio}
                </p>
                <p className="mt-1 text-sm text-sand/65">
                  {lastSale.clienteNombre} ·{" "}
                  {lastSale.metodoPago
                    ? PAYMENT_METHOD_LABELS[lastSale.metodoPago]
                    : "—"}
                </p>
                <p className="mt-3 font-display text-2xl font-semibold tabular-nums text-[#5eead4]">
                  {formatMxn(orderTotal(lastSale))}
                </p>
                {lastSale.conEnvio ? (
                  <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-sand/55">
                    <Truck className="size-3.5" />
                    Envío {formatMxn(lastSale.envioCosto)}
                  </p>
                ) : null}
              </div>

              {error ? (
                <div className="flex gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <p>{error}</p>
                </div>
              ) : null}

              {lastSale.conEnvio ? (
                <Button
                  type="button"
                  className="h-11 w-full gap-2 bg-[#5eead4] text-[#1f1c19] hover:bg-[#5eead4]/90"
                  onClick={reprint}
                >
                  <Printer className="size-4" />
                  Imprimir ticket
                </Button>
              ) : null}

              <button
                type="button"
                className="h-11 w-full rounded-lg border border-white/15 bg-transparent text-sm font-medium text-[#f2eee6] transition hover:bg-white/8"
                onClick={startNewSale}
              >
                Nueva venta
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-3 px-4 pt-4">
                <div className="space-y-1.5">
                  <label
                    className="text-[11px] font-medium uppercase tracking-[0.12em] text-sand/45"
                    htmlFor="pos-cli"
                  >
                    Cliente {conEnvio ? "· requerido p/ envío" : ""}
                  </label>
                  <select
                    id="pos-cli"
                    className={selectClass}
                    value={clientId}
                    onChange={(e) => {
                      const next = e.target.value;
                      setClientId(next);
                      void rebuildCartForList(next);
                      applyClientDefaults(next);
                    }}
                  >
                    <option value="">Mostrador</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                  {selectedClient?.telefono ? (
                    <p className="truncate text-[11px] text-sand/40">
                      {selectedClient.telefono}
                      {selectedClient.direccion
                        ? ` · ${selectedClient.direccion}`
                        : ""}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-sand/45">
                    Pago
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-black/25 p-1">
                    {(
                      [
                        ["efectivo", "Efectivo", Banknote],
                        ["transferencia", "Transfer.", ArrowLeftRight],
                      ] as const
                    ).map(([value, label, Icon]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setMetodoPago(value)}
                        className={cn(
                          "flex h-9 items-center justify-center gap-1.5 rounded-md text-sm transition",
                          metodoPago === value
                            ? "bg-teal text-[#f2eee6] shadow-sm"
                            : "text-sand/70 hover:bg-white/5 hover:text-[#f2eee6]"
                        )}
                      >
                        <Icon className="size-3.5 opacity-80" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const on = !conEnvio;
                    setConEnvio(on);
                    if (on && clientId) applyClientDefaults(clientId);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition",
                    conEnvio
                      ? "border-teal/40 bg-teal/15"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                  )}
                >
                  <span className="flex items-center gap-2 text-sm text-[#f2eee6]">
                    <Truck
                      className={cn(
                        "size-4",
                        conEnvio ? "text-[#5eead4]" : "text-sand/50"
                      )}
                    />
                    Pedido con envío
                  </span>
                  <span
                    className={cn(
                      "relative h-5 w-9 rounded-full transition",
                      conEnvio ? "bg-teal" : "bg-white/15"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 size-4 rounded-full bg-[#f2eee6] transition",
                        conEnvio ? "left-4" : "left-0.5"
                      )}
                    />
                  </span>
                </button>

                {conEnvio ? (
                  <div className="space-y-2.5 rounded-xl border border-white/10 bg-[#1a1714]/80 p-3">
                    <div className="space-y-1">
                      <label
                        className="flex items-center gap-1 text-[11px] text-sand/50"
                        htmlFor="pos-tel"
                      >
                        <Phone className="size-3" />
                        Teléfono
                      </label>
                      <Input
                        id="pos-tel"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        className={fieldClass}
                        placeholder="55 0000 0000"
                      />
                    </div>
                    <div className="space-y-1">
                      <label
                        className="flex items-center gap-1 text-[11px] text-sand/50"
                        htmlFor="pos-dir"
                      >
                        <MapPin className="size-3" />
                        Dirección de entrega
                      </label>
                      <Input
                        id="pos-dir"
                        value={direccion}
                        onChange={(e) => setDireccion(e.target.value)}
                        className={fieldClass}
                        placeholder="Calle, colonia, ciudad…"
                      />
                    </div>
                    <div className="space-y-1">
                      <label
                        className="text-[11px] text-sand/50"
                        htmlFor="pos-env"
                      >
                        Precio de envío
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-sand/45">
                          $
                        </span>
                        <Input
                          id="pos-env"
                          type="number"
                          min={0}
                          step={1}
                          value={envioCosto}
                          onChange={(e) => setEnvioCosto(e.target.value)}
                          className={cn(fieldClass, "pl-7 tabular-nums")}
                        />
                      </div>
                      <p className="text-[11px] tabular-nums text-sand/40">
                        {formatMxn(envioNum)}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mx-4 mt-4 min-h-[7.5rem] flex-1 overflow-hidden rounded-xl border border-dashed border-white/10 bg-black/15">
                {cart.length === 0 ? (
                  <div className="flex h-full min-h-[7.5rem] flex-col items-center justify-center gap-1 px-4 py-6 text-center">
                    <ShoppingBag className="size-5 text-sand/30" />
                    <p className="text-sm text-sand/45">Ticket vacío</p>
                    <p className="text-[11px] text-sand/30">
                      Tocá un producto para agregarlo
                    </p>
                  </div>
                ) : (
                  <ul className="max-h-44 space-y-0 overflow-y-auto divide-y divide-white/6">
                    {cart.map((l) => (
                      <li
                        key={l.productId}
                        className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[#f2eee6]">{l.nombre}</p>
                          <p className="text-xs tabular-nums text-sand/45">
                            {formatMxn(l.precioUnitario)} c/u
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5 rounded-lg bg-white/5 p-0.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="size-7 text-sand hover:bg-white/10 hover:text-[#f2eee6]"
                            onClick={() => bump(l.productId, -1)}
                          >
                            −
                          </Button>
                          <span className="w-7 text-center tabular-nums text-[#f2eee6]">
                            {l.cantidad}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="size-7 text-sand hover:bg-white/10 hover:text-[#f2eee6]"
                            onClick={() => bump(l.productId, 1)}
                          >
                            +
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-auto space-y-3 border-t border-white/8 bg-[#2c2722] px-4 py-4">
                <div className="space-y-1 text-sm">
                  <p className="flex justify-between text-sand/55">
                    <span>Subtotal</span>
                    <span className="tabular-nums text-sand/80">
                      {formatMxn(subtotal)}
                    </span>
                  </p>
                  {conEnvio ? (
                    <p className="flex justify-between text-sand/55">
                      <span>Envío</span>
                      <span className="tabular-nums text-sand/80">
                        {formatMxn(envioNum)}
                      </span>
                    </p>
                  ) : null}
                  <p className="flex justify-between pt-1 font-display text-xl font-semibold text-[#f2eee6]">
                    <span>Total</span>
                    <span className="tabular-nums">{formatMxn(total)}</span>
                  </p>
                </div>

                {error ? (
                  <div className="flex gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <p>{error}</p>
                  </div>
                ) : null}
                {message ? (
                  <p className="text-sm text-[#5eead4]">{message}</p>
                ) : null}

                <Button
                  type="button"
                  className="h-11 w-full gap-2"
                  disabled={!cart.length || loading || priceLoading}
                  onClick={() => void checkout()}
                >
                  {conEnvio ? (
                    <>
                      <Printer className="size-4" />
                      Cobrar e imprimir
                    </>
                  ) : (
                    "Cobrar"
                  )}
                </Button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
