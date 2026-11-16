"use client";

import { useEffect, useState } from "react";
import { useProductPage } from "@/lib/use-product-page";
import { ProductPagination } from "@/components/product-pagination";
import { productHealthCounts } from "@/lib/catalog-data";
import { useCatalogQuery } from "@/lib/use-catalog-query";
import { Pencil } from "lucide-react";
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
  HEALTH_FILTERS,
  healthDotClass,
  productHealth,
  type ProductHealthLevel,
} from "@/lib/product-health";
import {
  createCategory,
  getProduct,
  listCategories,
  listPriceLists,
  uploadProductImage,
  upsertProduct,
} from "@/lib/store";
import { useRetailQuery } from "@/lib/use-retail-query";
import {
  categoryLabel,
  productImageSrc,
  type Category,
  type Product,
  type ProductCategory,
} from "@/lib/types";
import { cn, formatMxn } from "@/lib/utils";

function categoryOptions(
  active: Category[],
  current: string,
  product?: Product,
  suggestedName?: string
): Category[] {
  if (!current || active.some((c) => c.codigo === current)) return active;
  return [
    ...active,
    {
      id: `keep-${current}`,
      codigo: current,
      nombre: product?.categoriaNombre || suggestedName || categoryLabel(current),
      activa: false,
    },
  ];
}

type SortKey =
  | "nombre"
  | "recent"
  | "oldest"
  | "sold_desc"
  | "sold_asc";

