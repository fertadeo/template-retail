"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type RowActionItem = {
  id: string;
  label: string;
  disabled?: boolean;
  busy?: boolean;
  tone?: "default" | "teal" | "amber";
  onSelect: () => void;
};

/**
 * Menú ⋮ compacto para acciones secundarias de fila (ahorra espacio en tablas).
 */
export function RowActionsMenu({
  items,
  label = "Más acciones",
}: {
  items: RowActionItem[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 text-muted-foreground hover:text-foreground"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal className="size-4" />
      </Button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className="absolute right-0 z-30 mt-1 min-w-[11rem] overflow-hidden rounded-lg bg-card py-1 shadow-lg ring-1 ring-border/80"
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled || item.busy}
              className={cn(
                "flex w-full items-center px-3 py-2 text-left text-sm transition-colors disabled:opacity-40",
                item.tone === "teal" && "text-teal hover:bg-tealSoft/50",
                item.tone === "amber" && "text-amber-700 hover:bg-amber-50",
                (!item.tone || item.tone === "default") &&
                  "text-foreground hover:bg-muted"
              )}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.busy ? "…" : item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
