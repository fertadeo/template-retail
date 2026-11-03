"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, type QuotePayload } from "@/lib/api-client";
import { isApiMode } from "@/lib/api-config";
import { downloadPresupuestoPdf } from "@/lib/presupuesto-pdf";
import { useRetailQuery } from "@/lib/use-retail-query";
import {
  QUOTE_STATUS_LABELS,
  productPrice,
  type Client,
  type DiscountMode,
  type DiscountRule,
  type DiscountTier,
  type PriceList,
  type Product,
  type Quote,
  type QuoteStatus,
} from "@/lib/types";
import { formatMxn } from "@/lib/utils";

type DraftLine = {
  key: string;
  productId: string;
  cantidad: string;
  precioUnitario: string;
  lineDescuentoPct: string;
};

function newLineKey() {
  return `l_${Math.random().toString(36).slice(2, 9)}`;
}

export function QuotesPanel() {
  const [tab, setTab] = useState<"list" | "edit" | "rules">("list");
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data, loading, error, reload } = useRetailQuery(
    async () => {
      if (!isApiMode()) {
        return {
          quotes: [] as Quote[],
          lists: [] as PriceList[],
          rules: [] as DiscountRule[],
          products: [] as Product[],
          clients: [] as Client[],
        };
      }
      const [quotes, lists, rules, products, clients] = await Promise.all([
        api.listQuotes(),
        api.listPriceLists(true),
        api.listDiscountRules(true),
        api.listProducts(),
        api.listClients(),
      ]);
      return { quotes, lists, rules, products, clients };
    },
    []
  );

  const quotes = data?.quotes ?? [];
  const lists = data?.lists ?? [];
  const rules = data?.rules ?? [];
  const products = data?.products ?? [];
  const clients = data?.clients ?? [];

  function startNew() {
    setEditingId(null);
    setTab("edit");
  }

  function startEdit(id: string) {
    setEditingId(id);
    setTab("edit");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Ventas
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-charcoal">
            Presupuestos
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Armá presupuestos con lista de precios (minorista, mayorista…) y
            descuentos escalonados configurables o editables al momento.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={tab === "list" ? "default" : "outline"}
            onClick={() => setTab("list")}
          >
            Listado
          </Button>
          <Button
            type="button"
            variant={tab === "rules" ? "default" : "outline"}
            onClick={() => setTab("rules")}
          >
            Reglas de descuento
          </Button>
          <Button type="button" size="lg" className="h-10" onClick={startNew}>
            Nuevo presupuesto
          </Button>
        </div>
      </div>

      {!isApiMode() ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
          Conectá el API (`NEXT_PUBLIC_API_URL`) para usar presupuestos.
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      {tab === "list" ? (
        <QuotesList
          quotes={quotes}
          lists={lists}
          onEdit={startEdit}
          onReload={reload}
        />
      ) : null}

      {tab === "edit" ? (
        <QuoteEditor
          quoteId={editingId}
          lists={lists}
          rules={rules}
          products={products}
          clients={clients}
          onCancel={() => setTab("list")}
          onSaved={() => {
            reload();
            setTab("list");
          }}
        />
      ) : null}

      {tab === "rules" ? (
        <DiscountRulesEditor
          rules={rules}
          lists={lists}
          onReload={reload}
        />
      ) : null}
    </div>
  );
}