export function ProductsPanel() {
  const { data: categories, reload: reloadCategories } = useRetailQuery(
    () => listCategories(true),
    []
  );
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<Product | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"" | ProductCategory>("");
  const [healthFilter, setHealthFilter] = useState<ProductHealthLevel | "all">(
    "all"
  );
  const [sort, setSort] = useState<SortKey>("nombre");
  const { data: productPage, loading, error, reload, version, page, setPage } = useProductPage({
    q: query.trim(), category, health: healthFilter, sort, pageSize: 40,
  });
  const { data: healthCounts, error: countsError } = useCatalogQuery(
    ["product-counts", query.trim(), category, version],
    signal => productHealthCounts(query.trim(), category, signal), query.trim() ? 250 : 0
  );
  const filtered = productPage?.items ?? [];

  async function openDetail(p: Product) {
    setDetail(p);
    const full = await getProduct(p.id);
    if (full) setDetail(full);
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
            Alta de productos y etiquetas QR para la venta local. El semáforo
            marca si falta foto, precio u otros datos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="lg"
            className="h-10"
            onClick={() => {
              setCreating(true);
              setEditing(null);
              setDetail(null);
            }}
          >
            Cargar producto
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div
          role="tablist"
          aria-label="Salubridad"
          className="inline-flex flex-wrap rounded-lg bg-secondary/70 p-1 ring-1 ring-border/60"
        >
          {HEALTH_FILTERS.map((t) => {
            const active = healthFilter === t.id;
            const count =
              healthCounts?.[t.id];
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
                  ({count ?? "…"})
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
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.codigo}>
                  {c.nombre}
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
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            reload();
          }}
          onCategoryCreated={reloadCategories}
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

      {countsError ? <p role="status" className="text-sm text-muted-foreground">No se pudieron cargar los contadores de estado.</p> : null}
      {actionError ? (
        <p className="rounded-lg bg-tealSoft/60 px-3 py-2 text-sm text-charcoal">
          {actionError}
        </p>
      ) : null}

      <ProductPagination page={page} hasMore={productPage?.hasMore ?? false} loading={loading} onPage={setPage} />
      <div className="overflow-hidden rounded-xl bg-card/90 ring-1 ring-border/70">
        {loading ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Cargando productos…</p>
        ) : error ? (
          <p className="px-4 py-6 text-sm text-destructive">
            {error}
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
                          loading="lazy"
                          decoding="async"
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
                    {categoryLabel(p.categoria, p.categoriaNombre)}
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
                        ]}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground"
                        aria-label={`Editar ${p.nombre}`}
                        title="Editar"
                        onClick={async () => {
                          try {
                            const full = await getProduct(p.id);
                            if (!full) throw new Error("Producto no encontrado.");
                            setEditing(full);
                            setCreating(false);
                            setDetail(null);
                          } catch (err) { setActionError(err instanceof Error ? err.message : "No se pudo cargar el producto."); }
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
  onCancel,
  onSaved,
  onCategoryCreated,
}: {
  initial?: Product;
  onCancel: () => void;
  onSaved: () => void;
  onCategoryCreated?: () => void;
}) {
  const {
    data: lists,
    loading,
    error: loadError,
  } = useRetailQuery(() => listPriceLists(true), []);
  const { data: categories, reload: reloadCategories } = useRetailQuery(
    () => listCategories(true),
    []
  );
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [nombre, setNombre] = useState(initial?.nombre ?? "");
  const [categoria, setCategoria] = useState<ProductCategory>(
    initial?.categoria ?? "otros"
  );
  const [newCat, setNewCat] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);
  const suggestedCategory =
    initial?.categoriaNombre?.trim() || "";
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
    if (!categories?.length) return;
    setCategoria((current) => {
      if (categories.some((c) => c.codigo === current)) return current;
      const byName = categories.find(
        (c) =>
          c.nombre.toLowerCase() === suggestedCategory.toLowerCase() ||
          c.nombre.toLowerCase() === current.toLowerCase()
      );
      if (byName) return byName.codigo;
      if (initial?.categoria === current) {
        return current;
      }
      return categories[0]?.codigo ?? current;
    });
    const known = categories.some(
      (c) =>
        c.codigo === (initial?.categoria || "") ||
        (suggestedCategory &&
          c.nombre.toLowerCase() === suggestedCategory.toLowerCase())
    );
    if (!known && suggestedCategory) {
      setNewCat((current) => current || suggestedCategory);
    }
  }, [categories, initial, suggestedCategory]);
  const [costo, setCosto] = useState(String(initial?.costo ?? 0));
  const [stock, setStock] = useState(String(initial?.stock ?? 0));
  const [descripcion, setDescripcion] = useState(
    initial?.descripcion ?? ""
  );
  const [activo, setActivo] = useState(initial?.activo ?? true);
  const [pendingImages, setPendingImages] = useState<PendingFile[]>(
    []
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function addCategory(nameOverride?: string) {
    const name = (nameOverride ?? newCat).trim();
    if (!name) return;
    setCreatingCat(true);
    setError(null);
    try {
      const created = await createCategory({ nombre: name });
      setCategoria(created.codigo);
      setNewCat("");
      reloadCategories();
      onCategoryCreated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la categoría.");
    } finally {
      setCreatingCat(false);
    }
  }

  async function save() {
    setError(null);
    if (
      categories &&
      !categories.some((c) => c.codigo === categoria)
    ) {
      setError("Esa categoría no existe. Creala antes de guardar el producto.");
      return;
    }
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
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
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
            onChange={(e) => setCategoria(e.target.value)}
          >
            {categoryOptions(
              categories ?? [],
              categoria,
              initial,
              suggestedCategory
            ).map((c) => (
              <option key={c.codigo} value={c.codigo}>
                {c.nombre}
              </option>
            ))}
          </select>
          {categories && !categories.some((c) => c.codigo === categoria) ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              «{suggestedCategory || categoryLabel(categoria)}» no está en las
              categorías. Creala para usarla en este producto.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Si no está en la lista, creala acá.
            </p>
          )}
          <div className="flex gap-2">
            <Input
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              placeholder="Nueva categoría"
              aria-label="Nueva categoría"
            />
            <Button
              type="button"
              variant="outline"
              disabled={creatingCat || !newCat.trim()}
              onClick={() => void addCategory()}
            >
              {creatingCat ? "…" : "Crear"}
            </Button>
          </div>
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

      </div>
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}
      {loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={loading || saving}>
          {saving ? "Guardando…" : "Guardar"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saving}
          onClick={onCancel}
        >
          Cancelar
        </Button>
      </div>
    </form>

    </>
  );
}
