"use client";

import { useEffect, useRef, useState } from "react";
import { Package, X } from "lucide-react";
import { ModalPortal } from "@/components/modal-portal";
import {
  ProductImagesEditor,
  type PendingFile,
} from "@/components/product-images-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api-client";
import { prepareProductImage } from "@/lib/product-image-upload";
import {
  createCategory,
  deleteProductImage,
  listCategories,
  listPriceLists,
  setProductImagePrimary,
  uploadProductImage,
  upsertProduct,
} from "@/lib/store";
import { useRetailQuery } from "@/lib/use-retail-query";
import { productImageSrc, type Product } from "@/lib/types";
export type ProductEditorPrefill = {
  nombre: string;
  sku: string;
  descripcion: string;
  categoria: Product["categoria"];
  categoriaNombre?: string;
  precio: number;
  pendingImages: PendingFile[];
};

type Props = {
  initial?: Product;
  prefill?: ProductEditorPrefill;
  onCancel: () => void;
  onSaved: () => void;
  onCategoryCreated?: () => void;
};

export function ProductEditor(props: Props) {
  return (
    <ModalPortal>
      <ProductEditorDialog {...props} />
    </ModalPortal>
  );
}

function ProductEditorDialog({
  initial,
  prefill,
  onCancel,
  onSaved,
  onCategoryCreated,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const {
    data,
    loading,
    error: loadError,
    reload,
  } = useRetailQuery(
    () => Promise.all([listPriceLists(true), listCategories(true)]),
    [],
  );
  const lists = data?.[0] ?? [];
  const categories = data?.[1] ?? [];
  const [sku, setSku] = useState(initial?.sku ?? prefill?.sku ?? "");
  const [nombre, setNombre] = useState(
    initial?.nombre ?? prefill?.nombre ?? "",
  );
  const [categoria, setCategoria] = useState(
    initial?.categoria ?? prefill?.categoria ?? "",
  );
  const [newCategory, setNewCategory] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [costo, setCosto] = useState(String(initial?.costo ?? 0));
  const [stock, setStock] = useState(String(initial?.stock ?? 0));
  const [descripcion, setDescripcion] = useState(
    initial?.descripcion ?? prefill?.descripcion ?? "",
  );
  const [activo, setActivo] = useState(initial?.activo ?? true);
  const [precios, setPrecios] = useState<Record<string, string>>({});
  const [images, setImages] = useState<PendingFile[]>(() =>
    [
      ...(initial?.imagenPrincipal ? [initial.imagenPrincipal] : []),
      ...(initial?.imagenesSecundarias ?? []),
    ]
      .map<PendingFile>((image) => ({
        key: image.id,
        id: image.id,
        filename: image.filename,
        mime: image.mime,
        sizeBytes: 0,
        dataUrl: productImageSrc(image) ?? "",
        asPrimary: image.id === initial?.imagenPrincipal?.id,
      }))
      .concat(prefill?.pendingImages ?? []),
  );
  const removed = useRef(new Set<string>());
  const productId = useRef(initial?.id);
  const [dirty, setDirty] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [readingImages, setReadingImages] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const busy = saving || readingImages || addingCategory;

  useEffect(() => {
    const element = dialog.current;
    const focused = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element?.showModal();
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      focused?.focus();
    };
  }, []);

  function close() {
    if (busy) return;
    if (confirmClose) {
      setConfirmClose(false);
      return;
    }
    setConfirmClose(true);
  }

  function changeImages(next: PendingFile[]) {
    for (const image of images)
      if (image.id && !next.some((item) => item.id === image.id))
        removed.current.add(image.id);
    setImages(next);
    setDirty(true);
  }

  function price(id: string, isDefault: boolean) {
    return (
      precios[id] ??
      String(
        initial?.precios[id] ??
          (isDefault ? prefill?.precio : undefined) ??
          initial?.precio ??
          0,
      )
    );
  }

  async function addCategory() {
    if (!newCategory.trim() || busy) return;
    setAddingCategory(true);
    setError(null);
    try {
      const category = await createCategory({ nombre: newCategory.trim() });
      setCategoria(category.codigo);
      setNewCategory("");
      setDirty(true);
      reload();
      onCategoryCreated?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo crear la categoría.",
      );
    } finally {
      setAddingCategory(false);
    }
  }

  async function save() {
    if (busy) return;
    setError(null);
    if (!lists.length) {
      setError("Creá al menos una lista de precios activa en Configuración.");
      return;
    }
    if (!sku.trim() || !nombre.trim()) {
      setError("Completá el nombre y el SKU.");
      return;
    }
    if (!categories.some((item) => item.codigo === categoria)) {
      setError("Elegí una categoría existente o creá una nueva.");
      return;
    }
    const defaultList = lists.find((list) => list.esDefault) ?? lists[0];
    const prices = Object.fromEntries(
      lists.map((list) => [
        list.id,
        Number(price(list.id, list.id === defaultList.id)),
      ]),
    );
    const amounts = [Number(costo), Number(stock), ...Object.values(prices)];
    if (
      amounts.some((value) => !Number.isFinite(value) || value < 0) ||
      !Number.isInteger(Number(stock))
    ) {
      setError(
        "Ingresá importes válidos y un stock entero, iguales o mayores a cero.",
      );
      return;
    }
    setSaving(true);
    setProgress("Guardando producto…");
    const currentImages = images.map((image) => ({ ...image }));
    try {
      const saved = await upsertProduct({
        id: productId.current,
        sku: sku.trim(),
        nombre: nombre.trim(),
        categoria,
        costo: Number(costo),
        stock: Number(stock),
        precios: prices,
        precio: prices[defaultList.id],
        descripcion: descripcion.trim(),
        activo,
      });
      // Retain the ID on partial media failure so retry updates instead of duplicating.
      productId.current = saved.id;
      for (const id of Array.from(removed.current)) {
        setProgress("Quitando imágenes…");
        try {
          await deleteProductImage(saved.id, id);
        } catch (err) {
          if (!(err instanceof ApiError && err.status === 404)) throw err;
        }
        removed.current.delete(id);
      }
      for (let index = 0; index < currentImages.length; index++) {
        let image = currentImages[index];
        if (image.id) continue;
        setProgress(`Subiendo imagen ${index + 1} de ${currentImages.length}…`);
        if (image.mime !== "image/webp" || image.sizeBytes > 650 * 1024) {
          const blob = await (await fetch(image.dataUrl)).blob();
          const prepared = await prepareProductImage(
            new File([blob], image.filename, { type: image.mime }),
          );
          image = { ...image, ...prepared };
        }
        const uploaded = await uploadProductImage(saved.id, {
          filename: image.filename,
          mime: image.mime,
          sizeBytes: image.sizeBytes,
          dataUrl: image.dataUrl,
          isPrimary: image.asPrimary,
          title: image.filename,
        });
        currentImages[index] = { ...image, id: uploaded.id };
        setImages([...currentImages]);
      }
      const cover =
        currentImages.find((image) => image.asPrimary) ?? currentImages[0];
      if (cover?.id) {
        setProgress("Guardando portada…");
        await setProductImagePrimary(saved.id, cover.id);
      }
      onSaved();
    } catch (err) {
      setError(
        `${err instanceof Error ? err.message : "No se pudo guardar."}${productId.current ? " El producto ya existe; podés reintentar para completar los cambios pendientes." : ""}`,
      );
    } finally {
      setSaving(false);
      setProgress("");
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="product-editor-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className="m-auto max-h-[94dvh] w-[calc(100%-1rem)] max-w-5xl overflow-hidden rounded-2xl bg-card p-0 text-foreground shadow-2xl backdrop:bg-charcoal/60 backdrop:backdrop-blur-sm"
    >
      <form
        onChange={() => setDirty(true)}
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        className="relative flex max-h-[94dvh] flex-col"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="hidden rounded-xl bg-teal/10 p-3 text-teal sm:block">
              <Package className="size-5" />
            </span>
            <div>
              <h2
                id="product-editor-title"
                className="font-display text-xl font-semibold"
              >
                {initial ? "Editar producto" : "Nuevo producto"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Completá la información y elegí su imagen de portada.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Cerrar editor de producto"
            disabled={busy || confirmClose}
            onClick={close}
            className="rounded-lg p-2 hover:bg-muted disabled:opacity-50"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
          {loading ? (
            <p role="status" className="mb-4 text-sm text-muted-foreground">
              Cargando categorías y listas de precios…
            </p>
          ) : null}
          {loadError ? (
            <p role="alert" className="mb-4 text-sm text-destructive">
              {loadError}
            </p>
          ) : null}
          <fieldset
            disabled={busy || confirmClose || loading || Boolean(loadError)}
            className="grid min-w-0 gap-7 lg:grid-cols-[1.25fr_1fr]"
          >
            <div className="min-w-0 space-y-6">
              <section
                className="space-y-4"
                aria-labelledby="product-basic-title"
              >
                <h3 id="product-basic-title" className="font-semibold">
                  Datos del producto
                </h3>
                <div className="space-y-1.5">
                  <Label htmlFor="product-name">Nombre *</Label>
                  <Input
                    id="product-name"
                    required
                    maxLength={240}
                    autoFocus
                    value={nombre}
                    placeholder="Nombre del producto"
                    onChange={(event) => setNombre(event.target.value)}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="product-sku">SKU / código *</Label>
                    <Input
                      id="product-sku"
                      required
                      maxLength={80}
                      value={sku}
                      onChange={(event) => setSku(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="product-category">Categoría *</Label>
                    <select
                      id="product-category"
                      required
                      value={categoria}
                      onChange={(event) => setCategoria(event.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                    >
                      <option value="">Elegir categoría</option>
                      {categoria &&
                      !categories.some((item) => item.codigo === categoria) ? (
                        <option value={categoria}>
                          {initial?.categoriaNombre ??
                            prefill?.categoriaNombre ??
                            categoria}
                        </option>
                      ) : null}
                      {categories.map((item) => (
                        <option key={item.id} value={item.codigo}>
                          {item.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <details className="rounded-lg border border-border px-3 py-2 text-sm">
                  <summary className="cursor-pointer text-muted-foreground">
                    Crear una categoría
                  </summary>
                  <div className="mt-3 flex gap-2">
                    <Input
                      aria-label="Nombre de la nueva categoría"
                      value={newCategory}
                      onChange={(event) => setNewCategory(event.target.value)}
                      placeholder="Nueva categoría"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy || !newCategory.trim()}
                      onClick={() => void addCategory()}
                    >
                      Crear
                    </Button>
                  </div>
                </details>
                <div className="space-y-1.5">
                  <Label htmlFor="product-description">Descripción</Label>
                  <textarea
                    id="product-description"
                    rows={3}
                    value={descripcion}
                    onChange={(event) => setDescripcion(event.target.value)}
                    placeholder="Características, presentación y otros detalles"
                    className="w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  />
                </div>
              </section>
              <section
                className="space-y-4 border-t border-border pt-5"
                aria-labelledby="product-prices-title"
              >
                <h3 id="product-prices-title" className="font-semibold">
                  Precios y stock
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {lists.map((list) => (
                    <div key={list.id} className="space-y-1.5">
                      <Label htmlFor={`product-price-${list.id}`}>
                        {list.nombre}
                        {list.esDefault ? " · principal" : ""}
                      </Label>
                      <Input
                        id={`product-price-${list.id}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={price(
                          list.id,
                          list.id ===
                            (lists.find((item) => item.esDefault) ?? lists[0])
                              ?.id,
                        )}
                        onChange={(event) =>
                          setPrecios((current) => ({
                            ...current,
                            [list.id]: event.target.value,
                          }))
                        }
                      />
                    </div>
                  ))}
                  <div className="space-y-1.5">
                    <Label htmlFor="product-cost">Costo</Label>
                    <Input
                      id="product-cost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={costo}
                      onChange={(event) => setCosto(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="product-stock">Stock disponible</Label>
                    <Input
                      id="product-stock"
                      type="number"
                      min="0"
                      step="1"
                      value={stock}
                      onChange={(event) => setStock(event.target.value)}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={activo}
                    onChange={(event) => setActivo(event.target.checked)}
                    className="size-4 accent-teal"
                  />
                  Producto activo en el catálogo
                </label>
              </section>
            </div>
            <div className="min-w-0 rounded-xl bg-muted/20 p-4 ring-1 ring-border/70 lg:self-start">
              <ProductImagesEditor
                images={images}
                onChange={changeImages}
                disabled={busy}
                onBusyChange={setReadingImages}
              />
            </div>
          </fieldset>
        </div>
        <footer className="shrink-0 border-t border-border bg-card px-5 py-4 sm:px-7">
          {error ? (
            <p role="alert" className="mb-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p
              role="status"
              aria-live="polite"
              className="text-xs text-muted-foreground"
            >
              {progress ||
                (readingImages
                  ? "Preparando imágenes…"
                  : "* Campos obligatorios")}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy || confirmClose}
                onClick={close}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  busy ||
                  confirmClose ||
                  loading ||
                  Boolean(loadError) ||
                  !lists.length
                }
              >
                {saving ? "Guardando…" : "Guardar producto"}
              </Button>
            </div>
          </div>
        </footer>
        {confirmClose ? (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="discard-product-title"
            className="absolute inset-0 flex items-center justify-center bg-charcoal/50 p-5"
          >
            <div className="max-w-sm space-y-4 rounded-xl bg-card p-5 shadow-xl">
              <h3 id="discard-product-title" className="font-semibold">
                ¿Salir del modal?
              </h3>
              <p className="text-sm text-muted-foreground">
                {dirty
                  ? "Los cambios sin guardar se perderán. ¿Querés salir del modal?"
                  : "¿Querés salir del modal de producto?"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  autoFocus
                  variant="outline"
                  onClick={() => setConfirmClose(false)}
                >
                  Seguir editando
                </Button>
                <Button type="button" variant="destructive" onClick={onCancel}>
                  Salir del modal
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </form>
    </dialog>
  );
}
