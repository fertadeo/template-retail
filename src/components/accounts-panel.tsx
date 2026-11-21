"use client";

import { useRef, useState } from "react";
import { useAccountSession } from "@/lib/account-session";
import { CatalogDialog } from "@/components/catalog/catalog-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
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

const VISIBLE_FUNCTIONS = APP_FUNCTIONS;

const ROLE_OPTIONS: UserRole[] = [
  "vendedor",
  "administrador",
  "visitante",
  "superadmin",
];

export function AccountsPanel() {
  const {
    data,
    loading,
    error: loadError,
    reload,
  } = useRetailQuery(
    () =>
      Promise.all([
        listUsers(false),
        listUserFunctions().catch(() => VISIBLE_FUNCTIONS),
      ]),
    [],
  );
  const users = data?.[0] ?? [];
  const functions = data?.[1] ?? VISIBLE_FUNCTIONS;

  const [editing, setEditing] = useState<UserAccount | null>(null);
  const [creating, setCreating] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("vendedor");
  const [fns, setFns] = useState<AppFunctionCode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const { session, demo } = useAccountSession();
  const superAccess = demo || session?.user.role === "superadmin";
  const canCreate =
    !session?.actor && (superAccess || session?.user.role === "administrador");
  const roleOptions = ROLE_OPTIONS.filter(
    (value) =>
      superAccess ||
      value === "vendedor" ||
      value === "visitante" ||
      (creating && value === "administrador"),
  );
  function canManage(user: UserAccount) {
    return (
      canCreate &&
      (superAccess || ["vendedor", "visitante"].includes(user.role))
    );
  }
  const writeLock = useRef(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const showVendorScope = role === "vendedor";

  function resetForm() {
    setConfirmDiscard(false);
    setCreating(false);
    setEditing(null);
    setNombre("");
    setEmail("");
    setPassword("");
    setRole("vendedor");
    setFns([]);
    setError(null);
  }

  function startCreate() {
    if (!canCreate || writeLock.current) return;
    resetForm();
    setCreating(true);
    setMessage(null);
  }

  function startEdit(u: UserAccount) {
    if (!canManage(u) || writeLock.current) return;
    setConfirmDiscard(false);
    setCreating(false);
    setEditing(u);
    setNombre(u.nombre);
    setEmail(u.email);
    setPassword("");
    setRole(u.role);
    setFns([...(u.functions as AppFunctionCode[])]);
    setError(null);
    setMessage(null);
  }

  function toggleFn(code: AppFunctionCode) {
    setFns((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code],
    );
  }

  function requestClose() {
    if (writeLock.current) return;
    if (
      nombre !== (editing?.nombre ?? "") ||
      email !== (editing?.email ?? "") ||
      Boolean(password) ||
      role !== (editing?.role ?? "vendedor") ||
      JSON.stringify(fns) !== JSON.stringify(editing?.functions ?? [])
    )
      setConfirmDiscard(true);
    else resetForm();
  }
  async function save() {
    if (writeLock.current || !canCreate) return;
    if (!roleOptions.includes(role)) {
      setError("No tenés permiso para asignar ese rol.");
      return;
    }
    writeLock.current = true;
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
        functions: showVendorScope ? fns : [],
      });
      setMessage(editing ? "Usuario actualizado." : "Usuario creado.");
      resetForm();
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      writeLock.current = false;
      setSaving(false);
    }
  }

  async function runAction(id: string, action: () => Promise<unknown>) {
    const user = users.find((row) => row.id === id);
    if (writeLock.current || !user || !canManage(user)) return;
    writeLock.current = true;
    setActionId(id);
    setError(null);
    try {
      await action();
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar.");
    } finally {
      writeLock.current = false;
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
            Creá usuarios y asigná roles y funciones para operar en el local.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canCreate || saving || Boolean(actionId)}
          onClick={startCreate}
        >
          Nuevo usuario
        </Button>
      </div>

      {session?.user.role === "administrador" && !session.actor ? (
        <p className="text-xs text-muted-foreground">
          Podés crear vendedores, visitantes y administradores. Las cuentas
          superadmin están reservadas al superadmin.
        </p>
      ) : null}

      {(creating || editing) && canCreate ? (
        <CatalogDialog
          title={
            confirmDiscard
              ? "¿Descartar los cambios?"
              : editing
                ? `Editar «${editing.nombre}»`
                : "Crear usuario"
          }
          onClose={requestClose}
          busy={saving}
          wide
          footer={
            confirmDiscard ? (
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setConfirmDiscard(false)}
                >
                  Seguir editando
                </Button>
                <Button onClick={resetForm}>Descartar y cerrar</Button>
              </div>
            ) : (
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={saving}
                  onClick={requestClose}
                >
                  Cancelar
                </Button>
                <Button type="submit" form="account-editor" disabled={saving}>
                  {saving
                    ? "Guardando…"
                    : editing
                      ? "Guardar cambios"
                      : "Crear usuario"}
                </Button>
              </div>
            )
          }
        >
          {confirmDiscard ? (
            <p className="text-sm">
              Los cambios de esta cuenta no se guardaron.
            </p>
          ) : (
            <form
              id="account-editor"
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              <fieldset disabled={saving} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="usr-nombre">Nombre</Label>
                    <Input
                      id="usr-nombre"
                      required
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ana Pérez"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="usr-email">Email</Label>
                    <Input
                      id="usr-email"
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ana@ejemplo.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="usr-pass">
                      Contraseña{editing ? " (opcional)" : ""}
                    </Label>
                    <Input
                      id="usr-pass"
                      required={creating}
                      minLength={6}
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={
                        editing ? "Dejar vacío para no cambiar" : "Mínimo 6"
                      }
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
                      {roleOptions.map((r) => (
                        <option key={r} value={r}>
                          {USER_ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {showVendorScope ? (
                  <div className="grid gap-4">
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
                              onChange={() =>
                                toggleFn(f.code as AppFunctionCode)
                              }
                            />
                            <span>{f.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
                    {role === "visitante"
                      ? "Cuenta de visitante del local."
                      : "Cuenta de administración del local."}
                  </p>
                )}

                {error ? (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                ) : null}
              </fieldset>
            </form>
          )}
        </CatalogDialog>
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
                        : "bg-secondary text-muted-foreground",
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
                  Funciones: {u.functions.length || 0}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!canManage(u) || Boolean(actionId)}
                onClick={() => startEdit(u)}
              >
                Editar
              </Button>
              {u.activa ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={!canManage(u) || Boolean(actionId)}
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
                  disabled={!canManage(u) || Boolean(actionId)}
                  onClick={() => void runAction(u.id, () => restoreUser(u.id))}
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
