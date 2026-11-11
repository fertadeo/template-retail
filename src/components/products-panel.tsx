"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { ConfirmModal } from "@/components/confirm-modal";
import { ProductImportFromUrlModal } from "@/components/product-import-from-url-modal";
import {
  ProductImagesEditor,
  type PendingFile,
} from "@/components/product-images-editor";
import { ProductDetailModal } from "@/components/product-detail-modal";
import { RowActionsMenu } from "@/components/row-actions-menu";
import { ProductHealthDot } from "@/components/status-dot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  dataUrlByteSize,
  type ImportedProductDraft,
} from "@/lib/product-import";
import {
  HEALTH_FILTERS,
  healthDotClass,
  productHealth,
  type ProductHealthLevel,
} from "@/lib/product-health";
import {
  getProduct,
  listPriceLists,
  listProducts,
  pushMeliProduct,
  pushWooProduct,
  uploadProductImage,
  upsertProduct,
  upsertProductChannelLink,
  usingRemoteApi,
} from "@/lib/store";
import { useRetailQuery } from "@/lib/use-retail-query";
import {
  CATEGORY_LABELS,
  productImageSrc,
  type Product,
  type ProductCategory,
} from "@/lib/types";
import { cn, formatMxn } from "@/lib/utils";

const CATS = Object.keys(CATEGORY_LABELS) as ProductCategory[];

type ProductEditorPrefill = {
  nombre: string;
  sku: string;
  descripcion: string;
  categoria: ProductCategory;
  precio: number;
  pendingImages: PendingFile[];
};

type SortKey =
  | "nombre"
  | "recent"
  | "oldest"
  | "sold_desc"
  | "sold_asc";

