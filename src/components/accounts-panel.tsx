"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRANCHES_ENABLED } from "@/lib/features";
import {
  listBranches,
  listUserFunctions,
  listUsers,
  restoreUser,
  softDeleteUser,
  upsertUser,
} from "@/lib/store";
import {
  APP_FUNCTIONS,
  USER_ROLE_LABELS,
  type AppFunctionCode,
  type UserAccount,
  type UserRole,
} from "@/lib/types";
import { useRetailQuery } from "@/lib/use-retail-query";
import { cn } from "@/lib/utils";

const VISIBLE_FUNCTIONS = BRANCHES_ENABLED
  ? APP_FUNCTIONS
  : APP_FUNCTIONS.filter((f) => f.code !== "sucursales");

const ROLE_OPTIONS: UserRole[] = [
  "vendedor",
  "administrador",
  "visitante",
  "superadmin",
];

export function AccountsPanel() {
  const { data, loading, error: loadError, reload } = useRetailQuery(
    () =>
      Promise.all([
        listUsers(false),
        BRANCHES_ENABLED ? listBranches(true) : Promise.resolve([]),
        listUserFunctions()
          .then((fns) =>
            BRANCHES_ENABLED ? fns : fns.filter((f) => f.code !== "sucursales")
          )
          .catch(() => VISIBLE_FUNCTIONS),
      ]),
    []
  );
  const users = data?.[0] ?? [];
  const branches = data?.[1] ?? [];
  const functions = data?.[2] ?? VISIBLE_FUNCTIONS;

  const [editing, setEditing] = useState<UserAccount | null>(null);
  const [creating, setCreating] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("vendedor");
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [fns, setFns] = useState<AppFunctionCode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const showVendorScope = role === "vendedor";

  const branchName = useMemo(() => {
    const map = new Map(branches.map((b) => [b.id, b.nombre]));
    return (id: string) => map.get(id) ?? id;
  }, [branches]);

  function resetForm() {
    setCreating(false);
    setEditing(null);
    setNombre("");
    setEmail("");
    setPassword("");
    setRole("vendedor");
    setBranchIds([]);
    setFns([]);
    setError(null);
  }

  function startCreate() {
    resetForm();
    setCreating(true);
    setMessage(null);
  }

  function startEdit(u: UserAccount) {
    setCreating(false);
    setEditing(u);
    setNombre(u.nombre);
    setEmail(u.email);
    setPassword("");
    setRole(u.role);
    setBranchIds([...u.branchIds]);
    setFns([...(u.functions as AppFunctionCode[])]);
    setError(null);
    setMessage(null);
  }

  function toggleBranch(id: string) {
    setBranchIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleFn(code: AppFunctionCode) {
    setFns((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]
    );
  }

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await upsertUser({
        id: editing?.id,
        email,
        nombre,
        password: password.trim() || undefined,
        role,
        activa: editing?.activa ?? true,
        branchIds:
          showVendorScope && BRANCHES_ENABLED ? branchIds : [],
        functions: showVendorScope ? fns : [],
      });
      setMessage(editing ? "Usuario actualizado." : "Usuario creado.");
      resetForm();
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function runAction(id: string, action: () => Promise<unknown>) {
    setActionId(id);
    setError(null);
    try {
      await action();
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-medium text-charcoal">
            Centro de cuentas
          </h2>
          <p className="text-sm text-muted-foreground">
            Creá usuarios y asigná roles. El vendedor opera con funciones
            concretas
            {BRANCHES_ENABLED ? " y sucursales asignadas" : " en el comercio activo"}
            ; el administrador ve todo el negocio. El superadmin es el
            desarrollador de la plataforma.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={startCreate}>
          Nuevo usuario
        </Button>
      </div>

      {creating || editing ? (
        <div className="space-y-4 rounded-xl bg-card/90 p-4 ring-1 ring-border/70">
          <h3 className="text-sm font-medium">
            {editing ? `Editar «${editing.nombre}»` : "Crear usuario"}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="usr-nombre">Nombre</Label>
              <Input
                id="usr-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ana Pérez"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="usr-email">Email</Label>
              <Input
                id="usr-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ana@musicanoba.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="usr-pass">
                Contraseña{editing ? " (opcional)" : ""}
              </Label>
              <Input
                id="usr-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={editing ? "Dejar vacío para no cambiar" : "Mínimo 6"}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="usr-role">Rol</Label>
              <select
                id="usr-role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {USER_ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {showVendorScope ? (
            <div
              className={
                BRANCHES_ENABLED
                  ? "grid gap-4 lg:grid-cols-2"
                  : "grid gap-4"
              }
            >
              {BRANCHES_ENABLED ? (
                <div className="space-y-2">
                  <Label>Sucursales asignadas</Label>
                  <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg p-2 ring-1 ring-border/60">
                    {branches.length === 0 ? (
                      <p className="px-1 py-2 text-xs text-muted-foreground">
                        No hay sucursales activas.
                      </p>
                    ) : (
                      branches.map((b) => (
                        <label
                          key={b.id}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary/60"
                        >
                          <input
                            type="checkbox"
                            checked={branchIds.includes(b.id)}
                            onChange={() => toggleBranch(b.id)}
                          />
                          <span>
                            {b.nombre}
                            {b.rubro ? (
                              <span className="text-muted-foreground">
                                {" "}
                                · {b.rubro}
                              </span>
                            ) : null}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label>Funciones</Label>
                <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg p-2 ring-1 ring-border/60">
                  {functions.map((f) => (
                    <label
                      key={f.code}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary/60"
                    >
                      <input
                        type="checkbox"
                        checked={fns.includes(f.code as AppFunctionCode)}
                        onChange={() => toggleFn(f.code as AppFunctionCode)}
                      />
                      <span>{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
              {role === "administrador"
                ? BRANCHES_ENABLED
                  ? "El administrador es dueño del negocio: ve todas las sucursales y módulos."
                  : "El administrador es dueño del negocio: ve todos los comercios y módulos."
                : role === "superadmin"
                  ? "El superadmin es el desarrollador: acceso total a la plataforma."
                  : BRANCHES_ENABLED
                    ? "El visitante tiene acceso limitado de solo lectura; no requiere sucursales ni funciones."
                    : "El visitante tiene acceso limitado de solo lectura; no requiere funciones especiales."}
            </p>
          )}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="button" disabled={saving} onClick={() => void save()}>
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear usuario"}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}

      {message ? <p className="text-sm text-teal">{message}</p> : null}
      {!creating && !editing && error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      <ul className="divide-y divide-border/60 overflow-hidden rounded-lg ring-1 ring-border/60">
        {loading ? (
          <li className="px-4 py-3 text-sm text-muted-foreground">
            Cargando usuarios…
          </li>
        ) : loadError ? (
          <li className="px-4 py-3 text-sm text-destructive">{loadError}</li>
        ) : null}
        {users.map((u) => (
          <li
            key={u.id}
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium text-foreground">
                {u.nombre}
                <span
                  className={cn(
                    "ml-2 rounded px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide",
                    u.role === "superadmin"
                      ? "bg-charcoal/10 text-charcoal"
                      : u.role === "administrador"
                        ? "bg-teal-soft text-teal"
                        : "bg-secondary text-muted-foreground"
                  )}
                >
                  {USER_ROLE_LABELS[u.role]}
                </span>
                {!u.activa ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    (inactivo)
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-muted-foreground">{u.email}</p>
              {u.role === "vendedor" ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {BRANCHES_ENABLED ? (
                    <>
                      Sucursales:{" "}
                      {u.branchIds.length
                        ? u.branchIds.map(branchName).join(", ")
                        : "—"}
                      {" · "}
                    </>
                  ) : null}
                  Funciones: {u.functions.length || 0}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => startEdit(u)}
              >
                Editar
              </Button>
              {u.activa ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={actionId === u.id}
                  onClick={() =>
                    void runAction(u.id, () => softDeleteUser(u.id))
                  }
                >
                  Desactivar
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={actionId === u.id}
                  onClick={() =>
                    void runAction(u.id, () => restoreUser(u.id))
                  }
                >
                  Reactivar
                </Button>
              )}
            </div>
          </li>
        ))}
        {!loading && !loadError && users.length === 0 ? (
          <li className="px-4 py-6 text-sm text-muted-foreground">
            Todavía no hay usuarios. Creá el primero.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
