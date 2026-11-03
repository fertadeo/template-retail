"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { ConfirmModal } from "@/components/confirm-modal";
import { ModalPortal } from "@/components/modal-portal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import { isApiMode } from "@/lib/api-config";
import type { Comercio } from "@/lib/types";

export function ComercioFormModal({
  initial,
  onClose,
  onSaved,
}: {
  /** Si viene → edición; si no → alta. */
  initial?: Comercio | null;
  onClose: () => void;
  onSaved: (comercio: Comercio) => void;
}) {
  const isEdit = Boolean(initial?.id);
  const [codigo, setCodigo] = useState(initial?.codigo ?? "");
  const [nombre, setNombre] = useState(initial?.nombre ?? "");
  const [rubro, setRubro] = useState(initial?.rubro ?? "");
  const [direccion, setDireccion] = useState(initial?.direccion ?? "");
  const [activa, setActiva] = useState(initial?.activa ?? true);
  const [esDefault, setEsDefault] = useState(initial?.esDefault ?? false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  const dirty = useMemo(() => {
    const base = {
      codigo: (initial?.codigo ?? "").trim(),
      nombre: (initial?.nombre ?? "").trim(),
      rubro: (initial?.rubro ?? "").trim(),
      direccion: (initial?.direccion ?? "").trim(),
      activa: initial?.activa ?? true,
      esDefault: initial?.esDefault ?? false,
    };
    return (
      codigo.trim() !== base.codigo ||
      nombre.trim() !== base.nombre ||
      rubro.trim() !== base.rubro ||
      direccion.trim() !== base.direccion ||
      activa !== base.activa ||
      esDefault !== base.esDefault
    );
  }, [initial, codigo, nombre, rubro, direccion, activa, esDefault]);

  function requestClose() {
    if (saving) return;
    if (dirty) {
      setConfirmClose(true);
      return;
    }
    onClose();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape" || saving || confirmClose) return;
      e.preventDefault();
      requestClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- requestClose usa dirty/saving actuales
  }, [saving, confirmClose, dirty]);

  async function save() {
    if (!isApiMode()) {
      setError("Requiere API remota.");
      return;
    }
    const code = codigo.trim();
    const name = nombre.trim();
    if (!code || !name) {
      setError("Código y nombre son obligatorios.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = {
        codigo: code,
        nombre: name,
        rubro: rubro.trim(),
        direccion: direccion.trim(),
        activa,
        esDefault,
      };
      const saved = isEdit
        ? await api.updateComercio(initial!.id, body)
        : await api.createComercio(body);
      onSaved(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <ModalPortal>
        <div
          className="fixed inset-0 z-[200] flex h-dvh w-screen items-center justify-center bg-charcoal/50 p-3 backdrop-blur-[2px] sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="comercio-form-title"
          onClick={requestClose}
        >
          <div
            className="flex max-h-[min(92dvh,36rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-border/80"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Multicomercio
                </p>
                <h2
                  id="comercio-form-title"
                  className="font-display text-xl font-semibold tracking-tight text-charcoal"
                >
                  {isEdit ? "Editar comercio" : "Nuevo comercio"}
                </h2>
                {isEdit ? (
                  <p className="mt-0.5 font-mono text-xs text-teal">
                    {initial?.codigo}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40"
                onClick={requestClose}
                disabled={saving}
                aria-label="Cerrar"
              >
                <X className="size-5" />
              </button>
            </header>

            <form
              className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5"
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="co-codigo">Código</Label>
                  <Input
                    id="co-codigo"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    placeholder="ej. musicanoba"
                    autoFocus={!isEdit}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="co-nombre">Nombre</Label>
                  <Input
                    id="co-nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    autoFocus={isEdit}
                    required
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="co-rubro">Rubro</Label>
                  <Input
                    id="co-rubro"
                    value={rubro}
                    onChange={(e) => setRubro(e.target.value)}
                    placeholder="Instrumentos / Accesorios / …"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="co-direccion">Dirección</Label>
                  <Input
                    id="co-direccion"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm sm:col-span-1">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={activa}
                    onChange={(e) => setActiva(e.target.checked)}
                  />
                  Activo
                </label>
                <label className="flex items-center gap-2 text-sm sm:col-span-1">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={esDefault}
                    onChange={(e) => setEsDefault(e.target.checked)}
                  />
                  Comercio default
                </label>
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="submit" disabled={saving}>
                  {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={requestClose}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>

      {confirmClose ? (
        <ConfirmModal
          title="¿Está seguro que quiere salir?"
          description="Los cambios no serán guardados."
          confirmLabel="Salir sin guardar"
          cancelLabel="Seguir editando"
          onConfirm={onClose}
          onCancel={() => setConfirmClose(false)}
        />
      ) : null}
    </>
  );
}