export function ProductsPanel() {
  const {
    data: products,
    loading,
    error,
    reload,
  } = useRetailQuery(() => listProducts(), []);
  const { data: lists, error: listsError } = useRetailQuery(
    () => listPriceLists(true),
    []
  );
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<Product | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncBusy, setSyncBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"" | ProductCategory>("");
  const [healthFilter, setHealthFilter] = useState<ProductHealthLevel | "all">(
    "all"
  );
  const [sort, setSort] = useState<SortKey>("nombre");
  const [importOpen, setImportOpen] = useState(false);
  const [createPrefill, setCreatePrefill] =
    useState<ProductEditorPrefill | null>(null);

  function applyImportDraft(draft: ImportedProductDraft) {
    const pending: PendingFile[] = draft.images
      .filter((img): img is typeof img & { dataUrl: string } =>
        Boolean(img.dataUrl)
      )
      .map((img, i) => ({
        key: `import-${i}-${img.filename}`,
        filename: img.filename,
        mime: img.mime,
        sizeBytes: dataUrlByteSize(img.dataUrl),
        dataUrl: img.dataUrl,
        asPrimary: i === 0,
      }));
    const cat = CATS.includes(draft.categoria as ProductCategory)
      ? (draft.categoria as ProductCategory)
      : "otros";
    setCreatePrefill({
      nombre: draft.nombre,
      sku: draft.sku,
      descripcion: draft.descripcion,
      categoria: cat,
      precio: draft.precio,
      pendingImages: pending,
    });
    setCreating(true);
    setEditing(null);
    setDetail(null);
  }

  const healthCounts = useMemo(() => {
    const counts = { ready: 0, attention: 0, critical: 0, all: 0 };
    for (const p of products ?? []) {
      counts.all += 1;
      counts[productHealth(p).level] += 1;
    }
    return counts;
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = [...(products ?? [])];
    if (q) {
      rows = rows.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
      );
    }
    if (category) {
      rows = rows.filter((p) => p.categoria === category);
    }
    if (healthFilter !== "all") {
      rows = rows.filter((p) => productHealth(p).level === healthFilter);
    }
    rows.sort((a, b) => {
      switch (sort) {
        case "recent":
          return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
        case "oldest":
          return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
        case "sold_desc":
          return (b.unitsSold ?? 0) - (a.unitsSold ?? 0);
        case "sold_asc":
          return (a.unitsSold ?? 0) - (b.unitsSold ?? 0);
        default:
          return a.nombre.localeCompare(b.nombre, "es");
      }
    });
    return rows;
  }, [products, query, category, healthFilter, sort]);

  async function openDetail(p: Product) {
    setDetail(p);
    const full = await getProduct(p.id);
    if (full) setDetail(full);
  }

  async function syncChannel(
    productId: string,
    channel: "woocommerce" | "mercadolibre"
  ) {
    if (!usingRemoteApi()) {
      setSyncMsg("Sync requiere API remota (NEXT_PUBLIC_API_URL).");
      return;
    }
    const key = `${channel}:${productId}`;
    setSyncBusy(key);
    setSyncMsg(null);
    try {
      if (channel === "woocommerce") {
        const r = await pushWooProduct(productId, "both");
        setSyncMsg(`WC #${r.externalId}: stock ${r.stock} · $${r.price}`);
      } else {
        const r = await pushMeliProduct(productId, "both");
        setSyncMsg(`ML ${r.externalId}: stock ${r.stock} · $${r.price}`);
      }
      reload();
    } catch (e) {
      setSyncMsg(e instanceof Error ? e.message : "Error de sync.");
    } finally {
      setSyncBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Inventario
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-charcoal">
            Productos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Alta, ficha QR y sync a WooCommerce / Mercado Libre. El semáforo
            marca si falta foto, precio u otros datos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-10"
            onClick={() => setImportOpen(true)}
          >
            Desde URL
          </Button>
          <Button
            type="button"
            size="lg"
            className="h-10"
            onClick={() => {
              setCreatePrefill(null);
              setCreating(true);
              setEditing(null);
              setDetail(null);
            }}
          >
            Cargar producto
          </Button>
        </div>
      </div>

      <ProductImportFromUrlModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onApply={applyImportDraft}
      />

      <div className="flex flex-col gap-3">
        <div
          role="tablist"
          aria-label="Salubridad"
          className="inline-flex flex-wrap rounded-lg bg-secondary/70 p-1 ring-1 ring-border/60"
        >
          {HEALTH_FILTERS.map((t) => {
            const active = healthFilter === t.id;
            const count =
              t.id === "all" ? healthCounts.all : healthCounts[t.id];
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setHealthFilter(t.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                  active
                    ? "bg-card text-charcoal shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.id !== "all" ? (
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      healthDotClass(t.id)
                    )}
                    aria-hidden
                  />
                ) : null}
                {t.label}{" "}
                <span
                  className={cn(
                    "tabular-nums",
                    active ? "text-teal" : "text-muted-foreground"
                  )}
                >
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="prod-q">Buscar</Label>
            <Input
              id="prod-q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nombre o SKU"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="prod-cat">Categoría</Label>
            <select
              id="prod-cat"
              className="flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as "" | ProductCategory)
              }
            >
              <option value="">Todas</option>
              {CATS.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2 lg:col-span-2">
            <Label htmlFor="prod-sort">Orden</Label>
            <select
              id="prod-sort"
              className="flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="nombre">Nombre A–Z</option>
              <option value="recent">Más recientes</option>
              <option value="oldest">Más antiguos</option>
              <option value="sold_desc">Más vendidos</option>
              <option value="sold_asc">Menos vendidos</option>
            </select>
          </div>
        </div>
      </div>

      {creating || editing ? (
        <ProductEditor
          initial={editing ?? undefined}
          prefill={creating && !editing ? createPrefill ?? undefined : undefined}
          onCancel={() => {
            setCreatePrefill(null);
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreatePrefill(null);
            setCreating(false);
            setEditing(null);
            reload();
          }}
        />
      ) : null}

      {detail ? (
        <ProductDetailModal
          product={detail}
          onClose={() => setDetail(null)}
          onEdit={() => {
            setEditing(detail);
            setCreating(false);
            setDetail(null);
          }}
        />
      ) : null}

      {syncMsg ? (
        <p className="rounded-lg bg-tealSoft/60 px-3 py-2 text-sm text-charcoal">
          {syncMsg}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl bg-card/90 ring-1 ring-border/70">
        {loading ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Cargando productos…</p>
        ) : error || listsError ? (
          <p className="px-4 py-6 text-sm text-destructive">
            {error ?? listsError}
          </p>
        ) : null}
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border/60 text-xs uppercase tracking-[0.1em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium"> </th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="hidden px-4 py-3 font-medium lg:table-cell">
                Estado
              </th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">
                Categoría
              </th>
              <th className="px-4 py-3 font-medium">Default</th>
              <th className="hidden px-4 py-3 font-medium xl:table-cell">
                Vendidos
              </th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filtered.map((p) => {
              const health = productHealth(p);
              return (
                <tr
                  key={p.id}
                  className={!p.activo ? "opacity-50" : undefined}
                >
                  <td className="px-4 py-3">
                    <div className="size-10 overflow-hidden rounded-lg bg-muted/60 ring-1 ring-border/60">
                      {productImageSrc(p.imagenPrincipal) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={productImageSrc(p.imagenPrincipal)!}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-[9px] text-muted-foreground">
                          —
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-left font-medium hover:text-teal hover:underline"
                      onClick={() => void openDetail(p)}
                    >
                      {p.nombre}
                    </button>
                    <div className="mt-1 lg:hidden">
                      <ProductHealthDot health={health} />
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <ProductHealthDot health={health} />
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                    {CATEGORY_LABELS[p.categoria]}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatMxn(p.precio)}
                  </td>
                  <td className="hidden px-4 py-3 tabular-nums text-muted-foreground xl:table-cell">
                    {p.unitsSold ?? 0}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{p.stock}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-0.5">
                      <RowActionsMenu
                        label={`Acciones de ${p.nombre}`}
                        items={[
                          {
                            id: "ficha",
                            label: "Ver ficha",
                            tone: "teal",
                            onSelect: () => void openDetail(p),
                          },
                          {
                            id: "wc",
                            label:
                              syncBusy === `woocommerce:${p.id}`
                                ? "Sincronizando WC…"
                                : "Empujar a WooCommerce",
                            tone: "teal",
                            disabled: Boolean(syncBusy),
                            busy: syncBusy === `woocommerce:${p.id}`,
                            onSelect: () =>
                              void syncChannel(p.id, "woocommerce"),
                          },
                          {
                            id: "ml",
                            label:
                              syncBusy === `mercadolibre:${p.id}`
                                ? "Sincronizando ML…"
                                : "Empujar a Mercado Libre",
                            tone: "amber",
                            disabled: Boolean(syncBusy),
                            busy: syncBusy === `mercadolibre:${p.id}`,
                            onSelect: () =>
                              void syncChannel(p.id, "mercadolibre"),
                          },
                        ]}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground"
                        aria-label={`Editar ${p.nombre}`}
                        title="Editar"
                        onClick={() => {
                          setEditing(p);
                          setCreating(false);
                          setDetail(null);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && !error && filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-6 text-sm text-muted-foreground"
                >
                  No hay productos con esos filtros.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

    </div>
  );
}

function ProductEditor({
  initial,
  prefill,
  onCancel,
  onSaved,
}: {
  initial?: Product;
  prefill?: ProductEditorPrefill;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const {
    data: lists,
    loading,
    error: loadError,
  } = useRetailQuery(() => listPriceLists(true), []);
  const [sku, setSku] = useState(initial?.sku ?? prefill?.sku ?? "");
  const [nombre, setNombre] = useState(initial?.nombre ?? prefill?.nombre ?? "");
  const [categoria, setCategoria] = useState<ProductCategory>(
    initial?.categoria ?? prefill?.categoria ?? "otros"
  );
  const [precios, setPrecios] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const pl of lists ?? []) {
      map[pl.id] = String(
        initial?.precios[pl.id] ?? initial?.precio ?? 0
      );
    }
    return map;
  });
  useEffect(() => {
    if (!lists) return;
    setPrecios((current) => {
      const next = { ...current };
      for (const pl of lists) {
        if (next[pl.id] == null) {
          next[pl.id] = String(
            initial?.precios[pl.id] ?? initial?.precio ?? 0
          );
        }
      }
      return next;
    });
  }, [initial, lists]);
  useEffect(() => {
    if (!prefill?.precio || !lists?.length) return;
    const defaultList = lists.find((l) => l.esDefault) ?? lists[0];
    if (!defaultList) return;
    setPrecios((current) => ({
      ...current,
      [defaultList.id]: String(prefill.precio),
    }));
  }, [prefill, lists]);
  const [costo, setCosto] = useState(String(initial?.costo ?? 0));
  const [stock, setStock] = useState(String(initial?.stock ?? 0));
  const [descripcion, setDescripcion] = useState(
    initial?.descripcion ?? prefill?.descripcion ?? ""
  );
  const [activo, setActivo] = useState(initial?.activo ?? true);
  const [wooId, setWooId] = useState(
    initial?.channelLinks?.find((l) => l.channel === "woocommerce")
      ?.externalId ?? ""
  );
  const [meliId, setMeliId] = useState(
    initial?.channelLinks?.find((l) => l.channel === "mercadolibre")
      ?.externalId ?? ""
  );
  const [pendingImages, setPendingImages] = useState<PendingFile[]>(
    prefill?.pendingImages ?? []
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingSyncId, setPendingSyncId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const hadWooLink = Boolean(
    initial?.channelLinks?.find((l) => l.channel === "woocommerce")
      ?.externalId
  );

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const preciosNum: Record<string, number> = {};
      for (const pl of lists ?? []) {
        preciosNum[pl.id] = Number(precios[pl.id]) || 0;
      }
      const defaultList = lists?.find((l) => l.esDefault) ?? lists?.[0];
      const saved = await upsertProduct({
        id: initial?.id,
        sku,
        nombre,
        categoria,
        precio: defaultList ? preciosNum[defaultList.id] ?? 0 : 0,
        precios: preciosNum,
        costo: Number(costo) || 0,
        stock: Number(stock) || 0,
        descripcion,
        activo,
      });
      if (wooId.trim()) {
        await upsertProductChannelLink(saved.id, "woocommerce", {
          externalId: wooId.trim(),
          externalSku: sku,
        });
      }
      if (meliId.trim()) {
        await upsertProductChannelLink(saved.id, "mercadolibre", {
          externalId: meliId.trim(),
          externalSku: sku,
        });
      }
      for (const pending of pendingImages) {
        await uploadProductImage(saved.id, {
          filename: pending.filename,
          mime: pending.mime,
          sizeBytes: pending.sizeBytes,
          dataUrl: pending.dataUrl,
          isPrimary: pending.asPrimary,
          title: pending.filename,
        });
      }
      const canOfferWooSync =
        Boolean(initial) &&
        usingRemoteApi() &&
        (Boolean(wooId.trim()) || hadWooLink);
      if (canOfferWooSync) {
        setPendingSyncId(saved.id);
      } else {
        onSaved();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmSyncToWeb() {
    if (!pendingSyncId) return;
    setSyncing(true);
    setError(null);
    try {
      await pushWooProduct(pendingSyncId, "both");
      setPendingSyncId(null);
      onSaved();
    } catch (e) {
      setPendingSyncId(null);
      setError(
        e instanceof Error
          ? e.message
          : "Guardado en Aurix, pero falló el sync con el sitio web."
      );
    } finally {
      setSyncing(false);
    }
  }

  function skipSyncToWeb() {
    setPendingSyncId(null);
    onSaved();
  }

  return (
    <>
    <form
      className="space-y-4 rounded-xl bg-card/90 p-5 ring-1 ring-border/70"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <h2 className="font-display text-lg font-medium text-charcoal">
        {initial ? "Editar producto" : "Nuevo producto"}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="sku">SKU</Label>
          <Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cat">Categoría</Label>
          <select
            id="cat"
            className="flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as ProductCategory)}
          >
            {CATS.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="nombre">Nombre</Label>
          <Input
            id="nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <p className="text-sm font-medium">Precios por lista</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(lists ?? []).map((pl) => (
              <div key={pl.id} className="space-y-1.5">
                <Label htmlFor={`precio-${pl.id}`}>
                  {pl.nombre}
                  {pl.esDefault ? " (default)" : ""}
                </Label>
                <Input
                  id={`precio-${pl.id}`}
                  type="number"
                  value={precios[pl.id] ?? "0"}
                  onChange={(e) =>
                    setPrecios((prev) => ({
                      ...prev,
                      [pl.id]: e.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Las listas se gestionan en Configuración.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="costo">Costo</Label>
          <Input
            id="costo"
            type="number"
            value={costo}
            onChange={(e) => setCosto(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="stock">Stock</Label>
          <Input
            id="stock"
            type="number"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        </div>
        <div className="flex items-end gap-2 pb-2">
          <input
            id="activo"
            type="checkbox"
            className="size-4"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
          />
          <Label htmlFor="activo">Activo en catálogo</Label>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="desc">Descripción</Label>
          <Input
            id="desc"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>
        <ProductImagesEditor
          productId={initial?.id}
          initialPrimary={initial?.imagenPrincipal}
          initialSecondaries={initial?.imagenesSecundarias}
          pending={pendingImages}
          onPendingChange={setPendingImages}
        />
        <div className="space-y-1.5">
          <Label htmlFor="woo-id">ID WooCommerce</Label>
          <Input
            id="woo-id"
            value={wooId}
            onChange={(e) => setWooId(e.target.value)}
            placeholder="vacío = crear al empujar"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="meli-id">Ítem Mercado Libre</Label>
          <Input
            id="meli-id"
            value={meliId}
            onChange={(e) => setMeliId(e.target.value)}
            placeholder="MLA…"
          />
        </div>
      </div>
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}
      {loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={loading || saving || syncing}>
          {saving ? "Guardando…" : "Guardar"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saving || syncing}
          onClick={onCancel}
        >
          Cancelar
        </Button>
      </div>
    </form>

    {pendingSyncId ? (
      <ConfirmModal
        title="¿Actualizar también el sitio web?"
        description="El producto ya quedó guardado en Aurix. ¿Querés empujar stock y precio a WooCommerce para actualizarlo en el sitio?"
        confirmLabel="Sí, sincronizar"
        cancelLabel="No, solo Aurix"
        busy={syncing}
        onConfirm={() => void confirmSyncToWeb()}
        onCancel={skipSyncToWeb}
      />
    ) : null}
    </>
  );
}
