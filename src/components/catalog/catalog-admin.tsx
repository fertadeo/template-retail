"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Copy,
  Globe,
  MessageCircle,
  Package,
  RefreshCw,
  Settings2,
} from "lucide-react";
import { CatalogSettingsDialog } from "@/components/catalog/settings-dialog";
import { CatalogOrderDialog } from "@/components/catalog/order-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProductPagination } from "@/components/product-pagination";
import { useRetailQuery } from "@/lib/use-retail-query";
import { useCatalogQuery } from "@/lib/use-catalog-query";
import { privateCatalogApi } from "@/lib/private-catalog-api";
import { isApiMode } from "@/lib/api-config";
import {
  CATALOG_ORDER_STATUS_LABELS,
  catalogMoney,
  type CatalogOrder,
  type CatalogOrderStatus,
} from "@/lib/catalog";

export function CatalogAdmin() {
  const meta = useRetailQuery(() => privateCatalogApi.meta(), []);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const filterKey = JSON.stringify([status, q.trim()]);
  const [cursor, setCursor] = useState({ key: filterKey, page: 1 });
  if (cursor.key !== filterKey) setCursor({ key: filterKey, page: 1 });
  const page = cursor.key === filterKey ? cursor.page : 1;
  const orders = useCatalogQuery(
    ["catalog-orders", page, status, q.trim()],
    (signal) =>
      privateCatalogApi.orders(
        { page, status: status || undefined, q: q.trim() },
        signal,
      ),
    q.trim() ? 200 : 0,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selected, setSelected] = useState<CatalogOrder | null>(null);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const timeout = setTimeout(
      () => setUrl(`${window.location.origin}/tienda`),
      0,
    );
    return () => clearTimeout(timeout);
  }, []);
  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timeout);
  }, [copied]);
  const canConfigure = ["superadmin", "administrador"].includes(
    meta.data?.role ?? "",
  );
  const settings = meta.data?.settings;
  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setMessage(
        "No pudimos copiar el enlace. Podés seleccionarlo y copiarlo desde el campo.",
      );
    }
  }
  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[.14em] text-muted-foreground">
            Tu local, también a un mensaje
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold">
            Catálogo público
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Compartí tus productos, recibí pedidos por WhatsApp y atendelos
            desde un solo lugar.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setSettingsOpen(true)}
          disabled={!settings || !canConfigure}
        >
          <Settings2 className="size-4" />
          Configurar catálogo
        </Button>
      </header>
      {meta.error ? (
        <div role="alert" className="catalog-error">
          {meta.error}
          <button
            type="button"
            className="ml-3 underline"
            onClick={meta.reload}
          >
            Reintentar
          </button>
        </div>
      ) : null}
      {!isApiMode() ? (
        <p className="rounded-xl bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
          Modo demostración: la configuración se guarda solo en este navegador.
          Para recibir pedidos de clientes, usá el catálogo conectado a la API
          del local.
        </p>
      ) : null}
      <section className="grid gap-5 rounded-2xl bg-card/90 p-5 ring-1 ring-border/70 sm:p-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#e2eadd] text-[#56744a]">
            <Globe className="size-6" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-lg font-semibold">
                Tu enlace para compartir
              </h2>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide ${settings?.publicEnabled ? "bg-teal/10 text-teal" : "bg-secondary text-muted-foreground"}`}
              >
                {!settings
                  ? "Cargando…"
                  : settings.publicEnabled
                    ? "Publicado"
                    : "Pausado"}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {settings?.publicEnabled
                ? "Tus clientes pueden explorar productos y armar su carrito sin iniciar sesión."
                : "Configurá el WhatsApp del local y activá la publicación cuando esté listo."}
            </p>
            {settings?.whatsappPhone ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-teal">
                <MessageCircle className="size-3.5" />
                Pedidos a +{settings.whatsappPhone.replace(/\D/g, "")}
              </p>
            ) : null}
          </div>
        </div>
        <div className="space-y-3">
          <label
            className="block text-xs font-medium text-muted-foreground"
            htmlFor="catalog-share-url"
          >
            URL pública
          </label>
          <div className="flex gap-2">
            <input
              id="catalog-share-url"
              readOnly
              value={url}
              onFocus={(event) => event.target.select()}
              className="min-w-0 flex-1 rounded-lg border border-border bg-background/70 px-3 py-2 font-mono text-xs"
            />
            <Button
              variant="outline"
              aria-label="Copiar URL del catálogo"
              onClick={() => void copyUrl()}
              disabled={!url}
            >
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/tienda"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-teal"
            >
              Ver catálogo
              <ArrowUpRight className="size-4" />
            </a>
            <span role="status" className="text-xs text-muted-foreground">
              {copied
                ? "Enlace copiado"
                : "Compartilo en WhatsApp, redes o tu perfil comercial."}
            </span>
          </div>
        </div>
      </section>
      {message ? (
        <p role="status" className="text-sm text-teal">
          {message}
        </p>
      ) : null}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold">
              Pedidos del catálogo
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Solicitudes preparadas para WhatsApp. No son ventas cobradas ni
              reservas de stock.
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={() => orders.reload()}
            disabled={orders.loading}
          >
            <RefreshCw
              className={`size-4 ${orders.loading ? "animate-spin" : ""}`}
            />
            Actualizar
          </Button>
        </div>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Estado del pedido"
        >
          {[
            { id: "", label: "Todos" },
            ...(
              [
                "pendiente",
                "confirmado",
                "cancelado",
                "vencido",
              ] as CatalogOrderStatus[]
            ).map((id) => ({ id, label: CATALOG_ORDER_STATUS_LABELS[id] })),
          ].map((tab) => (
            <button
              type="button"
              key={tab.id}
              aria-pressed={status === tab.id}
              onClick={() => setStatus(tab.id)}
              className={`rounded-full px-3.5 py-2 text-xs font-medium transition ${status === tab.id ? "bg-teal text-white" : "bg-card/70 text-muted-foreground ring-1 ring-border hover:bg-secondary"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <label className="block max-w-sm text-xs font-medium text-muted-foreground">
          Buscar pedido
          <Input
            value={q}
            maxLength={100}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Nombre, teléfono o referencia"
            className="mt-1.5"
          />
        </label>
        {orders.error ? (
          <p role="alert" className="catalog-error">
            {orders.error}
          </p>
        ) : null}
        <div className="overflow-hidden rounded-2xl bg-card/90 ring-1 ring-border/70">
          {orders.error ? null : orders.loading ? (
            <p
              role="status"
              className="px-5 py-10 text-sm text-muted-foreground"
            >
              Cargando pedidos…
            </p>
          ) : !orders.data?.orders.length ? (
            <div className="px-6 py-12 text-center">
              <Package className="mx-auto size-9 text-muted-foreground/50" />
              <h3 className="mt-4 font-medium">
                {status
                  ? "No hay pedidos con este estado"
                  : "Los próximos pedidos empiezan acá"}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                {status
                  ? "Elegí otro filtro para consultar el resto."
                  : "Compartí el enlace de tu catálogo. Cuando un cliente prepare un pedido, aparecerá en esta lista."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {orders.data.orders.map((order) => (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(order)}
                    className="flex w-full flex-wrap items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-secondary/40"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm">{order.buyerName}</strong>
                        <span className="rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                          {CATALOG_ORDER_STATUS_LABELS[order.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        #{order.id.slice(-8).toUpperCase()} ·{" "}
                        {order.items.reduce(
                          (sum, item) => sum + item.quantity,
                          0,
                        )}{" "}
                        unidades ·{" "}
                        {new Date(order.createdAt).toLocaleString("es-AR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                    <span className="font-display text-lg font-semibold tabular-nums">
                      {catalogMoney(order.total, order.currency)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <ProductPagination
          label="Páginas de pedidos del catálogo"
          page={page}
          hasMore={orders.data?.hasMore ?? false}
          loading={orders.loading}
          onPage={(next) => setCursor({ key: filterKey, page: next })}
        />
      </section>
      {settingsOpen && settings ? (
        <CatalogSettingsDialog
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onSaved={() => {
            setSettingsOpen(false);
            meta.reload();
            setMessage("Configuración del catálogo guardada.");
          }}
        />
      ) : null}
      {selected ? (
        <CatalogOrderDialog
          order={selected}
          canEdit={["superadmin", "administrador", "vendedor"].includes(
            meta.data?.role ?? "",
          )}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null);
            orders.reload();
            setMessage("Estado del pedido actualizado.");
          }}
        />
      ) : null}
    </div>
  );
}