function QuotesList({
  quotes,
  lists,
  onEdit,
  onReload,
}: {
  quotes: Quote[];
  lists: PriceList[];
  onEdit: (id: string) => void;
  onReload: () => void;
}) {
  async function setStatus(id: string, status: QuoteStatus) {
    await api.setQuoteStatus(id, status);
    onReload();
  }

  function downloadPdf(q: Quote) {
    const priceList = lists.find((l) => l.id === q.priceListId) ?? null;
    downloadPresupuestoPdf({ quote: q, priceList });
  }

  return (
    <div className="overflow-hidden rounded-xl bg-card/90 ring-1 ring-border/70">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border/60 text-xs uppercase tracking-[0.1em] text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Folio</th>
            <th className="px-4 py-3 font-medium">Cliente</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium">Total</th>
            <th className="px-4 py-3 font-medium">Válido hasta</th>
            <th className="px-4 py-3 font-medium" />
          </tr>
        </thead>
        <tbody>
          {quotes.map((q) => (
            <tr key={q.id} className="border-b border-border/40 last:border-0">
              <td className="px-4 py-3 font-mono text-xs">{q.folio}</td>
              <td className="px-4 py-3">{q.clienteNombre}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {QUOTE_STATUS_LABELS[q.status]}
              </td>
              <td className="px-4 py-3 tabular-nums">{formatMxn(q.total)}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {q.validezHasta ?? "—"}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => downloadPdf(q)}
                  >
                    PDF
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(q.id)}
                  >
                    Abrir
                  </Button>
                  {q.status === "borrador" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void setStatus(q.id, "enviado")}
                    >
                      Marcar enviado
                    </Button>
                  ) : null}
                  {q.status === "enviado" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void setStatus(q.id, "aceptado")}
                    >
                      Aceptar
                    </Button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
          {!quotes.length ? (
            <tr>
              <td
                colSpan={6}
                className="px-4 py-8 text-center text-sm text-muted-foreground"
              >
                Todavía no hay presupuestos.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function QuoteEditor({
  quoteId,
  lists,
  rules,
  products,
  clients,
  onCancel,
  onSaved,
}: {
  quoteId: string | null;
  lists: PriceList[];
  rules: DiscountRule[];
  products: Product[];
  clients: Client[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const defaultList = lists.find((l) => l.esDefault) ?? lists[0];
  const [clientId, setClientId] = useState("");
  const [clienteNombre, setClienteNombre] = useState("");
  const [priceListId, setPriceListId] = useState(defaultList?.id ?? "");
  const [discountMode, setDiscountMode] = useState<DiscountMode>("none");
  const [discountRuleId, setDiscountRuleId] = useState("");
  const [tiers, setTiers] = useState<DiscountTier[]>([{ desde: 0, porcentaje: 0 }]);
  const [descuentoManualPct, setDescuentoManualPct] = useState("0");
  const [validezDias, setValidezDias] = useState("15");
  const [notas, setNotas] = useState("");
  const [status, setStatus] = useState<QuoteStatus>("borrador");
  const [lines, setLines] = useState<DraftLine[]>([
    {
      key: newLineKey(),
      productId: "",
      cantidad: "1",
      precioUnitario: "",
      lineDescuentoPct: "0",
    },
  ]);
  const [preview, setPreview] = useState<{
    subtotal: number;
    descuentoPctAplicado: number;
    descuentoMonto: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [folio, setFolio] = useState<string | null>(null);
  const [loadedQuote, setLoadedQuote] = useState<Quote | null>(null);

  useEffect(() => {
    if (!quoteId || !isApiMode()) return;
    void api.getQuote(quoteId).then((q) => {
      setLoadedQuote(q);
      setFolio(q.folio);
      setClientId(q.clientId ?? "");
      setClienteNombre(q.clienteNombre);
      setPriceListId(q.priceListId ?? defaultList?.id ?? "");
      setDiscountMode(q.discountMode);
      setDiscountRuleId(q.discountRuleId ?? "");
      setTiers(q.tiers.length ? q.tiers : [{ desde: 0, porcentaje: 0 }]);
      setDescuentoManualPct(String(q.descuentoManualPct));
      setValidezDias(String(q.validezDias));
      setNotas(q.notas);
      setStatus(q.status);
      setLines(
        q.lines.map((l) => ({
          key: newLineKey(),
          productId: l.productId ?? "",
          cantidad: String(l.cantidad),
          precioUnitario: String(l.precioUnitario),
          lineDescuentoPct: String(l.lineDescuentoPct),
        }))
      );
    });
  }, [quoteId, defaultList?.id]);

  function onPickClient(id: string) {
    setClientId(id);
    const c = clients.find((x) => x.id === id);
    if (c) {
      setClienteNombre(c.nombre);
      if (c.priceListId) setPriceListId(c.priceListId);
    }
  }

  function onPickRule(id: string) {
    setDiscountRuleId(id);
    const rule = rules.find((r) => r.id === id);
    if (rule) {
      setDiscountMode("rule");
      setTiers(rule.tiers.length ? rule.tiers : [{ desde: 0, porcentaje: 0 }]);
      if (rule.priceListId) setPriceListId(rule.priceListId);
    }
  }

  function onPickProduct(key: string, productId: string) {
    const p = products.find((x) => x.id === productId);
    setLines((prev) =>
      prev.map((l) =>
        l.key === key
          ? {
              ...l,
              productId,
              precioUnitario: p
                ? String(productPrice(p, priceListId))
                : l.precioUnitario,
            }
          : l
      )
    );
  }

  function onChangePriceList(listId: string) {
    setPriceListId(listId);
    setLines((prev) =>
      prev.map((l) => {
        const p = products.find((x) => x.id === l.productId);
        if (!p) return l;
        return { ...l, precioUnitario: String(productPrice(p, listId)) };
      })
    );
  }

  const payload: QuotePayload = useMemo(
    () => ({
      clientId: clientId || null,
      clienteNombre,
      priceListId: priceListId || null,
      discountRuleId: discountRuleId || null,
      discountMode,
      discountBasis:
        rules.find((r) => r.id === discountRuleId)?.basis ?? "amount",
      tiers: discountMode === "rule" ? tiers : undefined,
      descuentoManualPct: Number(descuentoManualPct) || 0,
      validezDias: Number(validezDias) || 15,
      notas,
      status,
      lines: lines
        .filter((l) => l.productId || Number(l.precioUnitario) > 0)
        .map((l) => ({
          productId: l.productId || null,
          cantidad: Number(l.cantidad) || 0,
          precioUnitario: Number(l.precioUnitario) || 0,
          lineDescuentoPct: Number(l.lineDescuentoPct) || 0,
        })),
    }),
    [
      clientId,
      clienteNombre,
      priceListId,
      discountRuleId,
      discountMode,
      tiers,
      descuentoManualPct,
      validezDias,
      notas,
      status,
      lines,
      rules,
    ]
  );

  useEffect(() => {
    if (!isApiMode() || !payload.lines.length) {
      setPreview(null);
      return;
    }
    const t = setTimeout(() => {
      void api
        .previewQuote(payload)
        .then((r) =>
          setPreview({
            subtotal: r.subtotal,
            descuentoPctAplicado: r.descuentoPctAplicado,
            descuentoMonto: r.descuentoMonto,
            total: r.total,
          })
        )
        .catch(() => setPreview(null));
    }, 280);
    return () => clearTimeout(t);
  }, [payload]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const saved = quoteId
        ? await api.updateQuote(quoteId, payload)
        : await api.createQuote(payload);
      setLoadedQuote(saved);
      setFolio(saved.folio);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 rounded-xl bg-card/90 p-5 ring-1 ring-border/70">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-semibold text-charcoal">
          {folio ? `Presupuesto ${folio}` : "Nuevo presupuesto"}
        </h2>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Volver
          </Button>
          {loadedQuote ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                downloadPresupuestoPdf({
                  quote: loadedQuote,
                  priceList:
                    lists.find((l) => l.id === loadedQuote.priceListId) ??
                    lists.find((l) => l.id === priceListId) ??
                    null,
                })
              }
            >
              Descargar PDF
            </Button>
          ) : null}
          <Button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label>Cliente</Label>
          <select
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={clientId}
            onChange={(e) => onPickClient(e.target.value)}
          >
            <option value="">Eventual / sin ficha</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Nombre en presupuesto</Label>
          <Input
            value={clienteNombre}
            onChange={(e) => setClienteNombre(e.target.value)}
          />
        </div>
        <div>
          <Label>Lista de precios</Label>
          <select
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={priceListId}
            onChange={(e) => onChangePriceList(e.target.value)}
          >
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nombre}
                {l.esDefault ? " (default)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label>Modo de descuento</Label>
          <select
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={discountMode}
            onChange={(e) => setDiscountMode(e.target.value as DiscountMode)}
          >
            <option value="none">Sin descuento</option>
            <option value="rule">Escalonado (regla / editable)</option>
            <option value="manual">Porcentaje manual</option>
          </select>
        </div>
        {discountMode === "rule" ? (
          <div>
            <Label>Regla base</Label>
            <select
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={discountRuleId}
              onChange={(e) => onPickRule(e.target.value)}
            >
              <option value="">Personalizado en este presupuesto</option>
              {rules.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {discountMode === "manual" ? (
          <div>
            <Label>% descuento manual</Label>
            <Input
              type="number"
              value={descuentoManualPct}
              onChange={(e) => setDescuentoManualPct(e.target.value)}
            />
          </div>
        ) : null}
        <div>
          <Label>Validez (días)</Label>
          <Input
            type="number"
            value={validezDias}
            onChange={(e) => setValidezDias(e.target.value)}
          />
        </div>
      </div>

      {discountMode === "rule" ? (
        <div className="space-y-2 rounded-lg bg-tealSoft/30 p-3 ring-1 ring-border/50">
          <p className="text-sm font-medium text-charcoal">
            Escalones de este presupuesto
          </p>
          <p className="text-xs text-muted-foreground">
            Podés editarlos acá sin cambiar la regla guardada. Se aplica el
            mayor umbral alcanzado por el subtotal.
          </p>
          {tiers.map((t, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <Input
                type="number"
                placeholder="Desde $"
                value={t.desde}
                onChange={(e) => {
                  const v = Number(e.target.value) || 0;
                  setTiers((prev) =>
                    prev.map((x, i) => (i === idx ? { ...x, desde: v } : x))
                  );
                }}
              />
              <Input
                type="number"
                placeholder="% dto"
                value={t.porcentaje}
                onChange={(e) => {
                  const v = Number(e.target.value) || 0;
                  setTiers((prev) =>
                    prev.map((x, i) =>
                      i === idx ? { ...x, porcentaje: v } : x
                    )
                  );
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setTiers((prev) => prev.filter((_, i) => i !== idx))
                }
              >
                Quitar
              </Button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setTiers((prev) => [...prev, { desde: 0, porcentaje: 0 }])
            }
          >
            Agregar escalón
          </Button>
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Ítems</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setLines((prev) => [
                ...prev,
                {
                  key: newLineKey(),
                  productId: "",
                  cantidad: "1",
                  precioUnitario: "",
                  lineDescuentoPct: "0",
                },
              ])
            }
          >
            Agregar línea
          </Button>
        </div>
        {lines.map((l) => (
          <div
            key={l.key}
            className="grid gap-2 sm:grid-cols-[2fr_0.7fr_0.9fr_0.7fr_auto]"
          >
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={l.productId}
              onChange={(e) => onPickProduct(l.key, e.target.value)}
            >
              <option value="">Producto…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.nombre}
                </option>
              ))}
            </select>
            <Input
              type="number"
              value={l.cantidad}
              onChange={(e) =>
                setLines((prev) =>
                  prev.map((x) =>
                    x.key === l.key ? { ...x, cantidad: e.target.value } : x
                  )
                )
              }
              placeholder="Cant."
            />
            <Input
              type="number"
              value={l.precioUnitario}
              onChange={(e) =>
                setLines((prev) =>
                  prev.map((x) =>
                    x.key === l.key
                      ? { ...x, precioUnitario: e.target.value }
                      : x
                  )
                )
              }
              placeholder="Precio"
            />
            <Input
              type="number"
              value={l.lineDescuentoPct}
              onChange={(e) =>
                setLines((prev) =>
                  prev.map((x) =>
                    x.key === l.key
                      ? { ...x, lineDescuentoPct: e.target.value }
                      : x
                  )
                )
              }
              placeholder="% línea"
              title="Descuento por línea"
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() =>
                setLines((prev) => prev.filter((x) => x.key !== l.key))
              }
            >
              ×
            </Button>
          </div>
        ))}
      </div>

      <div>
        <Label>Notas</Label>
        <Input value={notas} onChange={(e) => setNotas(e.target.value)} />
      </div>

      {preview ? (
        <div className="grid gap-1 rounded-lg bg-[#2a2622] px-4 py-3 text-sm text-sand sm:max-w-sm sm:ml-auto">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatMxn(preview.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sand/80">
            <span>Desc. {preview.descuentoPctAplicado}%</span>
            <span className="tabular-nums">
              −{formatMxn(preview.descuentoMonto)}
            </span>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-2 font-semibold text-[#e7f8f5]">
            <span>Total</span>
            <span className="tabular-nums">{formatMxn(preview.total)}</span>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function DiscountRulesEditor({
  rules,
  lists,
  onReload,
}: {
  rules: DiscountRule[];
  lists: PriceList[];
  onReload: () => void;
}) {
  const [editing, setEditing] = useState<DiscountRule | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [basis, setBasis] = useState<"amount" | "qty">("amount");
  const [priceListId, setPriceListId] = useState("");
  const [tiers, setTiers] = useState<DiscountTier[]>([
    { desde: 0, porcentaje: 0 },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startCreate() {
    setEditing(null);
    setNombre("");
    setDescripcion("");
    setBasis("amount");
    setPriceListId("");
    setTiers([
      { desde: 0, porcentaje: 0 },
      { desde: 50000, porcentaje: 5 },
      { desde: 150000, porcentaje: 10 },
    ]);
  }

  function startEdit(r: DiscountRule) {
    setEditing(r);
    setNombre(r.nombre);
    setDescripcion(r.descripcion);
    setBasis(r.basis);
    setPriceListId(r.priceListId ?? "");
    setTiers(r.tiers.length ? r.tiers : [{ desde: 0, porcentaje: 0 }]);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.upsertDiscountRule({
        id: editing?.id,
        nombre,
        descripcion,
        basis,
        priceListId: priceListId || null,
        tiers,
        activa: true,
      });
      startCreate();
      setEditing(null);
      onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-xl bg-card/90 p-4 ring-1 ring-border/70">
        <h2 className="font-display text-lg font-semibold text-charcoal">
          {editing ? "Editar regla" : "Nueva regla de descuento"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Nombre</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div>
            <Label>Base del escalón</Label>
            <select
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={basis}
              onChange={(e) => setBasis(e.target.value as "amount" | "qty")}
            >
              <option value="amount">Por subtotal ($)</option>
              <option value="qty">Por cantidad total</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label>Descripción</Label>
            <Input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>
          <div>
            <Label>Lista sugerida (opcional)</Label>
            <select
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={priceListId}
              onChange={(e) => setPriceListId(e.target.value)}
            >
              <option value="">Cualquiera</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Escalones</Label>
          {tiers.map((t, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <Input
                type="number"
                value={t.desde}
                onChange={(e) => {
                  const v = Number(e.target.value) || 0;
                  setTiers((prev) =>
                    prev.map((x, i) => (i === idx ? { ...x, desde: v } : x))
                  );
                }}
                placeholder="Desde"
              />
              <Input
                type="number"
                value={t.porcentaje}
                onChange={(e) => {
                  const v = Number(e.target.value) || 0;
                  setTiers((prev) =>
                    prev.map((x, i) =>
                      i === idx ? { ...x, porcentaje: v } : x
                    )
                  );
                }}
                placeholder="%"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setTiers((prev) => prev.filter((_, i) => i !== idx))
                }
              >
                Quitar
              </Button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setTiers((prev) => [...prev, { desde: 0, porcentaje: 0 }])
            }
          >
            Agregar escalón
          </Button>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex gap-2">
          <Button type="button" disabled={saving} onClick={() => void save()}>
            Guardar regla
          </Button>
          {editing ? (
            <Button type="button" variant="outline" onClick={startCreate}>
              Nueva
            </Button>
          ) : null}
        </div>
      </div>

      <ul className="space-y-2">
        {rules.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-card/80 px-3 py-2 ring-1 ring-border/60"
          >
            <div>
              <p className="font-medium text-charcoal">{r.nombre}</p>
              <p className="text-xs text-muted-foreground">
                {r.basis === "amount" ? "Por $" : "Por qty"} ·{" "}
                {r.tiers
                  .map((t) => `≥${t.desde} → ${t.porcentaje}%`)
                  .join(" · ")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => startEdit(r)}
              >
                Editar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  void api.deleteDiscountRule(r.id).then(() => onReload())
                }
              >
                Eliminar
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
