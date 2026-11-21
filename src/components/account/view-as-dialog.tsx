"use client";
import { useEffect, useRef, useState } from "react";
import { Eye } from "lucide-react";
import { CatalogDialog } from "@/components/catalog/catalog-dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import { USER_ROLE_LABELS, type UserRole, type UserAccount } from "@/lib/types";
export function ViewAsDialog({
  ownId,
  role,
  onClose,
}: {
  ownId: string;
  role: UserRole;
  onClose: () => void;
}) {
  const [users, setUsers] = useState<UserAccount[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const lock = useRef(false);
  useEffect(() => {
    let cancelled = false;
    api
      .listUsers(true)
      .then((rows) => {
        if (!cancelled)
          setUsers(
            rows
              .filter(
                (user) =>
                  user.activa &&
                  user.id !== ownId &&
                  (role === "superadmin" || user.role === "vendedor"),
              )
              .sort(
                (a, b) =>
                  Number(b.role === "vendedor") -
                    Number(a.role === "vendedor") ||
                  a.nombre.localeCompare(b.nombre, "es"),
              ),
          );
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            err instanceof Error
              ? err.message
              : "No pudimos cargar las cuentas.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [ownId, role, attempt]);
  async function start(id: string) {
    if (lock.current) return;
    lock.current = true;
    setBusy(id);
    setError("");
    try {
      await api.startViewAs(id);
      // A full navigation drops the original user's cached screens and queries.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No pudimos abrir esa cuenta.",
      );
      lock.current = false;
      setBusy(null);
    }
  }
  const filtered = users?.filter((user) =>
    `${user.nombre} ${user.email}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <CatalogDialog
      title="Ver como…"
      subtitle="Vista de solo lectura. No necesitás la contraseña del usuario."
      onClose={() => {
        if (!lock.current) onClose();
      }}
      busy={Boolean(busy)}
    >
      <div className="space-y-4">
        <label className="catalog-field">
          Buscar una cuenta
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre o email"
            disabled={Boolean(busy)}
          />
        </label>
        {error ? (
          <div role="alert" className="catalog-error">
            {error}
            {!users ? (
              <button
                className="ml-2 underline"
                onClick={() => {
                  setError("");
                  setAttempt((value) => value + 1);
                }}
              >
                Reintentar
              </button>
            ) : null}
          </div>
        ) : null}
        {!users && !error ? (
          <p role="status" className="text-sm">
            Cargando cuentas…
          </p>
        ) : null}
        {users && !filtered?.length ? (
          <p className="text-sm text-muted-foreground">
            No hay cuentas que coincidan.
          </p>
        ) : null}
        <ul className="divide-y divide-border">
          {filtered?.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void start(user.id)}
                className="flex min-h-16 w-full items-center justify-between gap-3 py-3 text-left disabled:opacity-50"
              >
                <span className="min-w-0">
                  <strong className="block truncate text-sm">
                    {user.nombre}
                  </strong>
                  <span className="block truncate text-xs text-muted-foreground">
                    {user.email} · {USER_ROLE_LABELS[user.role]}
                  </span>
                </span>
                <span className="shrink-0 text-teal">
                  {busy === user.id ? "Abriendo…" : <Eye className="size-4" />}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </CatalogDialog>
  );
}
