"use client";

import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { api } from "@/lib/api-client";
import { isApiMode, apiUrl } from "@/lib/api-config";
import { USER_ROLE_LABELS, type UserRole } from "@/lib/types";

type SessionUser = { id: string; nombre: string; email: string; role: UserRole };

export function SidebarAccount() {
  const demo = !isApiMode();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const request = demo ? Promise.resolve({ user: {
      id: "demo", nombre: "Demo local", email: "Datos de demostración en memoria", role: "visitante" as UserRole,
    } }) : api.getSession();
    request.then(({ user }) => {
      if (!cancelled) setUser(user);
    }).catch(() => {
      if (!cancelled) setError("No se pudo cargar tu cuenta.");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [demo]);

  async function logout() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(apiUrl("/auth/logout"), { method: "POST" });
      if (!response.ok) throw new Error();
      // Discard private client router state when ending the session.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login");
    } catch {
      setError("No se pudo cerrar sesión. Intentá nuevamente.");
      setBusy(false);
    }
  }

  return (
    <section aria-label="Cuenta" className="shrink-0 border-t border-white/10 px-4 pb-4 pt-5">
      <h2 className="mb-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-sand/45">Cuenta</h2>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-teal [&::-webkit-details-marker]:hidden">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-inset ring-white/10">
            <UserRound className="size-5 text-sand/65" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-[#f2eee6]">{user?.nombre ?? (loading ? "Cargando cuenta…" : "Mi cuenta")}</span>
            <span className="mt-0.5 block text-xs text-sand/50">
              Mi cuenta{demo ? " · Modo demo" : user ? ` · ${USER_ROLE_LABELS[user.role]}` : ""}
            </span>
          </span>
        </summary>
        {user ? (
          <dl className="mt-3 space-y-1 rounded-lg bg-white/5 px-3 py-2 text-xs">
            <dt className="text-sand/50">{demo ? "Entorno" : "Email"}</dt>
            <dd className="break-words text-sand/85">{user.email}</dd>
          </dl>
        ) : null}
      </details>
      {!demo ? <button type="button" disabled={busy} onClick={logout} className="mt-5 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-[#f2eee6] transition-colors hover:border-white/40 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:cursor-wait disabled:opacity-50">
        {busy ? "Cerrando sesión…" : "Cerrar sesión"}
      </button> : null}
      {error ? <p role="alert" className="mt-3 text-xs text-red-300">{error}</p> : null}
    </section>
  );
}
