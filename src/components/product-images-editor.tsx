"use client";

import { useRef, useState } from "react";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prepareProductImage } from "@/lib/product-image-upload";

export type PendingFile = {
  key: string;
  id?: string;
  filename: string;
  mime: string;
  sizeBytes: number;
  dataUrl: string;
  asPrimary: boolean;
};

export function ProductImagesEditor({
  images,
  onChange,
  disabled,
  onBusyChange,
}: {
  images: PendingFile[];
  onChange: (images: PendingFile[]) => void;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const picking = useRef(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(files: FileList | null) {
    if (!files?.length || picking.current || disabled) return;
    picking.current = true;
    onBusyChange(true);
    setError(null);
    const added: PendingFile[] = [];
    const errors: string[] = [];
    try {
      for (const file of Array.from(files)) {
        try {
          const payload = await prepareProductImage(file);
          added.push({
            ...payload,
            key: crypto.randomUUID(),
            asPrimary: images.length === 0 && added.length === 0,
          });
        } catch (err) {
          errors.push(
            err instanceof Error
              ? err.message
              : `No se pudo leer ${file.name}.`,
          );
        }
      }
      if (added.length) onChange([...images, ...added]);
      if (errors.length) setError(errors.join(" "));
    } finally {
      picking.current = false;
      onBusyChange(false);
      if (input.current) input.current.value = "";
    }
  }

  function remove(key: string) {
    const next = images.filter((image) => image.key !== key);
    if (next.length && !next.some((image) => image.asPrimary))
      next[0] = { ...next[0], asPrimary: true };
    onChange(next);
  }

  return (
    <section aria-labelledby="product-images-title" className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 id="product-images-title" className="font-semibold">
            Imágenes{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({images.length})
            </span>
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Elegí una portada y agregá las fotos que necesites.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => input.current?.click()}
        >
          <ImagePlus className="mr-1.5 size-4" /> Agregar
        </Button>
      </div>
      <input
        ref={input}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        aria-label="Agregar imágenes del producto"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => void pick(event.target.files)}
      />
      {images.length === 0 ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => input.current?.click()}
          className="flex min-h-48 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/20 p-6 text-center transition hover:border-teal disabled:opacity-50"
        >
          <ImagePlus className="size-9 text-teal" />
          <span className="text-sm font-medium">
            Agregar fotos del producto
          </span>
          <span className="text-xs text-muted-foreground">
            JPG, PNG o WebP · hasta 8 MB por foto
          </span>
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {images.map((image) => (
            <div
              key={image.key}
              className={`overflow-hidden rounded-xl border bg-card ${image.asPrimary ? "border-teal ring-1 ring-teal/30" : "border-border"}`}
            >
              <div className="relative aspect-square bg-muted/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.dataUrl}
                  alt={image.filename}
                  className="size-full object-contain"
                />
                {image.asPrimary ? (
                  <span className="absolute left-2 top-2 rounded-full bg-teal px-2 py-1 text-[10px] font-semibold text-white">
                    Portada
                  </span>
                ) : null}
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={`Quitar ${image.filename}`}
                  title="Quitar imagen"
                  onClick={() => remove(image.key)}
                  className="absolute right-2 top-2 rounded-full bg-card/95 p-2 text-destructive shadow-sm disabled:opacity-50"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="space-y-2 p-2">
                <p
                  title={image.filename}
                  className="truncate text-xs text-muted-foreground"
                >
                  {image.filename}
                </p>
                <button
                  type="button"
                  disabled={disabled || image.asPrimary}
                  onClick={() =>
                    onChange(
                      images.map((item) => ({
                        ...item,
                        asPrimary: item.key === image.key,
                      })),
                    )
                  }
                  className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border py-1.5 text-xs font-medium text-teal disabled:border-transparent"
                >
                  <Star
                    className="size-3.5"
                    fill={image.asPrimary ? "currentColor" : "none"}
                  />
                  {image.asPrimary ? "Portada elegida" : "Usar de portada"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Las fotos se optimizan para una carga rápida. Los cambios se aplican al
        guardar el producto.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}
