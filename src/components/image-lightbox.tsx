"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { ModalPortal } from "@/components/modal-portal";
import { cn } from "@/lib/utils";

export type LightboxImage = {
  id: string;
  src: string;
  title?: string;
};

/**
 * Preview full-screen de una o más imágenes (2º nivel sobre ficha de producto).
 * Escape / backdrop cierran solo este overlay; flechas navegan.
 */
export function ImageLightbox({
  images,
  index,
  onClose,
  onIndexChange,
  subtitle,
}: {
  images: LightboxImage[];
  index: number;
  onClose: () => void;
  onIndexChange: (next: number) => void;
  subtitle?: string;
}) {
  const safeIndex = Math.min(Math.max(0, index), Math.max(0, images.length - 1));
  const current = images[safeIndex];
  const total = images.length;
  const canPrev = safeIndex > 0;
  const canNext = safeIndex < total - 1;
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setZoom(1);
  }, [current?.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "ArrowLeft" && canPrev) onIndexChange(safeIndex - 1);
      if (e.key === "ArrowRight" && canNext) onIndexChange(safeIndex + 1);
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))));
      }
      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setZoom((z) => Math.max(1, Number((z - 0.25).toFixed(2))));
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose, onIndexChange, safeIndex, canPrev, canNext]);

  if (!current) return null;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[210] flex h-dvh w-screen flex-col bg-[#0c0a09]/94 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-label={`Vista previa: ${current.title || "imagen"}`}
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-semibold tracking-tight text-[#f4f0e8] sm:text-lg">
              {current.title || "Imagen"}
            </p>
            <p className="truncate text-xs text-white/45">
              {subtitle ? `${subtitle} · ` : ""}
              {safeIndex + 1} / {total}
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#f4f0e8] ring-1 ring-white/15 transition hover:bg-white/18"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="relative min-h-0 flex-1">
          {total > 1 ? (
            <>
              <button
                type="button"
                aria-label="Anterior"
                disabled={!canPrev}
                onClick={() => onIndexChange(safeIndex - 1)}
                className="absolute left-2 top-1/2 z-20 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-teal text-white shadow-lg ring-4 ring-teal/25 transition hover:scale-105 disabled:pointer-events-none disabled:opacity-30 sm:left-4 sm:size-14"
              >
                <ChevronLeft className="size-7" strokeWidth={2.5} />
              </button>
              <button
                type="button"
                aria-label="Siguiente"
                disabled={!canNext}
                onClick={() => onIndexChange(safeIndex + 1)}
                className="absolute right-2 top-1/2 z-20 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-teal text-white shadow-lg ring-4 ring-teal/25 transition hover:scale-105 disabled:pointer-events-none disabled:opacity-30 sm:right-4 sm:size-14"
              >
                <ChevronRight className="size-7" strokeWidth={2.5} />
              </button>
            </>
          ) : null}

          <div
            className="flex h-full cursor-zoom-out items-center justify-center overflow-auto p-4 sm:p-8"
            onClick={onClose}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.src}
              alt={current.title || "Producto"}
              className={cn(
                "max-h-full max-w-full object-contain transition-transform duration-200"
              )}
              style={{ transform: `scale(${zoom})` }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>

        {total > 1 ? (
          <footer className="flex shrink-0 gap-2 overflow-x-auto border-t border-white/10 px-4 py-3 sm:justify-center sm:px-6">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => onIndexChange(i)}
                className={cn(
                  "size-14 shrink-0 overflow-hidden rounded-lg ring-2 transition sm:size-16",
                  i === safeIndex
                    ? "ring-teal"
                    : "ring-transparent opacity-70 hover:opacity-100"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt={img.title || ""}
                  className="size-full object-cover"
                />
              </button>
            ))}
          </footer>
        ) : null}
      </div>
    </ModalPortal>
  );
}
