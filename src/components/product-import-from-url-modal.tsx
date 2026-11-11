"use client";

import { useEffect, useState } from "react";
import { ModalPortal } from "@/components/modal-portal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ImportedProductDraft } from "@/lib/product-import";
import { importProductFromUrl } from "@/lib/store";
import { CATEGORY_LABELS, type ProductCategory } from "@/lib/types";
import { formatMxn } from "@/lib/utils";

export function ProductImportFromUrlModal({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (draft: ImportedProductDraft) => void;
}) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ImportedProductDraft | null>(null);

  useEffect(() => {
    if (!open) {
      setUrl("");
      setBusy(false);
      setError(null);
      setDraft(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  async function fetchDraft() {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Pegá la URL del producto.");
      return;
    }
    setBusy(true);
    setError(null);
    setDraft(null);
    try {
      const result = await importProductFromUrl(trimmed);
      setDraft(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo importar.");
    } finally {
      setBusy(false);
    }
  }

  function categoryLabel(cat: ProductCategory | string): string {
    if (cat in CATEGORY_LABELS) {
      return CATEGORY_LABELS[cat as ProductCategory];
    }
    return cat || "Sin categoría";
  }

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[200] flex h-dvh w-screen items-center justify-center bg-charcoal/55 p-3 backdrop-blur-[2px] sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-import-title"
        onClick={() => {
          if (!busy) onClose();
        }}
      >
        <div
          className="flex max-h-[min(92vh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-border/80"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="border-b border-border/60 px-5 py-4">
            <h2
              id="product-import-title"
              className="font-display text-lg font-semibold tracking-tight text-charcoal"
            >
              Importar desde URL
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pegá el link de la ficha (Tienda Nube u otra tienda). Traemos
              nombre, precio, SKU y fotos para el alta.
            </p>
          </header>

          <form
            className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft) {
                onApply(draft);
                onClose();
              } else {
                void fetchDraft();
              }
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="import-url">URL del producto</Label>
              <Input
                id="import-url"
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setDraft(null);
                }}
                placeholder="https://…/productos/…"
                required
                autoFocus
              />
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            ) : null}

            {draft ? (
              <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3">
                <div>
                  <p className="text-sm font-medium text-charcoal">
                    {draft.nombre}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {draft.sku ? `SKU ${draft.sku} · ` : ""}
                    {categoryLabel(draft.categoria)} ·{" "}
                    {formatMxn(draft.precio)}
                  </p>
                </div>
                {draft.descripcion ? (
                  <p className="line-clamp-4 text-xs text-muted-foreground">
                    {draft.descripcion}
                  </p>
                ) : null}
                {draft.images.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {draft.images.map((img) =>
                      img.dataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={img.sourceUrl}
                          src={img.dataUrl}
                          alt={img.filename}
                          className="size-16 rounded-lg object-cover ring-1 ring-border/60"
                        />
                      ) : null
                    )}
                  </div>
                ) : null}
                {draft.warnings?.length ? (
                  <ul className="list-inside list-disc text-xs text-amber-800 dark:text-amber-200">
                    {draft.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </form>

          <footer className="flex flex-wrap gap-2 border-t border-border/60 px-5 py-3">
            <Button
              type="submit"
              formAction={undefined}
              disabled={busy || !url.trim()}
              onClick={() => {
                if (draft) {
                  onApply(draft);
                  onClose();
                } else {
                  void fetchDraft();
                }
              }}
            >
              {busy
                ? "Obteniendo…"
                : draft
                  ? "Usar datos y continuar"
                  : "Obtener datos"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onClose}
            >
              Cancelar
            </Button>
          </footer>
        </div>
      </div>
    </ModalPortal>
  );
}
