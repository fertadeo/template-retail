"use client";
import { useRef, useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { useCatalogQuery } from "@/lib/use-catalog-query";
import {
  prepareCollectionImage,
  type CollectionDetail,
} from "@/lib/collections";
import { Input } from "@/components/ui/input";
import { CatalogDialog } from "@/components/catalog/catalog-dialog";
import { CatalogImage } from "@/components/catalog/catalog-image";
import { CollectionArtwork } from "@/components/catalog/collection-artwork";
import { ProductPagination } from "@/components/product-pagination";

export function CollectionEditor({
  id,
  initialPosition,
  onClose,
  onSaved,
}: {
  id?: string;
  initialPosition: number;
  onClose: () => void;
  onSaved: (active: boolean) => void;
}) {
  const detail = useCatalogQuery(
    ["collection-editor", id],
    (signal) => api.getStoreCollection(id!, signal),
    0,
    Boolean(id),
  );
  if (id && !detail.data)
    return (
      <CatalogDialog title="Editar colección" onClose={onClose}>
        <p role={detail.error ? "alert" : "status"} className="text-sm">
          {detail.error || "Cargando borrador…"}
        </p>
        {detail.error ? (
          <button className="catalog-secondary mt-4" onClick={detail.reload}>
            Reintentar
          </button>
        ) : null}
      </CatalogDialog>
    );
  return (
    <EditorForm
      key={id ?? "new"}
      initial={detail.data}
      initialPosition={initialPosition}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
function EditorForm({
  initial,
  initialPosition,
  onClose,
  onSaved,
}: {
  initial?: CollectionDetail;
  initialPosition: number;
  onClose: () => void;
  onSaved: (active: boolean) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [position, setPosition] = useState(
    String(initial?.position ?? initialPosition),
  );
  const [focalX, setFocalX] = useState(initial?.focalX ?? 50);
  const [focalY, setFocalY] = useState(initial?.focalY ?? 50);
  const [imageData, setImageData] = useState<string | null | undefined>();
  const [selected, setSelected] = useState<string[]>(initial?.productIds ?? []);
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<"all" | "selected">("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [discard, setDiscard] = useState(false);
  const [notice, setNotice] = useState("");
  const [clearSelection, setClearSelection] = useState(false);
  const lock = useRef(false);
  const filterKey = JSON.stringify([q.trim(), mode]);
  const [cursor, setCursor] = useState({ key: filterKey, page: 1 });
  if (cursor.key !== filterKey) setCursor({ key: filterKey, page: 1 });
  const page =
    mode === "selected"
      ? Math.min(cursor.page, Math.max(1, Math.ceil(selected.length / 24)))
      : cursor.page;
  const pageIds =
    mode === "selected"
      ? selected.slice((page - 1) * 24, page * 24)
      : undefined;
  const products = useCatalogQuery(
    [
      "collection-picker",
      q.trim(),
      mode,
      page,
      pageIds?.slice().sort().join(","),
    ],
    (signal) =>
      api.collectionProducts(
        { page, q: mode === "all" ? q.trim() : "", ids: pageIds },
        signal,
      ),
    mode === "all" && q.trim() ? 250 : 0,
    mode === "all" || Boolean(pageIds?.length),
  );
  const rows =
    mode === "selected"
      ? products.data
        ? (pageIds ?? []).map(
            (id) =>
              products.data!.items.find((row) => row.id === id) ?? {
                id,
                name: "Producto eliminado: quitá esta selección",
                sku: "",
                unitPrice: 0,
                stock: 0,
                available: false,
                imageUrl: null,
              },
          )
        : []
      : (products.data?.items ?? []);
  const imageUrl =
    imageData === undefined ? (initial?.imageUrl ?? null) : imageData;
  const dirty =
    title !== (initial?.title ?? "") ||
    position !== String(initial?.position ?? initialPosition) ||
    focalX !== (initial?.focalX ?? 50) ||
    focalY !== (initial?.focalY ?? 50) ||
    imageData !== undefined ||
    JSON.stringify(selected) !== JSON.stringify(initial?.productIds ?? []);
  function close() {
    if (lock.current) return;
    if (dirty) setDiscard(true);
    else onClose();
  }
  function toggle(id: string) {
    setSelected((old) =>
      old.includes(id)
        ? old.filter((value) => value !== id)
        : old.length < 2000
          ? [...old, id]
          : old,
    );
  }
  function move(id: string, delta: number) {
    setSelected((old) => {
      const result = [...old];
      const index = result.indexOf(id);
      const target = index + delta;
      if (target >= 0 && target < result.length)
        [result[index], result[target]] = [result[target], result[index]];
      return result;
    });
  }
  async function photo(file?: File) {
    if (!file || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      setImageData(await prepareCollectionImage(file));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No pudimos preparar la imagen.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function allResults() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api.collectionProductIds(q.trim());
      const ids = [...new Set([...selected, ...result.ids])];
      if (ids.length > 2000)
        throw new Error(
          "Podés seleccionar hasta 2000 productos. Quitá algunos antes de continuar.",
        );
      setSelected(ids);
      setNotice(`Selección actualizada: ${ids.length} productos.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No pudimos seleccionar los resultados.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    const action =
      (event.nativeEvent as SubmitEvent).submitter?.getAttribute(
        "data-action",
      ) === "publish"
        ? "publish"
        : "draft";
    const order = Number(position);
    if (!Number.isInteger(order) || order < 1 || order > 1000) {
      setError("El orden debe ser un número entero entre 1 y 1000.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await api.saveStoreCollection(initial?.id, {
        title: title.trim(),
        position: order,
        focalX,
        focalY,
        productIds: selected,
        imageDataUrl: imageData,
        baseRevision: initial?.revision ?? 0,
        action,
      });
      onSaved(action === "publish");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No pudimos guardar la colección.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <CatalogDialog
      title={
        discard
          ? "¿Descartar el borrador?"
          : initial
            ? "Editar colección"
            : "Nueva colección"
      }
      subtitle={
        discard
          ? undefined
          : "Los cambios se muestran en la tienda solo al activar."
      }
      onClose={close}
      busy={busy}
      wide
      footer={
        discard ? (
          <div className="flex flex-wrap justify-end gap-2">
            <button
              className="catalog-secondary"
              onClick={() => setDiscard(false)}
            >
              Seguir editando
            </button>
            <button className="catalog-primary" onClick={onClose}>
              Descartar y cerrar
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap justify-between gap-2">
            <button
              className="catalog-secondary"
              onClick={close}
              disabled={busy}
            >
              Cancelar
            </button>
            <div className="flex flex-wrap gap-2">
              <button
                className="catalog-secondary"
                type="submit"
                form="collection-editor"
                data-action="draft"
                disabled={busy || (Boolean(initial) && !dirty)}
              >
                Guardar borrador
              </button>
              <button
                className="catalog-primary"
                type="submit"
                form="collection-editor"
                data-action="publish"
                disabled={
                  busy || !title.trim() || !imageUrl || !selected.length
                }
              >
                {busy
                  ? "Procesando…"
                  : initial?.active
                    ? "Activar cambios"
                    : "Activar"}
              </button>
            </div>
          </div>
        )
      }
    >
      {discard ? (
        <p className="text-sm">
          Tus cambios no se guardaron. La versión publicada se conserva.
        </p>
      ) : (
        <form
          id="collection-editor"
          onSubmit={(event) => void save(event)}
          className="space-y-7"
        >
          {error ? (
            <p role="alert" className="catalog-error">
              {error}
            </p>
          ) : null}
          <section className="grid gap-4 sm:grid-cols-[1fr_8rem]">
            <label className="catalog-field">
              Título
              <Input
                maxLength={80}
                value={title}
                disabled={busy}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Nombre de la colección"
              />
            </label>
            <label className="catalog-field">
              Orden en el inicio
              <Input
                type="number"
                min={1}
                max={1000}
                step={1}
                required
                value={position}
                disabled={busy}
                onChange={(event) => setPosition(event.target.value)}
              />
            </label>
          </section>
          <section className="space-y-4">
            <h3 className="font-semibold">Portada</h3>
            <div className="flex flex-wrap items-center gap-3">
              <label
                className={`catalog-secondary cursor-pointer focus-within:ring-2 focus-within:ring-teal ${busy ? "pointer-events-none opacity-50" : ""}`}
              >
                <ImagePlus className="size-4" />
                Subir imagen
                <input
                  type="file"
                  className="sr-only"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy}
                  onChange={(event) => {
                    void photo(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
              {imageUrl ? (
                <button
                  className="text-sm text-muted-foreground"
                  type="button"
                  disabled={busy}
                  onClick={() => setImageData(null)}
                >
                  <Trash2 className="mr-1 inline size-4" />
                  Quitar imagen
                </button>
              ) : null}
              <span className="text-xs text-muted-foreground">
                JPG, PNG o WebP · Hasta 8 MB
              </span>
            </div>
            <div className="grid items-start gap-5 sm:grid-cols-[1fr_0.6fr]">
              <div>
                <p className="mb-2 text-xs text-muted-foreground">Escritorio</p>
                <CollectionArtwork
                  title={title}
                  imageUrl={imageUrl}
                  focalX={focalX}
                  focalY={focalY}
                  ratio="desktop"
                />
              </div>
              <div className="max-w-48">
                <p className="mb-2 text-xs text-muted-foreground">Celular</p>
                <CollectionArtwork
                  title={title}
                  imageUrl={imageUrl}
                  focalX={focalX}
                  focalY={focalY}
                  ratio="mobile"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="catalog-field">
                Encuadre horizontal ({focalX}%)
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={focalX}
                  disabled={busy}
                  onChange={(event) => setFocalX(Number(event.target.value))}
                  className="w-full accent-[#31563d]"
                />
              </label>
              <label className="catalog-field">
                Encuadre vertical ({focalY}%)
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={focalY}
                  disabled={busy}
                  onChange={(event) => setFocalY(Number(event.target.value))}
                  className="w-full accent-[#31563d]"
                />
              </label>
            </div>
          </section>
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold">
                Productos{" "}
                <span
                  aria-live="polite"
                  className="text-sm font-normal text-muted-foreground"
                >
                  ({selected.length} seleccionados)
                </span>
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-pressed={mode === "all"}
                  className="catalog-secondary"
                  disabled={busy}
                  onClick={() => setMode("all")}
                >
                  Buscar
                </button>
                <button
                  type="button"
                  aria-pressed={mode === "selected"}
                  className="catalog-secondary"
                  disabled={busy}
                  onClick={() => setMode("selected")}
                >
                  Ver seleccionados
                </button>
              </div>
            </div>
            {mode === "all" ? (
              <>
                <label className="catalog-field">
                  Buscar por nombre o código
                  <Input
                    value={q}
                    maxLength={100}
                    disabled={busy}
                    onChange={(event) => setQ(event.target.value)}
                    placeholder="Buscar productos"
                  />
                </label>
                <button
                  className="min-h-10 text-sm font-medium text-teal underline"
                  type="button"
                  disabled={busy}
                  onClick={() => void allResults()}
                >
                  Seleccionar todos los resultados
                  {q.trim() ? " de esta búsqueda" : " del comercio"}
                </button>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Usá las flechas para ordenar tu selección. Los productos con
                foto se muestran primero en la tienda.
              </p>
            )}
            {selected.length ? (
              <div className="text-sm">
                {clearSelection ? (
                  <div className="flex flex-wrap items-center gap-3 rounded-xl bg-amber-50 p-3 text-amber-900">
                    <span>
                      ¿Quitar los {selected.length} productos de este borrador?
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      className="min-h-10 font-semibold underline"
                      onClick={() => {
                        setSelected([]);
                        setClearSelection(false);
                        setNotice("");
                      }}
                    >
                      Quitar todos
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className="min-h-10 underline"
                      onClick={() => setClearSelection(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    className="min-h-10 text-muted-foreground underline"
                    onClick={() => setClearSelection(true)}
                  >
                    Quitar selección
                  </button>
                )}
              </div>
            ) : null}
            {notice ? (
              <p role="status" className="text-sm text-teal">
                {notice}
              </p>
            ) : null}
            {products.error && (mode === "all" || selected.length) ? (
              <p role="alert" className="catalog-error">
                {products.error}
                <button
                  type="button"
                  className="ml-2 underline"
                  onClick={products.reload}
                >
                  Reintentar
                </button>
              </p>
            ) : null}
            {products.loading && (mode === "all" || selected.length) ? (
              <p role="status" className="text-sm text-muted-foreground">
                Cargando productos…
              </p>
            ) : null}
            {(!products.loading && !rows.length) ||
            (mode === "selected" && !selected.length) ? (
              <p className="text-sm text-muted-foreground">
                {mode === "selected"
                  ? "Todavía no seleccionaste productos."
                  : "No encontramos productos con esa búsqueda."}
              </p>
            ) : null}
            <ul className="divide-y divide-[#e1e6d9]">
              {rows.map((product) => (
                <li key={product.id} className="flex items-center gap-2 py-2">
                  <label className="flex min-h-16 min-w-0 flex-1 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(product.id)}
                      disabled={
                        busy ||
                        (!selected.includes(product.id) &&
                          selected.length >= 2000)
                      }
                      onChange={() => toggle(product.id)}
                      className="size-4 shrink-0 accent-[#31563d]"
                    />
                    <span className="size-12 shrink-0 overflow-hidden rounded bg-white">
                      <CatalogImage
                        src={product.imageUrl}
                        alt={product.name}
                        contain
                      />
                    </span>
                    <span className="min-w-0">
                      <strong className="line-clamp-2 text-sm font-medium">
                        {product.name}
                      </strong>
                      <span className="block text-xs text-muted-foreground">
                        {product.sku || "Sin código"}
                        {!product.available
                          ? " · Sin disponibilidad pública"
                          : ` · Stock ${product.stock}`}
                      </span>
                    </span>
                  </label>
                  {mode === "selected" ? (
                    <div className="flex shrink-0">
                      <button
                        type="button"
                        className="catalog-step"
                        aria-label={`Subir ${product.name}`}
                        disabled={busy || selected.indexOf(product.id) === 0}
                        onClick={() => move(product.id, -1)}
                      >
                        <ArrowUp className="size-4" />
                      </button>
                      <button
                        type="button"
                        className="catalog-step"
                        aria-label={`Bajar ${product.name}`}
                        disabled={
                          busy ||
                          selected.indexOf(product.id) === selected.length - 1
                        }
                        onClick={() => move(product.id, 1)}
                      >
                        <ArrowDown className="size-4" />
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
            <ProductPagination
              page={page}
              hasMore={
                mode === "selected"
                  ? page * 24 < selected.length
                  : (products.data?.hasMore ?? false)
              }
              loading={
                busy ||
                (products.loading &&
                  (mode === "all" || Boolean(selected.length)))
              }
              onPage={(next) => setCursor({ key: filterKey, page: next })}
              label="Páginas de selección de productos"
            />
            <p className="rounded-xl bg-[#eef1e7] p-3 text-xs leading-5 text-[#65765e]">
              En la tienda solo se muestran productos activos, con stock y
              precio público. Una colección sin productos disponibles se oculta
              automáticamente. Para activar necesitás título, portada y al menos
              un producto disponible.
            </p>
          </section>
        </form>
      )}
    </CatalogDialog>
  );
}
