"use client";
import { useRef, useState } from "react";
import { ImagePlus, Pause, Pencil, Play } from "lucide-react";
import { api } from "@/lib/api-client";
import { useCatalogQuery } from "@/lib/use-catalog-query";
import { useAccountSession } from "@/lib/account-session";
import { useComercio } from "@/lib/comercio-context";
import type { CollectionMeta } from "@/lib/collections";
import { Button } from "@/components/ui/button";
import { CollectionArtwork } from "@/components/catalog/collection-artwork";
import { CollectionEditor } from "@/components/catalog/collection-editor";
export function CollectionsManager() {
  const { session, loading: accountLoading } = useAccountSession();
  const { comercioId } = useComercio();
  const allowed = ["superadmin", "administrador"].includes(
    session?.user.role ?? "",
  );
  const canEdit = allowed && !session?.actor;
  const collections = useCatalogQuery(
    ["store-collections"],
    (signal) => api.listStoreCollections(signal),
    0,
    allowed,
  );
  const [editor, setEditor] = useState<{ id?: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const lock = useRef(false);
  async function changeStatus(collection: CollectionMeta) {
    if (lock.current) return;
    lock.current = true;
    setBusy(collection.id);
    setError("");
    setMessage("");
    try {
      if (collection.active)
        await api.pauseStoreCollection(collection.id, collection.revision);
      else await api.publishStoreCollection(collection.id, collection.revision);
      collections.reload();
      setMessage(
        collection.active
          ? "La colección se pausó y dejó de mostrarse en el inicio."
          : "La colección se activó en la tienda.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No pudimos cambiar la publicación.",
      );
    } finally {
      lock.current = false;
      setBusy(null);
    }
  }
  if (accountLoading)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Cargando configuración de inicio…
      </p>
    );
  if (!allowed)
    return (
      <p className="text-sm text-muted-foreground">
        El diseño del inicio está disponible para administradores.
      </p>
    );
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">
            Inicio de la tienda
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Armá colecciones visuales con tus fotos y productos. Son
            independientes de las categorías de stock y solo se muestran cuando
            las activás.
          </p>
        </div>
        <Button
          disabled={
            !canEdit || Boolean(busy) || (collections.data?.length ?? 0) >= 50
          }
          onClick={() => {
            setEditor({});
            setMessage("");
            setError("");
          }}
        >
          <ImagePlus className="size-4" />
          Nueva colección
        </Button>
      </header>
      <p className="rounded-xl bg-teal/5 p-4 text-sm leading-6 text-muted-foreground">
        Podés guardar un borrador sin modificar lo publicado. Antes de activar
        vas a ver el encuadre en celular y escritorio. Los productos sin stock o
        precio público se ocultan de la tienda.
      </p>
      {message ? (
        <p role="status" className="text-sm text-teal">
          {message}
        </p>
      ) : null}
      {error || collections.error ? (
        <p role="alert" className="catalog-error">
          {error || collections.error}
          <button
            type="button"
            className="ml-2 underline"
            onClick={collections.reload}
          >
            Actualizar
          </button>
        </p>
      ) : null}
      {collections.loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Cargando colecciones…
        </p>
      ) : null}
      {!collections.loading &&
      !collections.error &&
      !collections.data?.length ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <ImagePlus className="mx-auto size-8 text-muted-foreground" />
          <h3 className="mt-4 font-medium">
            Tu inicio empieza con una colección
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            Subí una imagen, elegí un título y seleccioná productos. Hasta que
            actives una colección, la tienda seguirá mostrando todos los
            productos.
          </p>
        </div>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {collections.data?.map((collection) => (
          <article
            key={collection.id}
            className="overflow-hidden rounded-xl bg-card ring-1 ring-border"
          >
            <CollectionArtwork
              title={collection.title}
              imageUrl={collection.imageUrl}
              focalX={collection.focalX}
              focalY={collection.focalY}
              ratio="desktop"
            />
            <div className="space-y-3 p-4">
              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${collection.active ? "bg-teal/10 text-teal" : "bg-secondary text-muted-foreground"}`}
                >
                  {collection.active
                    ? "Activada"
                    : collection.publishedRevision
                      ? "Pausada"
                      : "Borrador"}
                </span>
                {collection.hasUnpublishedChanges && collection.active ? (
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] text-amber-800">
                    Cambios sin publicar
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Orden {collection.position} · {collection.productCount}{" "}
                productos seleccionados
              </p>
              {collection.hasUnpublishedChanges && collection.active ? (
                <p className="text-xs leading-5 text-muted-foreground">
                  La portada y el título de esta tarjeta son el borrador. La
                  tienda conserva la versión anterior hasta activar los cambios.
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={!canEdit || Boolean(busy)}
                  onClick={() => {
                    setEditor({ id: collection.id });
                    setError("");
                    setMessage("");
                  }}
                >
                  <Pencil className="size-4" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  disabled={!canEdit || Boolean(busy)}
                  onClick={() => void changeStatus(collection)}
                >
                  {collection.active ? (
                    <Pause className="size-4" />
                  ) : (
                    <Play className="size-4" />
                  )}
                  {busy === collection.id
                    ? "Guardando…"
                    : collection.active
                      ? "Pausar"
                      : "Activar"}
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {editor && canEdit ? (
        <CollectionEditor
          key={`${comercioId}:${editor.id ?? "new"}`}
          id={editor.id}
          initialPosition={Math.min(
            1000,
            Math.max(
              0,
              ...(collections.data ?? []).map((row) => row.position),
            ) + 1,
          )}
          onClose={() => setEditor(null)}
          onSaved={(active) => {
            setEditor(null);
            collections.reload();
            setMessage(
              active
                ? "Colección activada. Ya está disponible en el inicio si tiene productos disponibles."
                : "Borrador guardado. La tienda publicada no cambió.",
            );
          }}
        />
      ) : null}
    </div>
  );
}
