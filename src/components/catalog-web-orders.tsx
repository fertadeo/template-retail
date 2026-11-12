"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import {
  CATALOG_ORDER_STATUS_LABELS,
  type CatalogOrderStatus,
} from "@/lib/catalog";
import { formatMxn } from "@/lib/utils";
import { useRetailQuery } from "@/lib/use-retail-query";

const MUTABLE: CatalogOrderStatus[] = [
  "pendiente",
  "confirmado",
  "cobrado",
  "cancelado",
];

export function CatalogWebOrders() {
  const { data, loading, error, reload } = useRetailQuery(
    () => Promise.all([api.getCatalogSettings(), api.listCatalogOrders()]),
    []
  );
  const settings = data?.[0] ?? null;
  const orders = data?.[1] ?? [];
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function patchStatus(id: string, status: CatalogOrderStatus) {
    setSaving(true);
    setLocalError(null);
    try {
      await api.patchCatalogOrder(id, status);
      reload();
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "No se pudo actualizar."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-charcoal">
            Pedidos web
          </h2>
          <p className="text-sm text-muted-foreground">
            Desde{" "}
            <Link
              href="/tienda"
              className="text-teal underline-offset-2 hover:underline"
            >
              /tienda
            </Link>
            {settings?.publicEnabled ? " · tienda activa" : " · tienda pausada"}
            {settings?.whatsappPhone
              ? ` · WA ${settings.whatsappPhone}`
              : " · WhatsApp sin configurar"}
          </p>
        </div>
        <Link
          href="/tienda"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm"
        >
          <ExternalLink className="size-4" />
          Ver tienda
        </Link>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando pedidos web…</p>
      ) : error || localError ? (
        <p className="text-sm text-destructive">{localError || error}</p>
      ) : orders.length === 0 ? (
        <p className="rounded-xl bg-card/90 p-4 text-sm text-muted-foreground ring-1 ring-border/70">
          Todavía no hay pedidos del catálogo público.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-card/90 ring-1 ring-border/70">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-border/60 text-xs uppercase tracking-[0.1em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Pedido</th>
                <th className="px-4 py-3 font-medium">Comprador</th>
                <th className="px-4 py-3 font-medium">Ítems</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Vence</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="px-4 py-2">
                    <p className="font-mono text-xs">{o.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(o.createdAt).toLocaleString("es-AR")}
                    </p>
                  </td>
                  <td className="px-4 py-2">
                    <p>{o.buyerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.buyerPhone}
                    </p>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {o.items
                      .map((it) => `${it.quantity}× ${it.name}`)
                      .join(", ")}
                  </td>
                  <td className="px-4 py-2 tabular-nums">
                    {formatMxn(o.total)}
                  </td>
                  <td className="px-4 py-2 text-xs tabular-nums">
                    {new Date(o.expiresAt).toLocaleString("es-AR")}
                  </td>
                  <td className="px-4 py-2">
                    {o.status === "vencido" ? (
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs">
                        {CATALOG_ORDER_STATUS_LABELS[o.status]}
                      </span>
                    ) : (
                      <select
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                        value={o.status}
                        disabled={saving}
                        onChange={(e) =>
                          void patchStatus(
                            o.id,
                            e.target.value as CatalogOrderStatus
                          )
                        }
                      >
                        {MUTABLE.map((s) => (
                          <option key={s} value={s}>
                            {CATALOG_ORDER_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function CatalogSettingsForm() {
  const { data, loading, error, reload } = useRetailQuery(
    () => api.getCatalogSettings(),
    []
  );
  const [phone, setPhone] = useState("");
  const [ttl, setTtl] = useState("24");
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setPhone(data.whatsappPhone);
    setTtl(String(data.orderTtlHours));
    setEnabled(data.publicEnabled);
  }, [data]);

  async function save() {
    setSaving(true);
    setMessage(null);
    setSaveError(null);
    try {
      await api.putCatalogSettings({
        whatsappPhone: phone,
        orderTtlHours: Number(ttl) || 24,
        publicEnabled: enabled,
      });
      setMessage("Configuración de tienda guardada.");
      reload();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !data) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  return (
    <div className="max-w-lg space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {saveError ? (
        <p className="text-sm text-destructive">{saveError}</p>
      ) : null}
      {message ? <p className="text-sm text-teal">{message}</p> : null}
      <div>
        <Label htmlFor="cat-wa">WhatsApp vendedor</Label>
        <Input
          id="cat-wa"
          className="mt-1"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="54911..."
        />
      </div>
      <div>
        <Label htmlFor="cat-ttl">Caducidad (horas)</Label>
        <Input
          id="cat-ttl"
          type="number"
          min={1}
          max={168}
          className="mt-1"
          value={ttl}
          onChange={(e) => setTtl(e.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        Publicar tienda en /tienda
      </label>
      <Button type="button" disabled={saving} onClick={() => void save()}>
        {saving ? "Guardando…" : "Guardar"}
      </Button>
    </div>
  );
}
