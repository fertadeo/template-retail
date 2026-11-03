"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getDefaultPriceListId,
  listPriceLists,
  setDefaultPriceList,
  upsertPriceList,
} from "@/lib/store";
import type { PriceList } from "@/lib/types";
import { useRetailQuery } from "@/lib/use-retail-query";

export function PriceListsPanel() {
  const {
    data,
    loading,
    error: loadError,
    reload,
  } = useRetailQuery(
    () => Promise.all([listPriceLists(), getDefaultPriceListId()]),
    []
  );
  const lists = data?.[0] ?? [];
  const defaultId = data?.[1] ?? "";

  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [editing, setEditing] = useState<PriceList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startCreate() {
    setEditing(null);
    setNombre("");
    setCodigo("");
    setError(null);
    setMessage(null);
  }

  function startEdit(pl: PriceList) {
    setEditing(pl);
    setNombre(pl.nombre);
    setCodigo(pl.codigo);
    setError(null);
    setMessage(null);
  }

  async function save() {
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      await upsertPriceList({
        id: editing?.id,
        nombre,
        codigo: codigo || undefined,
        activa: editing?.activa ?? true,
        esDefault: editing?.esDefault ?? false,
      });
      setMessage(editing ? "Lista actualizada." : "Lista creada.");
      setEditing(null);
      setNombre("");
      setCodigo("");
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(pl: PriceList) {
    setError(null);
    setSaving(true);
    try {
      await upsertPriceList({
        id: pl.id,
        nombre: pl.nombre,
        codigo: pl.codigo,
        activa: !pl.activa,
        esDefault: pl.esDefault,
      });
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar.");
    } finally {
      setSaving(false);
    }
  }

  async function makeDefault(pl: PriceList) {
    setError(null);
    setSaving(true);
    try {
      await setDefaultPriceList(pl.id);
      setMessage(`Default: ${pl.nombre}`);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo definir default.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-medium text-charcoal">
            Listas de precios
          </h2>
          <p className="text-sm text-muted-foreground">
            Default actual:{" "}
            <span className="font-medium text-foreground">
              {lists.find((l) => l.id === defaultId)?.nombre ?? "—"}
            </span>
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={startCreate}>
          Nueva lista
        </Button>
      </div>

      <ul className="divide-y divide-border/60 overflow-hidden rounded-lg ring-1 ring-border/60">
        {loading ? (
          <li className="px-4 py-3 text-sm text-muted-foreground">
            Cargando listas…
          </li>
        ) : loadError ? (
          <li className="px-4 py-3 text-sm text-destructive">{loadError}</li>
        ) : null}
        {lists.map((pl) => (
          <li
            key={pl.id}
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium text-foreground">
                {pl.nombre}
                {pl.esDefault ? (
                  <span className="ml-2 rounded bg-teal-soft px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-teal">
                    default
                  </span>
                ) : null}
                {!pl.activa ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    (inactiva)
                  </span>
                ) : null}
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                {pl.codigo}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => startEdit(pl)}
              >
                Editar
              </Button>
              {!pl.esDefault ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={!pl.activa}
                  onClick={() => void makeDefault(pl)}
                >
                  Hacer default
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={saving}
                onClick={() => void toggleActive(pl)}
              >
                {pl.activa ? "Desactivar" : "Activar"}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <form
        className="space-y-3 border-t border-border/60 pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <h3 className="text-sm font-medium">
          {editing ? `Editar «${editing.nombre}»` : "Crear lista"}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pl-nombre">Nombre</Label>
            <Input
              id="pl-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Distribuidor"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pl-codigo">Código</Label>
            <Input
              id="pl-codigo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Se genera del nombre si lo dejás vacío"
              className="font-mono text-sm"
            />
          </div>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {message ? <p className="text-sm text-teal">{message}</p> : null}
        <div className="flex gap-2">
          <Button type="submit" disabled={loading || saving}>
            {saving
              ? "Guardando…"
              : editing
                ? "Guardar cambios"
                : "Crear lista"}
          </Button>
          {editing ? (
            <Button type="button" variant="outline" onClick={startCreate}>
              Cancelar
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
