"use client";

import { ProductEditor } from "@/components/product-editor";
import { useState } from "react";
import { useProductPage } from "@/lib/use-product-page";
import { ProductPagination } from "@/components/product-pagination";
import { productHealthCounts } from "@/lib/catalog-data";
import { useCatalogQuery } from "@/lib/use-catalog-query";
import { Pencil } from "lucide-react";
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
  getProduct,
  listCategories,
} from "@/lib/store";
import { useRetailQuery } from "@/lib/use-retail-query";
import {
  categoryLabel,
  productImageSrc,
  type Product,
  type ProductCategory,
} from "@/lib/types";
import { cn, formatMxn } from "@/lib/utils";

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
    try {
      const full = await getProduct(p.id);
      if (!full) throw new Error("Producto no encontrado.");
      setDetail(full);
    } catch (err) { setActionError(err instanceof Error ? err.message : "No se pudo cargar el producto."); }
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
          key={editing?.id ?? "new"}
          initial={editing ?? undefined}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
            reload();
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
