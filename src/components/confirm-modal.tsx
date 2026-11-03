"use client";

import { useEffect } from "react";
import { ModalPortal } from "@/components/modal-portal";
import { Button } from "@/components/ui/button";

/**
 * Segundo nivel de modal (z-[210]): confirmación compacta sobre un modal de trabajo.
 */
export function ConfirmModal({
  title,
  description,
  confirmLabel = "Salir sin guardar",
  cancelLabel = "Seguir editando",
  confirmVariant = "default",
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "default" | "destructive" | "outline" | "ghost" | "secondary";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) {
        e.stopPropagation();
        onCancel();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [busy, onCancel]);

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[210] flex h-dvh w-screen items-center justify-center bg-charcoal/55 p-3 backdrop-blur-[2px] sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={() => {
          if (!busy) onCancel();
        }}
      >
        <div
          className="w-full max-w-md overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-border/80"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-2 px-5 py-5">
            <h2
              id="confirm-modal-title"
              className="font-display text-lg font-semibold tracking-tight text-charcoal"
            >
              {title}
            </h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <footer className="flex flex-wrap gap-2 border-t border-border/60 px-5 py-3">
            <Button
              type="button"
              variant={confirmVariant}
              disabled={busy}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onCancel}
            >
              {cancelLabel}
            </Button>
          </footer>
        </div>
      </div>
    </ModalPortal>
  );
}
