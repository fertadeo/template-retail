"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { fileToMediaPayload } from "@/lib/media-library";
import {
  deleteProductImage,
  listProductImages,
  setProductImagePrimary,
  uploadProductImage,
} from "@/lib/store";
import { productImageSrc, type ProductImage } from "@/lib/types";

type PendingFile = {
  key: string;
  filename: string;
  mime: string;
  sizeBytes: number;
  dataUrl: string;
  asPrimary: boolean;
};

export function ProductImagesEditor({
  productId,
  initialPrimary,
  initialSecondaries,
  pending,
  onPendingChange,
}: {
  productId?: string;
  initialPrimary?: ProductImage | null;
  initialSecondaries?: ProductImage[];
  /** Archivos locales pendientes (producto aún no guardado). */
  pending: PendingFile[];
  onPendingChange: (next: PendingFile[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<ProductImage[]>(() => [
    ...(initialPrimary ? [initialPrimary] : []),
    ...(initialSecondaries ?? []),
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) {
      setImages([]);
      return;
    }
    let cancelled = false;
    void listProductImages(productId)
      .then((items) => {
        if (!cancelled) setImages(items);
      })
      .catch(() => {
        if (!cancelled) {
          setImages([
            ...(initialPrimary ? [initialPrimary] : []),
            ...(initialSecondaries ?? []),
          ]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [productId, initialPrimary, initialSecondaries]);

  async function onPick(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const picked = Array.from(files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (!picked.length) {
      setError("Solo se admiten imágenes.");
      return;
    }

    if (!productId) {
      const payloads: PendingFile[] = [];
      for (const file of picked) {
        const p = await fileToMediaPayload(file);
        payloads.push({
          key: `pending_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          ...p,
          asPrimary: pending.length === 0 && payloads.length === 0,
        });
      }
      if (pending.length === 0 && payloads[0]) {
        payloads[0] = { ...payloads[0], asPrimary: true };
      }
      onPendingChange([...pending, ...payloads]);
      return;
    }

    setBusy(true);
    try {
      let makePrimary = images.length === 0;
      for (const file of picked) {
        const payload = await fileToMediaPayload(file);
        await uploadProductImage(productId, {
          ...payload,
          isPrimary: makePrimary,
        });
        makePrimary = false;
      }
      setImages(await listProductImages(productId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la imagen.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function makePrimary(mediaId: string) {
    if (!productId) {
      onPendingChange(
        pending.map((p) => ({ ...p, asPrimary: p.key === mediaId }))
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setImages(await setProductImagePrimary(productId, mediaId));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo marcar como principal."
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeImage(mediaId: string) {
    if (!productId) {
      const next = pending.filter((p) => p.key !== mediaId);
      if (next.length && !next.some((p) => p.asPrimary)) {
        next[0] = { ...next[0], asPrimary: true };
      }
      onPendingChange(next);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deleteProductImage(productId, mediaId);
      setImages(await listProductImages(productId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar.");
    } finally {
      setBusy(false);
    }
  }

  const pendingPrimary = pending.find((p) => p.asPrimary) ?? pending[0];
  const pendingSecondaries = pending.filter((p) => p.key !== pendingPrimary?.key);
  const primary = productId
    ? images.find((i) => i.isPrimary) ?? images[0]
    : undefined;
  const secondaries = productId
    ? images.filter((i) => i.id !== primary?.id)
    : [];

  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <Label>Imágenes</Label>
          <p className="text-xs text-muted-foreground">
            Una principal y el resto secundarias. Formatos JPG, PNG o WebP.
          </p>
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => void onPick(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            className="gap-1.5"
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus className="size-3.5" />
            {busy ? "Subiendo…" : "Agregar imágenes"}
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!productId && pending.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/80 px-3 py-6 text-center text-sm text-muted-foreground">
          Podés elegir imágenes ahora; se suben al guardar el producto.
        </p>
      ) : null}

      {productId && images.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/80 px-3 py-6 text-center text-sm text-muted-foreground">
          Todavía no hay imágenes en este producto.
        </p>
      ) : null}

      {/* Pending (nuevo producto) */}
      {!productId && pendingPrimary ? (
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
            Principal
          </p>
          <ImageTile
            src={pendingPrimary.dataUrl}
            label={pendingPrimary.filename}
            primary
            onPrimary={() => makePrimary(pendingPrimary.key)}
            onRemove={() => void removeImage(pendingPrimary.key)}
            busy={busy}
          />
          {pendingSecondaries.length ? (
            <>
              <p className="pt-2 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                Secundarias
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {pendingSecondaries.map((p) => (
                  <ImageTile
                    key={p.key}
                    src={p.dataUrl}
                    label={p.filename}
                    onPrimary={() => makePrimary(p.key)}
                    onRemove={() => void removeImage(p.key)}
                    busy={busy}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {/* Persistidas */}
      {productId && primary ? (
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
            Principal
          </p>
          <ImageTile
            src={productImageSrc(primary)}
            label={primary.title || primary.filename}
            primary
            onPrimary={() => void makePrimary(primary.id)}
            onRemove={() => void removeImage(primary.id)}
            busy={busy}
          />
          {secondaries.length ? (
            <>
              <p className="pt-2 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                Secundarias
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {secondaries.map((img) => (
                  <ImageTile
                    key={img.id}
                    src={productImageSrc(img)}
                    label={img.title || img.filename}
                    onPrimary={() => void makePrimary(img.id)}
                    onRemove={() => void removeImage(img.id)}
                    busy={busy}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ImageTile({
  src,
  label,
  primary,
  onPrimary,
  onRemove,
  busy,
}: {
  src: string | null;
  label: string;
  primary?: boolean;
  onPrimary: () => void;
  onRemove: () => void;
  busy: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl ring-1 ${
        primary ? "ring-teal/50" : "ring-border/70"
      } bg-muted/30`}
    >
      <div className="relative aspect-[4/3] bg-charcoal/5">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={label}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
            Sin vista previa
          </div>
        )}
        {primary ? (
          <span className="absolute left-2 top-2 rounded bg-teal px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            Principal
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-1 px-2 py-1.5">
        <p className="min-w-0 truncate text-xs text-muted-foreground">{label}</p>
        <div className="flex shrink-0 gap-0.5">
          {!primary ? (
            <button
              type="button"
              title="Marcar como principal"
              disabled={busy}
              className="rounded p-1 text-muted-foreground hover:bg-card hover:text-teal disabled:opacity-40"
              onClick={onPrimary}
            >
              <Star className="size-3.5" />
            </button>
          ) : null}
          <button
            type="button"
            title="Eliminar"
            disabled={busy}
            className="rounded p-1 text-muted-foreground hover:bg-card hover:text-destructive disabled:opacity-40"
            onClick={onRemove}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export type { PendingFile };
