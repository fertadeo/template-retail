"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCategory, listCategories, updateCategory } from "@/lib/store";
import type { Category } from "@/lib/types";
import { useRetailQuery } from "@/lib/use-retail-query";

export function CategoriesPanel() {
  const { data, loading, error: loadError, reload } = useRetailQuery(
    () => listCategories(false),
    []
  );
  const categories = data ?? [];
  const [nombre, setNombre] = useState("");
  const [editing, setEditing] = useState<Category | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startCreate() {
    setEditing(null);
    setNombre("");
    setError(null);
    setMessage(null);
  }

  function startEdit(cat: Category) {
    setEditing(cat);
    setNombre(cat.nombre);
    setError(null);
    setMessage(null);
  }

  async function save() {
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      if (editing) {
        await updateCategory(editing.id, { nombre });
        setMessage("Categoría actualizada.");
      } else {
        await createCategory({ nombre });
        setMessage("Categoría creada.");
      }
      setEditing(null);
      setNombre("");
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(cat: Category) {
    setError(null);
    setSaving(true);
    try {
      await updateCategory(cat.id, { activa: !cat.activa });
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-medium text-charcoal">
            Categorías
          </h2>
          <p className="text-sm text-muted-foreground">
            Agrupan los productos del comercio. Archivadas no aparecen al cargar
            un producto.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={startCreate}>
          Nueva categoría
        </Button>
      </div>

      <form
        className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="cat-nombre">
            {editing ? "Nombre" : "Nueva categoría"}
          </Label>
          <Input
            id="cat-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Aros, collares, pulseras…"
          />
        </div>
        <Button type="submit" disabled={saving || !nombre.trim()}>
          {saving ? "Guardando…" : editing ? "Guardar" : "Crear"}
        </Button>
      </form>

      {message ? (
        <p className="rounded-lg bg-tealSoft/60 px-3 py-2 text-sm text-charcoal">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <ul className="divide-y divide-border/60 overflow-hidden rounded-lg ring-1 ring-border/60">
        {loading ? (
          <li className="px-4 py-3 text-sm text-muted-foreground">
            Cargando categorías…
          </li>
        ) : loadError ? (
          <li className="px-4 py-3 text-sm text-destructive">{loadError}</li>
        ) : categories.length === 0 ? (
          <li className="px-4 py-3 text-sm text-muted-foreground">
            Todavía no hay categorías.
          </li>
        ) : null}
        {categories.map((cat) => (
          <li
            key={cat.id}
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium text-foreground">
                {cat.nombre}
                {!cat.activa ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    (archivada)
                  </span>
                ) : null}
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                {cat.codigo}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => startEdit(cat)}
              >
                Editar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={saving}
                onClick={() => void toggleActive(cat)}
              >
                {cat.activa ? "Archivar" : "Reactivar"}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
