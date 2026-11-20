"use client";

import { useId, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";

export function CatalogQuantity({
  name,
  quantity,
  maximum,
  disabled,
  onChange,
}: {
  name: string;
  quantity: number;
  maximum: number;
  disabled: boolean;
  onChange: (quantity: number) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  function commit() {
    const parsed = Number(draft);
    const next =
      draft?.trim() && Number.isFinite(parsed)
        ? Math.min(Math.max(1, Math.floor(parsed)), Math.max(1, maximum))
        : quantity;
    setDraft(null);
    if (next !== quantity) onChange(next);
  }
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-[10px] text-[#7d8872]">
        Cantidad
      </label>
      <div className="catalog-quantity flex items-center rounded-full border border-[#dce2d5] bg-white">
        <button
          type="button"
          aria-label={`Quitar una unidad de ${name}`}
          disabled={disabled || quantity <= 1}
          onClick={() => onChange(quantity - 1)}
          className="catalog-step"
        >
          <Minus className="size-3.5" />
        </button>
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={1}
          max={Math.max(1, maximum)}
          step={1}
          value={draft ?? String(quantity)}
          disabled={disabled}
          onFocus={() => setDraft(String(quantity))}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          aria-label={`Cantidad de ${name}`}
          className="h-10 w-12 rounded-none border-0 bg-transparent px-0 text-center text-sm tabular-nums shadow-none"
        />
        <button
          type="button"
          aria-label={`Agregar una unidad de ${name}`}
          disabled={disabled || quantity >= maximum}
          onClick={() => onChange(quantity + 1)}
          className="catalog-step"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
